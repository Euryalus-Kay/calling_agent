import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { planTask } from '@/lib/ai/planner';
import { checkAndResetCredits, getTierLimits, calculateCreditsNeeded, hasEnoughCredits } from '@/lib/credits';
import type { AccountTier } from '@/types';

export async function POST(request: Request) {
  try {
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
    if (!body?.input_text || typeof body.input_text !== 'string' || body.input_text.trim().length === 0) {
      return NextResponse.json({ error: 'Please describe what you need help with.' }, { status: 400 });
    }

    const input_text = body.input_text.trim();

    if (input_text.length > 2000) {
      return NextResponse.json({ error: 'Request is too long. Please keep it under 2000 characters.' }, { status: 400 });
    }

    // Fetch user profile, memories, and contacts in parallel
    const [{ data: profile }, { data: memories }, { data: contacts }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('user_memory').select('key, value, category').eq('user_id', user.id).order('use_count', { ascending: false }).limit(100),
      supabase.from('contacts').select('name, phone_number, company, category').eq('user_id', user.id).order('is_favorite', { ascending: false }).limit(50),
    ]);

    // Tier-based daily task limit
    const tier = ((profile as Record<string, unknown>)?.account_tier as AccountTier) || 'free';
    const limits = getTierLimits(tier);

    if (limits.daily_tasks !== -1) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: todayCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', today.toISOString());

      if ((todayCount || 0) >= limits.daily_tasks) {
        return NextResponse.json(
          { error: `Daily task limit reached (${limits.daily_tasks} tasks). ${tier === 'free' ? 'Upgrade for more.' : 'Try again tomorrow.'}` },
          { status: 429 }
        );
      }
    }

    // Create task record
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        user_id: user.id,
        input_text,
        status: 'planning',
      })
      .select()
      .single();

    if (taskError || !task) {
      console.error('Failed to create task:', taskError);
      return NextResponse.json(
        { error: 'Something went wrong creating your task. Please try again.' },
        { status: 500 }
      );
    }

    // Plan the task with Claude
    let plan;
    try {
      plan = await planTask({
        userMessage: input_text,
        conversationHistory: [],
        userProfile: profile || {},
        userMemories: memories || [],
        userContacts: contacts || [],
      });
    } catch (err) {
      console.error('Planning failed:', err);
      // Mark task as failed
      await supabase
        .from('tasks')
        .update({ status: 'failed' })
        .eq('id', task.id);
      return NextResponse.json(
        { error: 'I had trouble understanding that request. Please try rephrasing it.' },
        { status: 500 }
      );
    }

    // If the plan includes calls, check credits and call limits
    if (plan.plan?.calls?.length) {
      const creditsNeeded = calculateCreditsNeeded(plan.plan.calls);
      const creditsRemaining = ((profile as Record<string, unknown>)?.credits_remaining as number) ?? 0;

      // Check max calls per task
      if (plan.plan.calls.length > limits.max_calls_per_task) {
        await supabase.from('tasks').update({ status: 'failed' }).eq('id', task.id);
        return NextResponse.json(
          { error: `Your plan has ${plan.plan.calls.length} calls, but your ${tier} plan allows up to ${limits.max_calls_per_task} per task. Upgrade for more.` },
          { status: 402 }
        );
      }

      // Check credit balance
      if (!hasEnoughCredits(tier, creditsRemaining, creditsNeeded)) {
        await supabase.from('tasks').update({ status: 'failed' }).eq('id', task.id);
        return NextResponse.json(
          {
            error: `You need ${creditsNeeded} credit${creditsNeeded !== 1 ? 's' : ''} but have ${creditsRemaining}. ${tier === 'free' ? 'Upgrade for more credits.' : 'Purchase additional credits.'}`,
            credits_remaining: creditsRemaining,
            credits_needed: creditsNeeded,
          },
          { status: 402 }
        );
      }
    }

    // Save any new memories the planner extracted
    if (plan.new_memories && plan.new_memories.length > 0) {
      const memoryRows = plan.new_memories.map((m: { key: string; value: string; category?: string }) => ({
        user_id: user.id,
        key: m.key,
        value: m.value,
        category: m.category || 'general',
        source: 'planner',
        confidence: 0.9,
      }));
      await supabase.from('user_memory').insert(memoryRows).then(undefined, (err: unknown) => {
        console.error('Failed to save memories:', err);
      });
    }

    // If scheduled_for is provided, create a scheduled_tasks entry and link it
    let scheduledTaskId: string | null = null;
    const scheduledFor = body.scheduled_for;
    const recurrence = body.recurrence;

    if (scheduledFor && typeof scheduledFor === 'string') {
      const scheduledDate = new Date(scheduledFor);
      if (scheduledDate > new Date()) {
        const { data: scheduled, error: schedError } = await supabase
          .from('scheduled_tasks')
          .insert({
            user_id: user.id,
            title: plan.plan?.summary || input_text.slice(0, 100),
            description: input_text,
            scheduled_for: scheduledFor,
            recurrence: recurrence && ['daily', 'weekly', 'monthly'].includes(recurrence) ? recurrence : null,
            status: 'pending',
          })
          .select('id')
          .single();

        if (schedError) {
          console.error('Failed to create scheduled task:', schedError);
        } else if (scheduled) {
          scheduledTaskId = scheduled.id;
        }
      }
    }

    // Update task with plan (and optional schedule link)
    const taskUpdate: Record<string, unknown> = {
      parsed_intent: plan as unknown as Record<string, unknown>,
      status: plan.status === 'ready' ? 'ready' : 'planning',
      plan: plan.plan || null,
      clarifying_messages: [
        { role: 'user', content: input_text },
        { role: 'assistant', content: plan.message },
      ],
    };
    if (scheduledTaskId) {
      taskUpdate.scheduled_task_id = scheduledTaskId;
    }

    await supabase
      .from('tasks')
      .update(taskUpdate)
      .eq('id', task.id);

    // Also link the scheduled_task back to the task
    if (scheduledTaskId) {
      await supabase
        .from('scheduled_tasks')
        .update({ task_id: task.id })
        .eq('id', scheduledTaskId);
    }

    return NextResponse.json({ taskId: task.id, plan, scheduled: !!scheduledTaskId });
  } catch (err) {
    console.error('Unexpected error in POST /api/tasks:', err);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch tasks:', error);
      return NextResponse.json({ tasks: [] });
    }

    return NextResponse.json({ tasks: tasks || [] });
  } catch (err) {
    console.error('Unexpected error in GET /api/tasks:', err);
    return NextResponse.json({ tasks: [] });
  }
}
