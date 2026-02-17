'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useNotifications } from '@/hooks/use-notifications';
import {
  Bell,
  Phone,
  PhoneOff,
  CheckCircle2,
  Clock,
  Info,
  CheckCheck,
} from 'lucide-react';
import type { Notification } from '@/types';

interface NotificationBellProps {
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

const typeIconColors: Record<Notification['type'], { bg: string; color: string }> = {
  call_completed: { bg: 'rgba(77,171,154,0.08)', color: '#4DAB9A' },
  call_failed: { bg: 'rgba(235,87,87,0.08)', color: '#EB5757' },
  task_completed: { bg: 'rgba(35,131,226,0.08)', color: '#2383E2' },
  scheduled_reminder: { bg: 'rgba(203,145,47,0.08)', color: '#CB912F' },
  system: { bg: 'rgba(120,119,116,0.06)', color: '#787774' },
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
    <div style={{ position: 'relative' }}>
      <button
        ref={buttonRef}
        onClick={() => setOpen(!open)}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 36,
          width: 36,
          background: 'none',
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer',
          transition: 'background 120ms ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#EFEFEF'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell style={{ height: 20, width: 20, color: '#37352F' }} />
        {unreadCount > 0 && (
          <span style={{ position: 'absolute', top: -2, right: -2, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 16, width: 16 }}>
            <span style={{ position: 'absolute', display: 'inline-flex', height: '100%', width: '100%', borderRadius: '50%', background: '#EB5757', opacity: 0.4, animation: 'ping 1s cubic-bezier(0,0,0.2,1) infinite' }} />
            <span style={{
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 14,
              width: 14,
              borderRadius: '50%',
              background: '#EB5757',
              fontSize: 10,
              fontWeight: 700,
              color: '#FFFFFF',
            }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </span>
        )}
      </button>

      {open && (
        <div
          ref={popoverRef}
          style={{
            position: 'absolute',
            right: 0,
            top: '100%',
            marginTop: 8,
            zIndex: 50,
            width: 380,
            maxWidth: 'calc(100vw - 2rem)',
            borderRadius: 8,
            border: '1px solid #E3E2DE',
            background: '#FFFFFF',
            boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}>
            <h3 style={{ fontWeight: 600, fontSize: 14, color: '#37352F', margin: 0 }}>Notifications</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '2px 8px',
                    fontSize: 12,
                    color: '#787774',
                    background: 'none',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                    transition: 'color 120ms ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#37352F'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#787774'; }}
                >
                  <CheckCheck style={{ height: 14, width: 14 }} />
                  Mark all read
                </button>
              )}
            </div>
          </div>

          <div style={{ height: 1, background: '#E3E2DE' }} />

          {/* Notification list */}
          <div style={{ maxHeight: 400, overflow: 'auto' }}>
            {loading ? (
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12 }}>
                    <div style={{ height: 32, width: 32, borderRadius: '50%', background: '#F7F6F3', flexShrink: 0 }} />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ height: 14, width: '75%', background: '#F7F6F3', borderRadius: 4 }} />
                      <div style={{ height: 12, width: '100%', background: '#F7F6F3', borderRadius: 4 }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 16px', textAlign: 'center' }}>
                <Bell style={{ height: 32, width: 32, color: '#E3E2DE', marginBottom: 8 }} />
                <p style={{ fontSize: 14, color: '#787774', margin: 0 }}>No notifications yet</p>
                <p style={{ fontSize: 12, color: '#787774', marginTop: 2, opacity: 0.7 }}>
                  We&apos;ll notify you when something happens.
                </p>
              </div>
            ) : (
              <div>
                {notifications.map((notification) => {
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
                        gap: 12,
                        padding: '12px 16px',
                        textAlign: 'left',
                        background: !notification.read ? 'rgba(35,131,226,0.02)' : 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'background 120ms ease',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#F7F6F3'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = !notification.read ? 'rgba(35,131,226,0.02)' : 'transparent'; }}
                    >
                      <div style={{
                        marginTop: 2,
                        display: 'flex',
                        height: 32,
                        width: 32,
                        flexShrink: 0,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%',
                        background: iconColor.bg,
                        color: iconColor.color,
                      }}>
                        <Icon style={{ height: 16, width: 16 }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{
                            fontSize: 14,
                            fontWeight: !notification.read ? 600 : 500,
                            color: '#37352F',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {notification.title}
                          </span>
                          {!notification.read && (
                            <span style={{ height: 8, width: 8, flexShrink: 0, borderRadius: '50%', background: '#2383E2' }} />
                          )}
                        </div>
                        <p style={{ fontSize: 12, color: '#787774', marginTop: 2, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', margin: '2px 0 0' }}>
                          {notification.body}
                        </p>
                        <span style={{ fontSize: 11, color: '#787774', marginTop: 4, display: 'block', opacity: 0.7 }}>
                          {timeAgo(notification.created_at)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {notifications.length > 0 && (
            <>
              <div style={{ height: 1, background: '#E3E2DE' }} />
              <div style={{ padding: 8 }}>
                <button
                  onClick={() => {
                    router.push('/notifications');
                    setOpen(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '6px 0',
                    fontSize: 12,
                    fontWeight: 500,
                    color: '#787774',
                    background: 'none',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                    transition: 'background 120ms ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#EFEFEF'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                >
                  View all notifications
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
