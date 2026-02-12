'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { TranscriptEntry } from '@/types';

export function useRealtimeTranscript(callId: string) {
  const [entries, setEntries] = useState<TranscriptEntry[]>([]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    // Fetch existing entries
    supabase
      .from('transcript_entries')
      .select('*')
      .eq('call_id', callId)
      .order('created_at')
      .then(({ data }) => {
        if (data) setEntries(data as TranscriptEntry[]);
      });

    // Subscribe to new entries
    const channel = supabase
      .channel(`transcript-${callId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transcript_entries',
          filter: `call_id=eq.${callId}`,
        },
        (payload) => {
          setEntries((prev) => [...prev, payload.new as TranscriptEntry]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [callId]);

  return entries;
}
