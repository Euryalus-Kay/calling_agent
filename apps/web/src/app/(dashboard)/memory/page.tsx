import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { MemoryPage } from '@/components/memory-page';

export default async function Memory() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: memories } = await supabase
    .from('user_memories')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return <MemoryPage memories={memories || []} userId={user.id} />;
}
