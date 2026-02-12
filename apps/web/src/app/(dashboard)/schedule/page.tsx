import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SchedulePage } from '@/components/schedule-page';

export default async function Schedule() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: scheduledTasks } = await supabase
    .from('scheduled_tasks')
    .select('*')
    .eq('user_id', user.id)
    .order('scheduled_for', { ascending: true });

  return <SchedulePage scheduledTasks={scheduledTasks || []} userId={user.id} />;
}
