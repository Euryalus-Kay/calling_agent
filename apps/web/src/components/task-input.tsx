'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Sparkles } from 'lucide-react';

const EXAMPLES = [
  'Find a dentist in Chicago that accepts Aetna and has availability this week',
  'Call the three closest pizza places and find out their delivery time',
  'Book a car oil change appointment for Saturday morning near me',
  'Find out if any local hardware stores have a 10-inch table saw in stock',
];

export function TaskInput() {
  const [taskText, setTaskText] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!taskText.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input_text: taskText }),
      });

      const data = await res.json();
      if (data.taskId) {
        router.push(`/tasks/${data.taskId}`);
      }
    } catch {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 672, margin: '0 auto', padding: '48px 16px 0' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: 30, fontWeight: 700, color: '#37352F', marginBottom: 8 }}>What can I help you with?</h1>
        <p style={{ fontSize: 16, color: '#787774' }}>
          Describe what you need and I&apos;ll make the calls for you
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ position: 'relative' }}>
          <textarea
            placeholder="e.g., Find me a plumber in Austin who can come tomorrow afternoon..."
            value={taskText}
            onChange={(e) => setTaskText(e.target.value)}
            style={{
              width: '100%',
              minHeight: 120,
              padding: '12px 56px 12px 16px',
              fontSize: 16,
              color: '#37352F',
              background: '#FFFFFF',
              border: '1px solid #E3E2DE',
              borderRadius: 8,
              outline: 'none',
              resize: 'none',
              boxSizing: 'border-box',
              fontFamily: 'inherit',
              lineHeight: 1.5,
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#2383E2';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(35,131,226,0.15)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#E3E2DE';
              e.currentTarget.style.boxShadow = 'none';
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleSubmit(e);
              }
            }}
          />
          <button
            type="submit"
            disabled={!taskText.trim() || loading}
            style={{
              position: 'absolute',
              bottom: 12,
              right: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 36,
              width: 36,
              background: !taskText.trim() || loading ? '#E3E2DE' : '#2383E2',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 8,
              cursor: !taskText.trim() || loading ? 'not-allowed' : 'pointer',
              transition: 'background 120ms ease',
            }}
          >
            <Send style={{ height: 16, width: 16 }} />
          </button>
        </div>
        <p style={{ fontSize: 12, color: '#787774', marginTop: 8, textAlign: 'right' }}>
          Cmd+Enter to submit
        </p>
      </form>

      <div style={{ marginTop: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Sparkles style={{ height: 16, width: 16, color: '#787774' }} />
          <span style={{ fontSize: 14, color: '#787774' }}>Try these</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {EXAMPLES.map((example) => (
            <div
              key={example}
              onClick={() => setTaskText(example)}
              style={{
                padding: 12,
                background: '#FFFFFF',
                border: '1px solid #E3E2DE',
                borderRadius: 8,
                cursor: 'pointer',
                transition: 'background 120ms ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#F7F6F3'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#FFFFFF'; }}
            >
              <p style={{ fontSize: 14, color: '#37352F', margin: 0 }}>{example}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
