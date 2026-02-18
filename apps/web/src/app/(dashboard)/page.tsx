import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DashboardHome } from '@/components/dashboard-home';
import type { Task } from '@/types';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Fetch data in parallel
  const [profileRes, tasksRes, callStatsRes, memoryCountRes, contactCountRes] = await Promise.all([
    supabase.from('profiles').select('full_name, phone_number, verified_caller_id').eq('id', user.id).single(),
    supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('calls')
      .select('status, duration_seconds')
      .eq('user_id', user.id),
    supabase
      .from('user_memory')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id),
    supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id),
  ]);

  const recentTasks = (tasksRes.data || []) as Task[];
  const allCalls = callStatsRes.data || [];

  const stats = {
    total_tasks: recentTasks.length > 0 ? (tasksRes.data?.length || 0) : 0,
    total_calls: allCalls.length,
    successful_calls: allCalls.filter((c) => c.status === 'completed').length,
    total_call_minutes: allCalls.reduce(
      (sum, c) => sum + Math.ceil((c.duration_seconds || 0) / 60),
      0
    ),
  };

  // Get actual total tasks count
  if (stats.total_tasks > 0) {
    const { count } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);
    stats.total_tasks = count || 0;
  }

  return (
    <DashboardHome
      userName={profileRes.data?.full_name || 'there'}
      recentTasks={recentTasks}
      stats={stats}
      nudgeData={{
        hasPhoneNumber: !!profileRes.data?.phone_number,
        hasVerifiedCallerId: !!profileRes.data?.verified_caller_id,
        memoryCount: memoryCountRes.count || 0,
        contactCount: contactCountRes.count || 0,
      }}
    />
  );
}
