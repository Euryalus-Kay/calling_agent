'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
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
  Zap,
} from 'lucide-react';
import { useState } from 'react';

interface NavSidebarProps {
  userName: string;
  unreadNotifications?: number;
  creditsRemaining?: number;
  accountTier?: string;
  creditsMonthlyAllowance?: number;
}

const mainNav = [
  { href: '/', label: 'New Task', icon: Plus, description: 'Start something new' },
  { href: '/history', label: 'History', icon: History, description: 'Past tasks & calls' },
  { href: '/knowledge', label: 'Knowledge', icon: Brain, description: 'Contacts & memory' },
  { href: '/schedule', label: 'Schedule', icon: Calendar, description: 'Upcoming calls' },
  { href: '/templates', label: 'Templates', icon: ClipboardList, description: 'Saved call templates' },
];

const secondaryNav = [
  { href: '/notifications', label: 'Notifications', icon: Bell, description: 'Updates & alerts' },
  { href: '/settings', label: 'Settings', icon: Settings, description: 'Preferences' },
];

export function NavSidebar({ userName, unreadNotifications = 0, creditsRemaining = 0, accountTier = 'free', creditsMonthlyAllowance = 25 }: NavSidebarProps) {
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
          'group flex items-center gap-2.5 rounded-[6px] px-2.5 py-[5px] text-[14px] leading-[1.4] transition-colors duration-100',
          active
            ? 'bg-[#EFEFEF] text-[#37352F] font-medium'
            : 'text-[#787774] hover:bg-[#EFEFEF] hover:text-[#37352F]'
        )}
      >
        <item.icon
          className="h-[18px] w-[18px] shrink-0"
          strokeWidth={1.5}
        />
        <span className="truncate">{item.label}</span>
        {item.href === '/notifications' && unreadNotifications > 0 && (
          <span
            className="ml-auto flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[11px] font-medium leading-none text-white"
            style={{ backgroundColor: '#EB5757' }}
          >
            {unreadNotifications > 9 ? '9+' : unreadNotifications}
          </span>
        )}
      </Link>
    );
  }

  const sidebarContent = (
    <div className="flex h-full flex-col" style={{ backgroundColor: '#FFFFFF' }}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4">
        <div
          className="flex h-[26px] w-[26px] items-center justify-center rounded-[4px]"
          style={{ backgroundColor: '#37352F' }}
        >
          <Phone className="h-[14px] w-[14px] text-white" strokeWidth={1.5} />
        </div>
        <span
          className="text-[15px] font-semibold tracking-[-0.01em]"
          style={{ color: '#37352F' }}
        >
          CallAgent
        </span>
      </div>

      {/* Main navigation */}
      <nav className="flex-1 space-y-[2px] px-2 pt-1">
        <p
          className="px-2.5 pb-[2px] pt-3 text-[11px] font-medium uppercase tracking-[0.06em]"
          style={{ color: '#787774' }}
        >
          Main
        </p>
        {mainNav.map((item) => (
          <NavItem key={item.href} item={item} />
        ))}

        <div className="pt-5">
          <p
            className="px-2.5 pb-[2px] pt-1 text-[11px] font-medium uppercase tracking-[0.06em]"
            style={{ color: '#787774' }}
          >
            You
          </p>
          {secondaryNav.map((item) => (
            <NavItem key={item.href} item={item} />
          ))}
        </div>
      </nav>

      {/* Credit pill */}
      <div className="mx-2 mb-1 px-2.5">
        <Link
          href="/settings?tab=billing"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-2 rounded-[6px] px-2.5 py-[6px] text-[13px] transition-colors duration-100 hover:bg-[#EFEFEF]"
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          <Zap
            className="h-[14px] w-[14px] shrink-0"
            strokeWidth={1.5}
            style={{
              color: accountTier === 'unlimited' ? '#6940A5'
                : creditsRemaining > (creditsMonthlyAllowance * 0.4) ? '#4DAB9A'
                : creditsRemaining > (creditsMonthlyAllowance * 0.15) ? '#D9730D'
                : '#EB5757',
            }}
          />
          <span
            className="font-medium"
            style={{
              color: accountTier === 'unlimited' ? '#6940A5'
                : creditsRemaining > (creditsMonthlyAllowance * 0.4) ? '#4DAB9A'
                : creditsRemaining > (creditsMonthlyAllowance * 0.15) ? '#D9730D'
                : '#EB5757',
            }}
          >
            {accountTier === 'unlimited' ? '∞' : creditsRemaining}
          </span>
          <span style={{ color: '#B4B4B0', fontSize: 12 }}>credits</span>
        </Link>
      </div>

      {/* User section */}
      <div
        className="mx-2 mb-2 mt-1 rounded-[6px] px-2.5 py-2"
        style={{ borderTop: '1px solid #E3E2DE' }}
      >
        <div className="flex items-center gap-2.5 pt-2">
          <div
            className="flex h-[24px] w-[24px] items-center justify-center rounded-full text-[12px] font-medium"
            style={{ backgroundColor: '#F7F6F3', color: '#37352F' }}
          >
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="text-[14px] font-medium truncate"
              style={{ color: '#37352F' }}
            >
              {userName}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            title="Sign out"
            className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[4px] transition-colors duration-100 hover:bg-[#EFEFEF]"
            style={{ color: '#787774' }}
          >
            <LogOut className="h-[15px] w-[15px]" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="fixed left-4 top-4 z-50 flex h-[32px] w-[32px] items-center justify-center rounded-[6px] transition-colors duration-100 hover:bg-[#EFEFEF] md:hidden"
        style={{ color: '#37352F' }}
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? (
          <X className="h-5 w-5" strokeWidth={1.5} />
        ) : (
          <Menu className="h-5 w-5" strokeWidth={1.5} />
        )}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-[240px] transition-transform duration-200 md:static md:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{
          borderRight: '1px solid #E3E2DE',
          backgroundColor: '#FFFFFF',
          boxShadow: mobileOpen ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
        }}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
