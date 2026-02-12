import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { TaskHistoryList } from '@/components/task-history-list';
import type { Task } from '@/types';

export default async function HistoryPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">History</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Everything I've done for you, all in one place.
        </p>
      </div>
      <TaskHistoryList tasks={(tasks || []) as Task[]} />
    </div>
  );
}
