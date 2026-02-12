import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { planTask } from '@/lib/ai/planner';

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
    if (!body?.input_text || typeof body.input_text !== 'string' || body.input_text.trim().length === 0) {
      return NextResponse.json({ error: 'Please describe what you need help with.' }, { status: 400 });
    }

    const input_text = body.input_text.trim();

    if (input_text.length > 2000) {
      return NextResponse.json({ error: 'Request is too long. Please keep it under 2000 characters.' }, { status: 400 });
    }

    // Check daily task limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: todayCount } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', today.toISOString());

    if ((todayCount || 0) >= 50) {
      return NextResponse.json(
        { error: 'Daily task limit reached. Try again tomorrow.' },
        { status: 429 }
      );
    }

    // Fetch user profile, memories, and contacts in parallel
    const [{ data: profile }, { data: memories }, { data: contacts }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('user_memory').select('key, value, category').eq('user_id', user.id).order('use_count', { ascending: false }).limit(100),
      supabase.from('contacts').select('name, phone_number, company, category').eq('user_id', user.id).order('is_favorite', { ascending: false }).limit(50),
    ]);

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

    // Update task with plan
    await supabase
      .from('tasks')
      .update({
        parsed_intent: plan as unknown as Record<string, unknown>,
        status: plan.status === 'ready' ? 'ready' : 'planning',
        plan: plan.plan || null,
        clarifying_messages: [
          { role: 'user', content: input_text },
          { role: 'assistant', content: plan.message },
        ],
      })
      .eq('id', task.id);

    return NextResponse.json({ taskId: task.id, plan });
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
