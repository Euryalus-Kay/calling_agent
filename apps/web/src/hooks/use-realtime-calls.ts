'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Call } from '@/types';

export function useRealtimeCalls(taskId: string) {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    // Initial fetch
    supabase
      .from('calls')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at')
      .then(({ data }) => {
        if (data) setCalls(data as Call[]);
        setLoading(false);
      });

    // Subscribe to changes
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId]);

  return { calls, loading };
}
