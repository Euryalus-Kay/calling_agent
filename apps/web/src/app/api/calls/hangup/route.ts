import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

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
    if (!body?.callId) {
      return NextResponse.json({ error: 'Missing call ID' }, { status: 400 });
    }

    // Verify the call belongs to the user
    const { data: call } = await supabase
      .from('calls')
      .select('id, task_id')
      .eq('id', body.callId)
      .single();

    if (!call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    // Verify task ownership
    const { data: task } = await supabase
      .from('tasks')
      .select('id')
      .eq('id', call.task_id)
      .eq('user_id', user.id)
      .single();

    if (!task) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Send hangup request to worker
    const res = await fetch(`${WORKER_BASE_URL}/call-hangup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ callId: body.callId }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: data.error || 'Failed to end call' },
        { status: res.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Hangup] Error:', err);
    return NextResponse.json({ error: 'Failed to end call' }, { status: 500 });
  }
}
