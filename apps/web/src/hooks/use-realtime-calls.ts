'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Call } from '@/types';

export function useRealtimeCalls(taskId: string) {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const fetchCalls = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase
      .from('calls')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at');

    if (data) setCalls(data as Call[]);
    setLoading(false);
  }, [taskId]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    // Initial fetch
    fetchCalls();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`calls-${taskId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calls',
          filter: `task_id=eq.${taskId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setCalls((prev) => [...prev, payload.new as Call]);
          } else if (payload.eventType === 'UPDATE') {
            setCalls((prev) =>
              prev.map((c) =>
                c.id === (payload.new as Call).id
                  ? { ...c, ...(payload.new as Partial<Call>) }
                  : c
              )
            );
          }
        }
      )
      .subscribe();

    // Fallback polling every 3s in case realtime WebSocket fails
    pollRef.current = setInterval(fetchCalls, 3000);

    return () => {
      supabase.removeChannel(channel);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [taskId, fetchCalls]);

  return { calls, loading };
}
