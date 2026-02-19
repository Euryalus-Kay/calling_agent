import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { CallDashboard } from '@/components/call-dashboard';
import type { Task } from '@/types';

export default async function TaskPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const [{ data: task }, { data: profile }] = await Promise.all([
    supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('profiles')
      .select('credits_remaining, credits_monthly_allowance, account_tier')
      .eq('id', user.id)
      .single(),
  ]);

  if (!task) notFound();

  const creditData = profile ? {
    creditsRemaining: profile.credits_remaining ?? 0,
    creditsMonthlyAllowance: profile.credits_monthly_allowance ?? 25,
    accountTier: profile.account_tier ?? 'free',
  } : undefined;

  return (
    <CallDashboard
      taskId={taskId}
      task={task as Task}
      creditData={creditData}
    />
  );
}
