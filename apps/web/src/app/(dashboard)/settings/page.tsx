import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SettingsPage } from '@/components/settings-page';

export default async function Settings() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const [profileRes, txRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single(),
    supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  return (
    <SettingsPage
      profile={profileRes.data}
      userId={user.id}
      userEmail={user.email || ''}
      creditTransactions={txRes.data || []}
      stripeCustomerId={(profileRes.data as Record<string, unknown>)?.stripe_customer_id as string | null}
    />
  );
}
