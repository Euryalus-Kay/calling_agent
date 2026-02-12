import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch the current task to get the current favorite status
  const { data: task, error: fetchError } = await supabase
    .from('tasks')
    .select('id, is_favorite')
    .eq('id', taskId)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  // Toggle the is_favorite field
  const { data: updatedTask, error: updateError } = await supabase
    .from('tasks')
    .update({ is_favorite: !task.is_favorite })
    .eq('id', taskId)
    .eq('user_id', user.id)
    .select()
    .single();

  if (updateError || !updatedTask) {
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }

  return NextResponse.json({ task: updatedTask });
}
