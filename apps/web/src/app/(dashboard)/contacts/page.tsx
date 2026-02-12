import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ContactsPage } from '@/components/contacts-page';

export default async function Contacts() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: contacts } = await supabase
    .from('contacts')
    .select('*')
    .eq('user_id', user.id)
    .order('name');

  return <ContactsPage contacts={contacts || []} userId={user.id} />;
}
