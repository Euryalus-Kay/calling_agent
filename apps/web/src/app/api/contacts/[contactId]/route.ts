import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ contactId: string }> }
) {
  const { contactId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  const { data: contact, error } = await supabase
    .from('contacts')
    .update(body)
    .eq('id', contactId)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error || !contact) {
    return NextResponse.json(
      { error: 'Contact not found or failed to update' },
      { status: 404 }
    );
  }

  return NextResponse.json({ contact });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ contactId: string }> }
) {
  const { contactId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await supabase
    .from('contacts')
    .delete()
    .eq('id', contactId)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json(
      { error: 'Failed to delete contact' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
