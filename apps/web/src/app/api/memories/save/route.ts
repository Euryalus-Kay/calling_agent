import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

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
    if (!body?.key || !body?.value) {
      return NextResponse.json({ error: 'Missing key or value' }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = createSupabaseAdminClient() as any;

    const { error } = await admin
      .from('user_memory')
      .upsert(
        {
          user_id: user.id,
          key: body.key,
          value: body.value,
          category: body.category || 'general',
          source: body.source || 'user_followup',
          confidence: 1.0,
          use_count: 0,
        },
        { onConflict: 'user_id,key' }
      );

    if (error) {
      console.error('[SaveMemory] Error:', error);
      return NextResponse.json({ error: 'Failed to save memory' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[SaveMemory] Error:', err);
    return NextResponse.json({ error: 'Failed to save memory' }, { status: 500 });
  }
}
