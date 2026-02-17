import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { CallPlan } from '@/types';

const WORKER_BASE_URL = process.env.WORKER_BASE_URL || 'http://localhost:8080';

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body?.taskId) {
      return NextResponse.json({ error: 'Missing task ID' }, { status: 400 });
    }

    const { taskId } = body;

    // Fetch the task
    const { data: task } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .eq('user_id', user.id)
      .single();

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (task.status !== 'ready') {
      return NextResponse.json({ error: 'Task is not ready to start calls yet.' }, { status: 400 });
    }

    const plan = task.plan as CallPlan;
    if (!plan?.calls?.length) {
      return NextResponse.json({ error: 'No calls in the plan.' }, { status: 400 });
    }

    // Check concurrent call limit (max 5 active)
    const { count } = await supabase
      .from('calls')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('status', ['initiating', 'ringing', 'in_progress', 'on_hold', 'navigating_menu', 'transferred']);

    if ((count || 0) >= 5) {
      return NextResponse.json(
        { error: 'You have too many active calls right now. Please wait for some to finish.' },
        { status: 429 }
      );
    }

    // Fetch user profile for call context
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // Create call records and enqueue via worker HTTP endpoint
    const callRecords = [];
    for (const planned of plan.calls) {
      const { data: call, error: callError } = await supabase
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
        })
        .select()
        .single();

      if (callError || !call) {
        console.error('Failed to create call record:', callError);
        continue;
      }

      callRecords.push(call);

      // Enqueue via worker HTTP endpoint instead of direct BullMQ
      const enqueueRes = await fetch(`${WORKER_BASE_URL}/enqueue-call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          callId: call.id,
          taskId,
          userId: user.id,
          businessName: planned.business_name,
          phoneNumber: planned.phone_number,
          purpose: planned.purpose,
          questions: planned.questions,
          context: planned.context,
          userProfile: profile || {},
        }),
      });

      if (!enqueueRes.ok) {
        console.error('Failed to enqueue call via worker:', await enqueueRes.text());
      }
    }

    if (callRecords.length === 0) {
      return NextResponse.json(
        { error: 'Failed to create call records. Please try again.' },
        { status: 500 }
      );
    }

    // Update task status
    await supabase
      .from('tasks')
      .update({ status: 'in_progress' })
      .eq('id', taskId);

    return NextResponse.json({ calls: callRecords });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorStack = err instanceof Error ? err.stack : '';
    console.error('Unexpected error in POST /api/calls/initiate:', errorMessage, errorStack);
    return NextResponse.json(
      { error: `Something went wrong: ${errorMessage}` },
      { status: 500 }
    );
  }
}
