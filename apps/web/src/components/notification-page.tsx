'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
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
import type { Notification } from '@/types';

interface NotificationPageProps {
  userId: string;
}

const NOTIFICATION_ICONS: Record<
  Notification['type'],
  React.ComponentType<{ className?: string; style?: React.CSSProperties }>
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

const typeIconColors: Record<Notification['type'], { bg: string; color: string }> = {
  call_completed: { bg: 'rgba(77,171,154,0.08)', color: '#4DAB9A' },
  call_failed: { bg: 'rgba(235,87,87,0.08)', color: '#EB5757' },
  task_completed: { bg: 'rgba(35,131,226,0.08)', color: '#2383E2' },
  scheduled_reminder: { bg: 'rgba(203,145,47,0.08)', color: '#CB912F' },
  system: { bg: 'rgba(120,119,116,0.06)', color: '#787774' },
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
    <div style={{ maxWidth: 768, margin: '0 auto', padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#37352F', margin: 0 }}>Notifications</h1>
          <p style={{ fontSize: 14, color: '#787774', marginTop: 4 }}>
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}.`
              : 'You\'re all caught up.'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              fontSize: 14,
              fontWeight: 500,
              color: '#37352F',
              background: '#FFFFFF',
              border: '1px solid #E3E2DE',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            <CheckCheck style={{ height: 16, width: 16 }} />
            Mark all as read
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        <button
          onClick={() => setFilter('all')}
          style={{
            padding: '4px 12px',
            fontSize: 13,
            fontWeight: filter === 'all' ? 600 : 400,
            color: filter === 'all' ? '#37352F' : '#787774',
            background: filter === 'all' ? '#EFEFEF' : 'transparent',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          All
        </button>
        <button
          onClick={() => setFilter('unread')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 12px',
            fontSize: 13,
            fontWeight: filter === 'unread' ? 600 : 400,
            color: filter === 'unread' ? '#37352F' : '#787774',
            background: filter === 'unread' ? '#EFEFEF' : 'transparent',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          Unread
          {unreadCount > 0 && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 20,
              minWidth: 20,
              padding: '0 6px',
              fontSize: 11,
              fontWeight: 600,
              color: '#FFFFFF',
              background: '#2383E2',
              borderRadius: 10,
            }}>
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Notification list */}
      {loading ? (
        <div style={{ background: '#FFFFFF', border: '1px solid #E3E2DE', borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', gap: 16, padding: 16, borderBottom: i < 4 ? '1px solid #E3E2DE' : 'none' }}>
              <div style={{ height: 40, width: 40, borderRadius: '50%', background: '#F7F6F3', flexShrink: 0 }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ height: 16, width: '33%', background: '#F7F6F3', borderRadius: 4 }} />
                <div style={{ height: 12, width: '100%', background: '#F7F6F3', borderRadius: 4 }} />
                <div style={{ height: 12, width: '25%', background: '#F7F6F3', borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div style={{ background: '#FFFFFF', border: '1px solid #E3E2DE', borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 16px', textAlign: 'center' }}>
            <Inbox style={{ height: 48, width: 48, color: '#E3E2DE', marginBottom: 12 }} />
            <h3 style={{ fontWeight: 500, color: '#787774', margin: '0 0 4px' }}>
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </h3>
            <p style={{ fontSize: 14, color: '#787774', maxWidth: 360, margin: 0, opacity: 0.7 }}>
              {filter === 'unread'
                ? 'All caught up! Switch to "All" to see past notifications.'
                : 'Notifications about your calls, tasks, and reminders will appear here.'}
            </p>
          </div>
        </div>
      ) : (
        <div style={{ background: '#FFFFFF', border: '1px solid #E3E2DE', borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          {notifications.map((notification, i) => {
            const Icon = NOTIFICATION_ICONS[notification.type] || Info;
            const iconColor = typeIconColors[notification.type] || typeIconColors.system;
            return (
              <button
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                style={{
                  display: 'flex',
                  width: '100%',
                  alignItems: 'flex-start',
                  gap: 16,
                  padding: 16,
                  textAlign: 'left',
                  background: !notification.read ? 'rgba(35,131,226,0.02)' : 'transparent',
                  border: 'none',
                  borderBottom: i < notifications.length - 1 ? '1px solid #E3E2DE' : 'none',
                  cursor: 'pointer',
                  transition: 'background 120ms ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#F7F6F3'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = !notification.read ? 'rgba(35,131,226,0.02)' : 'transparent'; }}
              >
                <div style={{
                  marginTop: 2,
                  display: 'flex',
                  height: 40,
                  width: 40,
                  flexShrink: 0,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  background: iconColor.bg,
                  color: iconColor.color,
                }}>
                  <Icon style={{ height: 20, width: 20 }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: 14,
                      fontWeight: !notification.read ? 600 : 500,
                      color: '#37352F',
                    }}>
                      {notification.title}
                    </span>
                    {!notification.read && (
                      <span style={{ height: 8, width: 8, flexShrink: 0, borderRadius: '50%', background: '#2383E2' }} />
                    )}
                    <span style={{
                      fontSize: 10,
                      fontWeight: 500,
                      padding: '1px 6px',
                      borderRadius: 4,
                      border: '1px solid #E3E2DE',
                      color: '#787774',
                      marginLeft: 'auto',
                    }}>
                      {TYPE_LABELS[notification.type]}
                    </span>
                  </div>
                  <p style={{ fontSize: 14, color: '#787774', marginTop: 4, margin: '4px 0 0' }}>
                    {notification.body}
                  </p>
                  <span style={{ fontSize: 12, color: '#787774', marginTop: 6, display: 'block', opacity: 0.7 }}>
                    {formatDate(notification.created_at)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
