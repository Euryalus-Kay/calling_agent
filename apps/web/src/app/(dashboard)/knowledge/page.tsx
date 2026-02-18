import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { KnowledgePage } from '@/components/knowledge-page';

export default async function Knowledge() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [memoriesRes, contactsRes] = await Promise.all([
    supabase
      .from('user_memory')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('contacts')
      .select('*')
      .eq('user_id', user.id)
      .order('name'),
  ]);

  return (
    <KnowledgePage
      memories={memoriesRes.data || []}
      contacts={contactsRes.data || []}
      userId={user.id}
    />
  );
}
