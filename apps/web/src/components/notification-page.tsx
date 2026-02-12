'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Bell,
  Phone,
  PhoneOff,
  CheckCircle2,
  Clock,
  Info,
  CheckCheck,
  Inbox,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Notification } from '@/types';

interface NotificationPageProps {
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

const TYPE_LABELS: Record<Notification['type'], string> = {
  call_completed: 'Call Completed',
  call_failed: 'Call Failed',
  task_completed: 'Task Completed',
  scheduled_reminder: 'Reminder',
  system: 'System',
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function NotificationPage({ userId }: NotificationPageProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (filter === 'unread') {
      query = query.eq('read', false);
    }

    const { data } = await query;
    if (data) {
      setNotifications(data as Notification[]);
    }
    setLoading(false);
  }, [userId, filter, supabase]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Subscribe to realtime
  useEffect(() => {
    const channel = supabase
      .channel(`notifications-page-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase]);

  async function handleMarkAsRead(notificationId: string) {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
  }

  async function handleMarkAllAsRead() {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function handleNotificationClick(notification: Notification) {
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }
    if (notification.link) {
      router.push(notification.link);
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}.`
              : 'You\'re all caught up.'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
          >
            <CheckCheck className="h-4 w-4" />
            Mark all as read
          </Button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        <Button
          variant={filter === 'all' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          All
        </Button>
        <Button
          variant={filter === 'unread' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setFilter('unread')}
        >
          Unread
          {unreadCount > 0 && (
            <Badge variant="default" className="ml-1.5 h-5 text-[11px]">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Notification list */}
      {loading ? (
        <Card>
          <div className="divide-y">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4 p-4">
                <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : notifications.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <Inbox className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <h3 className="font-medium text-muted-foreground">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </h3>
            <p className="text-sm text-muted-foreground/70 mt-1 max-w-sm">
              {filter === 'unread'
                ? 'All caught up! Switch to "All" to see past notifications.'
                : 'Notifications about your calls, tasks, and reminders will appear here.'}
            </p>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="divide-y">
            {notifications.map((notification) => {
              const Icon = NOTIFICATION_ICONS[notification.type] || Info;
              return (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    'flex w-full items-start gap-4 p-4 text-left transition-colors hover:bg-muted/50',
                    !notification.read && 'bg-primary/[0.03]'
                  )}
                >
                  <div
                    className={cn(
                      'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
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
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={cn(
                          'text-sm',
                          !notification.read ? 'font-semibold' : 'font-medium'
                        )}
                      >
                        {notification.title}
                      </span>
                      {!notification.read && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                      <Badge variant="outline" className="text-[10px] h-4 ml-auto">
                        {TYPE_LABELS[notification.type]}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {notification.body}
                    </p>
                    <span className="text-xs text-muted-foreground/70 mt-1.5 block">
                      {formatDate(notification.created_at)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
