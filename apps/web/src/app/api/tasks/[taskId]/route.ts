import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!taskId || typeof taskId !== 'string') {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
    }

    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .eq('user_id', user.id)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const { data: calls, error: callsError } = await supabase
      .from('calls')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at');

    if (callsError) {
      console.error('[TaskDetail] Failed to fetch calls:', callsError);
    }

    return NextResponse.json({ task, calls: calls || [] });
  } catch (err) {
    console.error('[TaskDetail] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Failed to load task details' },
      { status: 500 }
    );
  }
}
