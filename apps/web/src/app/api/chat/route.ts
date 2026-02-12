import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { planTask } from '@/lib/ai/planner';
import type { ChatMessage } from '@/types';

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: { taskId?: string; message?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { taskId, message } = body;

    if (!taskId || typeof taskId !== 'string') {
      return NextResponse.json({ error: 'taskId is required' }, { status: 400 });
    }

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    if (message.length > 5000) {
      return NextResponse.json({ error: 'Message too long (max 5000 characters)' }, { status: 400 });
    }

    // Fetch the task
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .eq('user_id', user.id)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Fetch user profile, memories, and contacts in parallel
    const [{ data: profile }, { data: memories }, { data: contacts }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('user_memory').select('key, value, category').eq('user_id', user.id),
      supabase.from('contacts').select('name, phone_number, company, category').eq('user_id', user.id).order('is_favorite', { ascending: false }).limit(50),
    ]);

    const history = (task.clarifying_messages || []) as ChatMessage[];

    // Continue the conversation with Claude Opus
    let plan;
    try {
      plan = await planTask({
        userMessage: message.trim(),
        conversationHistory: history,
        userProfile: profile || {},
        userMemories: memories || [],
        userContacts: contacts || [],
      });
    } catch (err) {
      console.error('[Chat] Planning failed:', err);
      return NextResponse.json(
        { error: 'Failed to process your message. Please try again.' },
        { status: 500 }
      );
    }

    // Save any new memories the planner extracted (non-blocking)
    if (plan.new_memories && plan.new_memories.length > 0) {
      try {
        const memoryRows = plan.new_memories.map((m: { key: string; value: string; category?: string }) => ({
          user_id: user.id,
          key: m.key,
          value: m.value,
          category: m.category || 'general',
          source: 'planner',
          confidence: 0.9,
        }));
        await supabase.from('user_memory').insert(memoryRows);
      } catch (err) {
        console.error('[Chat] Memory save failed (non-critical):', err);
      }
    }

    // Update messages and plan
    const updatedMessages: ChatMessage[] = [
      ...history,
      { role: 'user', content: message.trim() },
      { role: 'assistant', content: plan.message },
    ];

    const { error: updateError } = await supabase
      .from('tasks')
      .update({
        parsed_intent: plan as unknown as Record<string, unknown>,
        status: plan.status === 'ready' ? 'ready' : 'planning',
        plan: plan.plan || task.plan,
        clarifying_messages: updatedMessages,
      })
      .eq('id', taskId);

    if (updateError) {
      console.error('[Chat] Task update failed:', updateError);
      // Still return the plan response even if DB update fails
    }

    return NextResponse.json({
      message: plan.message,
      plan: plan.plan || null,
      status: plan.status,
    });
  } catch (err) {
    console.error('[Chat] Unexpected error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
