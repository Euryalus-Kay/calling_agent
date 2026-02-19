import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const WORKER_BASE_URL = process.env.WORKER_BASE_URL || 'http://localhost:8080';

export async function POST(
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

    // Verify task exists and belongs to user
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, status')
      .eq('id', taskId)
      .eq('user_id', user.id)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Only allow cancelling active tasks
    if (!['planning', 'ready', 'in_progress'].includes(task.status)) {
      return NextResponse.json(
        { error: 'Task is not active and cannot be cancelled' },
        { status: 400 }
      );
    }

    // Fetch all active calls for this task
    const { data: activeCalls } = await supabase
      .from('calls')
      .select('id, twilio_call_sid, status')
      .eq('task_id', taskId)
      .in('status', ['queued', 'ringing', 'in_progress', 'initiated']);

    // Send hangup request to worker for each active call
    if (activeCalls && activeCalls.length > 0) {
      const hangupPromises = activeCalls.map(async (call) => {
        try {
          await fetch(`${WORKER_BASE_URL}/call-hangup`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({ callId: call.id }),
          });
        } catch (err) {
          console.error(`[CancelTask] Failed to hangup call ${call.id}:`, err);
        }
      });

      await Promise.allSettled(hangupPromises);

      // Update all active calls to failed
      await supabase
        .from('calls')
        .update({
          status: 'failed',
          error: 'Cancelled by user',
          ended_at: new Date().toISOString(),
        } as never)
        .eq('task_id', taskId)
        .in('status', ['queued', 'ringing', 'in_progress', 'initiated']);
    }

    // Update task status to failed
    await supabase
      .from('tasks')
      .update({
        status: 'failed',
        updated_at: new Date().toISOString(),
      } as never)
      .eq('id', taskId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[CancelTask] Error:', err);
    return NextResponse.json(
      { error: 'Failed to cancel task' },
      { status: 500 }
    );
  }
}
