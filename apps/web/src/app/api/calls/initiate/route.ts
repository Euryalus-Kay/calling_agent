import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { checkAndResetCredits, getTierLimits, calculateCreditsNeeded } from '@/lib/credits';
import type { CallPlan, AccountTier } from '@/types';

const WORKER_BASE_URL = process.env.WORKER_BASE_URL || 'http://localhost:8080';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  try {
    // Use session client for auth check
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Reset credits if billing period expired
    await checkAndResetCredits(supabase, user.id);

    const body = await request.json().catch(() => null);
    if (!body?.taskId) {
      return NextResponse.json({ error: 'Missing task ID' }, { status: 400 });
    }

    const { taskId } = body;

    // Use admin client for all DB ops (bypasses RLS - calls table has no INSERT policy)
    const admin = getAdminClient();

    // Fetch the task (verify ownership via user_id filter)
    const { data: task, error: taskError } = await admin
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .eq('user_id', user.id)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const taskRow = task as Record<string, any>;

    if (taskRow.status !== 'ready') {
      return NextResponse.json({ error: 'Task is not ready to start calls yet.' }, { status: 400 });
    }

    const plan = taskRow.plan as CallPlan;
    if (!plan?.calls?.length) {
      return NextResponse.json({ error: 'No calls in the plan.' }, { status: 400 });
    }

    // Fetch user profile for call context and tier info
    const { data: profile } = await admin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profileRow = profile as Record<string, any> | null;
    const tier = (profileRow?.account_tier as AccountTier) || 'free';
    const limits = getTierLimits(tier);

    // Debug: log the verified caller ID — log the raw value and type
    const verifiedCallerId = profileRow?.verified_caller_id;
    console.log(`[Initiate] User ${user.id} verified_caller_id: raw=${JSON.stringify(verifiedCallerId)}, type=${typeof verifiedCallerId}, tier: ${tier}`);

    // Check concurrent call limit (tier-based)
    const { count } = await admin
      .from('calls')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('status', ['initiating', 'ringing', 'in_progress', 'on_hold', 'navigating_menu', 'transferred']);

    if ((count || 0) >= limits.concurrent_calls) {
      return NextResponse.json(
        { error: `You have too many active calls (limit: ${limits.concurrent_calls}). Please wait for some to finish.` },
        { status: 429 }
      );
    }

    // Deduct credits atomically
    const creditsNeeded = calculateCreditsNeeded(plan.calls);
    if (creditsNeeded > 0) {
      const { data: deductResult } = await admin.rpc('deduct_credits', {
        p_user_id: user.id,
        p_amount: creditsNeeded,
        p_type: 'call_usage',
        p_description: `${plan.calls.length} call${plan.calls.length !== 1 ? 's' : ''} for task`,
        p_reference_id: taskId,
      });

      if (deductResult === false) {
        const creditsRemaining = profileRow?.credits_remaining ?? 0;
        return NextResponse.json(
          {
            error: `Not enough credits. You need ${creditsNeeded} but have ${creditsRemaining}. ${tier === 'free' ? 'Upgrade for more credits.' : 'Purchase additional credits.'}`,
            credits_remaining: creditsRemaining,
            credits_needed: creditsNeeded,
          },
          { status: 402 }
        );
      }
    }

    // Create call records and enqueue via worker HTTP endpoint
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const callRecords: Record<string, any>[] = [];
    for (let planIdx = 0; planIdx < plan.calls.length; planIdx++) {
      const planned = plan.calls[planIdx];

      // Skip SMS — not supported (A2P 10DLC required)
      if (planned.type === 'sms') {
        console.log(`[Initiate] Skipping SMS to ${planned.business_name} — SMS disabled`);
        continue;
      }

      const { data: call, error: callError } = await admin
        .from('calls')
        .insert({
          task_id: taskId,
          user_id: user.id,
          business_name: planned.business_name,
          phone_number: planned.phone_number,
          purpose: planned.purpose,
          status: 'queued',
          retry_count: 0,
          max_retries: 2,
        } as never)
        .select()
        .single();

      if (callError || !call) {
        console.error('Failed to create call record:', callError);
        continue;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const callRow = call as Record<string, any>;
      callRecords.push(callRow);

      // Use null instead of undefined so callerIdNumber survives JSON.stringify
      const callerIdToSend = verifiedCallerId || null;

      const enqueueBody = {
        callId: callRow.id,
        taskId,
        userId: user.id,
        businessName: planned.business_name,
        phoneNumber: planned.phone_number,
        purpose: planned.purpose,
        questions: planned.questions,
        context: planned.context,
        userProfile: profile || {},
        callerIdNumber: callerIdToSend,
        accountTier: tier,
      };

      console.log(`[Initiate] Enqueuing call for ${planned.business_name}: callerIdNumber=${JSON.stringify(callerIdToSend)}`);

      const enqueueRes = await fetch(`${WORKER_BASE_URL}/enqueue-call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify(enqueueBody),
      });

      if (!enqueueRes.ok) {
        console.error(`Failed to enqueue call via worker:`, await enqueueRes.text());
      }
    }

    if (callRecords.length === 0) {
      return NextResponse.json(
        { error: 'Failed to create call records. Please try again.' },
        { status: 500 }
      );
    }

    // Update task status
    await admin
      .from('tasks')
      .update({ status: 'in_progress' } as never)
      .eq('id', taskId);

    return NextResponse.json({ calls: callRecords });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('Unexpected error in POST /api/calls/initiate:', errorMessage);
    return NextResponse.json(
      { error: `Something went wrong: ${errorMessage}` },
      { status: 500 }
    );
  }
}
