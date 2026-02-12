import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: contacts, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('user_id', user.id)
    .order('name');

  if (error) {
    return NextResponse.json(
      { error: 'Failed to fetch contacts' },
      { status: 500 }
    );
  }

  return NextResponse.json({ contacts: contacts || [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
    return NextResponse.json(
      { error: 'Name is required' },
      { status: 400 }
    );
  }

  const { data: contact, error } = await supabase
    .from('contacts')
    .insert({
      user_id: user.id,
      name: body.name.trim(),
      phone_number: body.phone_number || null,
      email: body.email || null,
      company: body.company || null,
      category: body.category || 'other',
      notes: body.notes || null,
      is_favorite: body.is_favorite || false,
    })
    .select()
    .single();

  if (error || !contact) {
    return NextResponse.json(
      { error: 'Failed to create contact' },
      { status: 500 }
    );
  }

  return NextResponse.json({ contact }, { status: 201 });
}
