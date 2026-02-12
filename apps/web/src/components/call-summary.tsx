'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles } from 'lucide-react';
import type { Call } from '@/types';

interface CallSummaryProps {
  taskId: string;
  calls: Call[];
}

export function CallSummary({ taskId, calls }: CallSummaryProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSummary() {
      try {
        const res = await fetch(`/api/tasks/${taskId}/summary`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        const data = await res.json();
        setSummary(data.summary);
      } catch {
        setSummary('Unable to generate summary.');
      } finally {
        setLoading(false);
      }
    }

    // Only fetch if all calls are done
    const allDone = calls.every((c) =>
      ['completed', 'failed', 'no_answer', 'busy'].includes(c.status)
    );
    if (allDone && calls.length > 0) {
      fetchSummary();
    }
  }, [taskId, calls]);

  if (loading) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Generating summary...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  if (!summary) return null;

  return (
    <Card className="mt-6 border-primary/20">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm whitespace-pre-line leading-relaxed">{summary}</p>
      </CardContent>
    </Card>
  );
}
