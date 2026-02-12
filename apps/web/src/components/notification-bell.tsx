'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useNotifications } from '@/hooks/use-notifications';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Bell,
  Phone,
  PhoneOff,
  CheckCircle2,
  Clock,
  Info,
  CheckCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Notification } from '@/types';

interface NotificationBellProps {
  userId: string;
}

const NOTIFICATION_ICONS: Record<
  Notification['type'],
  React.ComponentType<{ className?: string }>
> = {
  call_completed: Phone,
  call_failed: PhoneOff,
  task_completed: CheckCircle2,
  scheduled_reminder: Clock,
  system: Info,
};

function timeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } =
    useNotifications({ userId, limit: 10 });

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    if (open) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open]);

  function handleNotificationClick(notification: Notification) {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    if (notification.link) {
      router.push(notification.link);
    }
    setOpen(false);
  }

  return (
    <div className="relative">
      <Button
        ref={buttonRef}
        variant="ghost"
        size="icon"
        onClick={() => setOpen(!open)}
        className="relative"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-40" />
            <span className="relative inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </span>
        )}
      </Button>

      {open && (
        <div
          ref={popoverRef}
          className="absolute right-0 top-full mt-2 z-50 w-[380px] max-w-[calc(100vw-2rem)] rounded-lg border bg-card shadow-lg"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3">
            <h3 className="font-semibold text-sm">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => markAllAsRead()}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  <CheckCheck className="h-3.5 w-3.5 mr-1" />
                  Mark all read
                </Button>
              )}
            </div>
          </div>

          <Separator />

          {/* Notification list */}
          <ScrollArea className="max-h-[400px]">
            {loading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <Bell className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No notifications yet</p>
                <p className="text-xs text-muted-foreground/70 mt-0.5">
                  We&apos;ll notify you when something happens.
                </p>
              </div>
            ) : (
              <div>
                {notifications.map((notification) => {
                  const Icon = NOTIFICATION_ICONS[notification.type] || Info;
                  return (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={cn(
                        'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50',
                        !notification.read && 'bg-primary/[0.03]'
                      )}
                    >
                      <div
                        className={cn(
                          'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                          notification.type === 'call_failed'
                            ? 'bg-destructive/10 text-destructive'
                            : notification.type === 'call_completed'
                              ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                              : notification.type === 'task_completed'
                                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                : notification.type === 'scheduled_reminder'
                                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                  : 'bg-muted text-muted-foreground'
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'text-sm truncate',
                              !notification.read ? 'font-semibold' : 'font-medium'
                            )}
                          >
                            {notification.title}
                          </span>
                          {!notification.read && (
                            <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {notification.body}
                        </p>
                        <span className="text-[11px] text-muted-foreground/70 mt-1 block">
                          {timeAgo(notification.created_at)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {notifications.length > 0 && (
            <>
              <Separator />
              <div className="p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-muted-foreground"
                  onClick={() => {
                    router.push('/notifications');
                    setOpen(false);
                  }}
                >
                  View all notifications
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
