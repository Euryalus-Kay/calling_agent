'use client';

import { useEffect, useState } from 'react';
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
      <div style={{
        marginTop: 24,
        backgroundColor: '#FFFFFF',
        border: '1px solid #E3E2DE',
        borderRadius: 8,
        boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
        overflow: 'hidden',
      }}>
        <style>{`
          @keyframes notionPulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
        `}</style>
        <div style={{ padding: '16px 20px 12px' }}>
          <h3 style={{
            fontSize: 18,
            fontWeight: 600,
            color: '#37352F',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            margin: 0,
          }}>
            <Sparkles style={{ height: 20, width: 20, color: '#787774' }} />
            Generating summary...
          </h3>
        </div>
        <div style={{ padding: '0 20px 20px' }}>
          <div style={{
            height: 16,
            width: '100%',
            borderRadius: 4,
            backgroundColor: '#F7F6F3',
            marginBottom: 8,
            animation: 'notionPulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
          }} />
          <div style={{
            height: 16,
            width: '75%',
            borderRadius: 4,
            backgroundColor: '#F7F6F3',
            marginBottom: 8,
            animation: 'notionPulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
          }} />
          <div style={{
            height: 16,
            width: '50%',
            borderRadius: 4,
            backgroundColor: '#F7F6F3',
            animation: 'notionPulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
          }} />
        </div>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div style={{
      marginTop: 24,
      backgroundColor: '#FFFFFF',
      border: '1px solid rgba(35,131,226,0.2)',
      borderRadius: 8,
      boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
      overflow: 'hidden',
    }}>
      <div style={{ padding: '16px 20px 12px' }}>
        <h3 style={{
          fontSize: 18,
          fontWeight: 600,
          color: '#37352F',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          margin: 0,
        }}>
          <Sparkles style={{ height: 20, width: 20, color: '#2383E2' }} />
          Summary
        </h3>
      </div>
      <div style={{ padding: '0 20px 20px' }}>
        <p style={{
          fontSize: 14,
          whiteSpace: 'pre-line',
          lineHeight: 1.6,
          color: '#37352F',
          margin: 0,
        }}>
          {summary}
        </p>
      </div>
    </div>
  );
}
