import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { NavSidebar } from '@/components/nav-sidebar';
import { NotificationBell } from '@/components/notification-bell';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profile && !profile.onboarding_completed) {
    redirect('/onboarding');
  }

  return (
    <div className="flex h-screen" style={{ backgroundColor: '#FFFFFF' }}>
      <NavSidebar userName={profile?.full_name || user.email || 'User'} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header
          className="flex h-[45px] shrink-0 items-center justify-end px-4 md:px-6"
          style={{ borderBottom: '1px solid #E3E2DE', backgroundColor: '#FFFFFF' }}
        >
          <NotificationBell userId={user.id} />
        </header>
        <main className="flex-1 overflow-auto" style={{ backgroundColor: '#FFFFFF' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
