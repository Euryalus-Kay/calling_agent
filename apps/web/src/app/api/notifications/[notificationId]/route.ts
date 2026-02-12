import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ notificationId: string }> }
) {
  const { notificationId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: notification, error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error || !notification) {
    return NextResponse.json(
      { error: 'Notification not found or failed to update' },
      { status: 404 }
    );
  }

  return NextResponse.json({ notification });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ notificationId: string }> }
) {
  const { notificationId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json(
      { error: 'Failed to delete notification' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
