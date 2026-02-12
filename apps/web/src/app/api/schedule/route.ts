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

  const { data: scheduledTasks, error } = await supabase
    .from('scheduled_tasks')
    .select('*')
    .eq('user_id', user.id)
    .order('scheduled_for');

  if (error) {
    return NextResponse.json(
      { error: 'Failed to fetch scheduled tasks' },
      { status: 500 }
    );
  }

  return NextResponse.json({ scheduledTasks: scheduledTasks || [] });
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

  if (!body.title || typeof body.title !== 'string' || body.title.trim() === '') {
    return NextResponse.json(
      { error: 'Title is required' },
      { status: 400 }
    );
  }

  if (!body.description || typeof body.description !== 'string' || body.description.trim() === '') {
    return NextResponse.json(
      { error: 'Description is required' },
      { status: 400 }
    );
  }

  if (!body.scheduled_for) {
    return NextResponse.json(
      { error: 'Scheduled date/time is required' },
      { status: 400 }
    );
  }

  const { data: scheduledTask, error } = await supabase
    .from('scheduled_tasks')
    .insert({
      user_id: user.id,
      title: body.title.trim(),
      description: body.description.trim(),
      scheduled_for: body.scheduled_for,
      recurrence: body.recurrence || null,
      status: 'pending',
    })
    .select()
    .single();

  if (error || !scheduledTask) {
    return NextResponse.json(
      { error: 'Failed to create scheduled task' },
      { status: 500 }
    );
  }

  return NextResponse.json({ scheduledTask }, { status: 201 });
}
