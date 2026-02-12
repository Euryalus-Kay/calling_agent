import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { TemplatesPage } from '@/components/templates-page';
import type { TaskTemplate } from '@/types';

export default async function Templates() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data } = await supabase
    .from('task_templates')
    .select('*')
    .order('use_count', { ascending: false });

  return <TemplatesPage templates={(data as TaskTemplate[]) || []} userId={user.id} />;
}
