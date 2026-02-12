'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Notification } from '@/types';

interface UseNotificationsOptions {
  userId: string;
  limit?: number;
}

export function useNotifications({ userId, limit = 10 }: UseNotificationsOptions) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  // Stable reference to supabase client — don't recreate on every render
  const supabaseRef = useRef(createSupabaseBrowserClient());
  const supabase = supabaseRef.current;

  const fetchNotifications = useCallback(async () => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!error && data) {
      setNotifications(data as Notification[]);
      setUnreadCount((data as Notification[]).filter((n) => !n.read).length);
    }
    setLoading(false);
  }, [userId, limit, supabase]);

  const fetchUnreadCount = useCallback(async () => {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (!error && count !== null) {
      setUnreadCount(count);
    }
  }, [userId, supabase]);

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications((prev) => [newNotification, ...prev].slice(0, limit));
          setUnreadCount((prev) => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updated = payload.new as Notification;
          setNotifications((prev) =>
            prev.map((n) => (n.id === updated.id ? updated : n))
          );
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, limit, supabase, fetchNotifications, fetchUnreadCount]);

  const markAsRead = useCallback(
    async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (!error) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    },
    [supabase]
  );

  const markAllAsRead = useCallback(async () => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    }
  }, [userId, supabase]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
  };
}
