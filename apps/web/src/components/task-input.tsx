'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
    <div className="max-w-2xl mx-auto px-4 pt-12 md:pt-24">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">What can I help you with?</h1>
        <p className="text-muted-foreground">
          Describe what you need and I&apos;ll make the calls for you
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="relative">
          <Textarea
            placeholder="e.g., Find me a plumber in Austin who can come tomorrow afternoon..."
            value={taskText}
            onChange={(e) => setTaskText(e.target.value)}
            className="min-h-[120px] pr-14 text-base resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleSubmit(e);
              }
            }}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!taskText.trim() || loading}
            className="absolute bottom-3 right-3"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-right">
          Cmd+Enter to submit
        </p>
      </form>

      <div className="mt-8">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Try these</span>
        </div>
        <div className="grid gap-2">
          {EXAMPLES.map((example) => (
            <Card
              key={example}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => setTaskText(example)}
            >
              <CardContent className="p-3">
                <p className="text-sm">{example}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
