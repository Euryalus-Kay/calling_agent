'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Phone,
  Plus,
  History,
  Users,
  Calendar,
  Brain,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Star,
  ClipboardList,
} from 'lucide-react';
import { useState } from 'react';

interface NavSidebarProps {
  userName: string;
  unreadNotifications?: number;
}

const mainNav = [
  { href: '/', label: 'New Task', icon: Plus, description: 'Start something new' },
  { href: '/history', label: 'History', icon: History, description: 'Past tasks & calls' },
  { href: '/contacts', label: 'Contacts', icon: Users, description: 'Your phone book' },
  { href: '/schedule', label: 'Schedule', icon: Calendar, description: 'Upcoming calls' },
  { href: '/templates', label: 'Templates', icon: ClipboardList, description: 'Saved call templates' },
];

const secondaryNav = [
  { href: '/memory', label: 'Memory', icon: Brain, description: 'What I know about you' },
  { href: '/notifications', label: 'Notifications', icon: Bell, description: 'Updates & alerts' },
  { href: '/settings', label: 'Settings', icon: Settings, description: 'Preferences' },
];

export function NavSidebar({ userName, unreadNotifications = 0 }: NavSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  function isActive(href: string) {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  function NavItem({ item }: { item: typeof mainNav[0] }) {
    const active = isActive(item.href);
    return (
      <Link
        href={item.href}
        onClick={() => setMobileOpen(false)}
        className={cn(
          'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150',
          active
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
      >
        <item.icon className={cn('h-4 w-4 shrink-0', active && 'drop-shadow-sm')} />
        <span className="truncate">{item.label}</span>
        {item.href === '/notifications' && unreadNotifications > 0 && (
          <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-medium text-white">
            {unreadNotifications > 9 ? '9+' : unreadNotifications}
          </span>
        )}
      </Link>
    );
  }

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-sm">
          <Phone className="h-4 w-4 text-primary-foreground" />
        </div>
        <div>
          <span className="text-lg font-bold tracking-tight">CallAgent</span>
          <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Your AI phone assistant</p>
        </div>
      </div>

      {/* Main navigation */}
      <nav className="flex-1 space-y-1 px-3 pt-2">
        <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          Main
        </p>
        {mainNav.map((item) => (
          <NavItem key={item.href} item={item} />
        ))}

        <div className="pt-4">
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            You
          </p>
          {secondaryNav.map((item) => (
            <NavItem key={item.href} item={item} />
          ))}
        </div>
      </nav>

      {/* User section */}
      <div className="border-t p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{userName}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            title="Sign out"
            className="h-8 w-8 shrink-0"
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed left-4 top-4 z-50 md:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 border-r bg-card transition-transform duration-200 md:static md:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
