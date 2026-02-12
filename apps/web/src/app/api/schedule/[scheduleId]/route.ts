import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ scheduleId: string }> }
) {
  const { scheduleId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  const { data: scheduledTask, error } = await supabase
    .from('scheduled_tasks')
    .update(body)
    .eq('id', scheduleId)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error || !scheduledTask) {
    return NextResponse.json(
      { error: 'Scheduled task not found or failed to update' },
      { status: 404 }
    );
  }

  return NextResponse.json({ scheduledTask });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ scheduleId: string }> }
) {
  const { scheduleId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await supabase
    .from('scheduled_tasks')
    .delete()
    .eq('id', scheduleId)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json(
      { error: 'Failed to delete scheduled task' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
