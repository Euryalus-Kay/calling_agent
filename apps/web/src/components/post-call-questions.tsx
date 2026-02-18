'use client';

import { useEffect, useState, useCallback } from 'react';
import { MessageCircleQuestion, X, Check, Brain, Loader2, ChevronDown } from 'lucide-react';

interface FollowupQuestion {
  id: string;
  question: string;
  memory_key: string;
  category: string;
  quick_answers: string[];
}

interface PostCallQuestionsProps {
  taskId: string;
  allCallsDone: boolean;
  summaryReady: boolean;
}

export function PostCallQuestions({ taskId, allCallsDone, summaryReady }: PostCallQuestionsProps) {
  const [questions, setQuestions] = useState<FollowupQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [answeredIds, setAnsweredIds] = useState<Set<string>>(new Set());
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const fetchQuestions = useCallback(async () => {
    if (fetched || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/followup-questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      setQuestions(data.questions || []);
    } catch {
      setQuestions([]);
    } finally {
      setLoading(false);
      setFetched(true);
    }
  }, [taskId, fetched, loading]);

  // Fetch once the summary is ready (meaning calls are done and summary generated)
  useEffect(() => {
    if (allCallsDone && summaryReady && !fetched) {
      fetchQuestions();
    }
  }, [allCallsDone, summaryReady, fetched, fetchQuestions]);

  async function handleAnswer(question: FollowupQuestion, answer: string) {
    setSavingId(question.id);
    try {
      await fetch('/api/memories/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: question.memory_key,
          value: answer,
          category: question.category,
          source: `followup:${taskId}`,
        }),
      });
      setAnsweredIds((prev) => new Set([...prev, question.id]));
    } catch {
      // Silently fail — not critical
    } finally {
      setSavingId(null);
    }
  }

  function handleSkip(questionId: string) {
    setAnsweredIds((prev) => new Set([...prev, questionId]));
  }

  // Don't render anything until we have questions
  if (!fetched || loading) {
    if (!allCallsDone || !summaryReady) return null;
    return (
      <div style={{
        marginTop: 16,
        padding: '16px 20px',
        backgroundColor: '#FFFFFF',
        border: '1px solid rgba(105,64,165,0.2)',
        borderRadius: 8,
        boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <style>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes notionPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        `}</style>
        <Loader2 style={{ height: 16, width: 16, color: '#6940A5', animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: 13, color: '#787774' }}>Checking if there's anything to learn from this call...</span>
      </div>
    );
  }

  if (questions.length === 0 || dismissed) return null;

  const unanswered = questions.filter((q) => !answeredIds.has(q.id));
  if (unanswered.length === 0) {
    // All answered — show a brief thank you that fades
    return (
      <div style={{
        marginTop: 16,
        padding: '12px 20px',
        backgroundColor: 'rgba(77,171,154,0.04)',
        border: '1px solid rgba(77,171,154,0.2)',
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <Check style={{ height: 16, width: 16, color: '#4DAB9A' }} />
        <span style={{ fontSize: 13, color: '#4DAB9A', fontWeight: 500 }}>
          Got it, thanks! I'll remember that for next time.
        </span>
      </div>
    );
  }

  return (
    <div style={{
      marginTop: 16,
      backgroundColor: '#FFFFFF',
      border: '1px solid rgba(105,64,165,0.2)',
      borderRadius: 8,
      boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '14px 20px 12px',
          cursor: 'pointer',
        }}
        onClick={() => setCollapsed(!collapsed)}
      >
        <MessageCircleQuestion style={{ height: 18, width: 18, color: '#6940A5', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <h3 style={{
            fontSize: 15,
            fontWeight: 600,
            color: '#37352F',
            margin: 0,
          }}>
            Quick questions to help me remember
          </h3>
          <p style={{ fontSize: 12, color: '#787774', margin: '2px 0 0' }}>
            Optional — answer or skip these to personalize future calls
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDismissed(true);
            }}
            title="Dismiss all"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              borderRadius: 6,
              backgroundColor: 'transparent',
              border: 'none',
              color: '#787774',
              cursor: 'pointer',
              transition: 'background-color 150ms',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F7F6F3';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <X style={{ height: 14, width: 14 }} />
          </button>
          <ChevronDown
            style={{
              height: 16,
              width: 16,
              color: '#787774',
              transition: 'transform 200ms',
              transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
            }}
          />
        </div>
      </div>

      {/* Questions */}
      {!collapsed && (
        <div style={{ padding: '0 20px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {unanswered.map((q) => (
            <div
              key={q.id}
              style={{
                padding: '14px 16px',
                backgroundColor: 'rgba(105,64,165,0.03)',
                borderRadius: 8,
                border: '1px solid rgba(105,64,165,0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 12 }}>
                <Brain style={{ height: 14, width: 14, color: '#6940A5', flexShrink: 0, marginTop: 2 }} />
                <p style={{ fontSize: 14, color: '#37352F', margin: 0, lineHeight: 1.5 }}>
                  {q.question}
                </p>
              </div>

              {/* Quick answer chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                {q.quick_answers.map((answer) => (
                  <button
                    key={answer}
                    disabled={savingId === q.id}
                    onClick={() => handleAnswer(q, answer)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '6px 14px',
                      fontSize: 13,
                      fontWeight: 500,
                      color: '#6940A5',
                      backgroundColor: 'rgba(105,64,165,0.06)',
                      border: '1px solid rgba(105,64,165,0.15)',
                      borderRadius: 20,
                      cursor: savingId === q.id ? 'wait' : 'pointer',
                      transition: 'all 150ms',
                      opacity: savingId === q.id ? 0.5 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (savingId !== q.id) {
                        e.currentTarget.style.backgroundColor = 'rgba(105,64,165,0.12)';
                        e.currentTarget.style.borderColor = 'rgba(105,64,165,0.3)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(105,64,165,0.06)';
                      e.currentTarget.style.borderColor = 'rgba(105,64,165,0.15)';
                    }}
                  >
                    {savingId === q.id ? (
                      <Loader2 style={{ height: 12, width: 12, animation: 'spin 1s linear infinite' }} />
                    ) : null}
                    {answer}
                  </button>
                ))}
              </div>

              {/* Custom input for longer answers */}
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  placeholder="Or type your answer..."
                  value={customInputs[q.id] || ''}
                  onChange={(e) =>
                    setCustomInputs((prev) => ({ ...prev, [q.id]: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (customInputs[q.id] || '').trim()) {
                      handleAnswer(q, customInputs[q.id].trim());
                    }
                  }}
                  disabled={savingId === q.id}
                  style={{
                    flex: 1,
                    height: 32,
                    padding: '0 10px',
                    fontSize: 13,
                    color: '#37352F',
                    background: '#FFFFFF',
                    border: '1px solid #E3E2DE',
                    borderRadius: 6,
                    outline: 'none',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#6940A5';
                    e.currentTarget.style.boxShadow = '0 0 0 2px rgba(105,64,165,0.15)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#E3E2DE';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                {(customInputs[q.id] || '').trim() && (
                  <button
                    onClick={() => handleAnswer(q, customInputs[q.id].trim())}
                    disabled={savingId === q.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: 32,
                      padding: '0 10px',
                      fontSize: 12,
                      fontWeight: 500,
                      color: '#FFFFFF',
                      backgroundColor: '#6940A5',
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                      gap: 4,
                    }}
                  >
                    <Check style={{ height: 12, width: 12 }} />
                    Save
                  </button>
                )}
                <button
                  onClick={() => handleSkip(q.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: 32,
                    padding: '0 10px',
                    fontSize: 12,
                    color: '#787774',
                    backgroundColor: 'transparent',
                    border: '1px solid #E3E2DE',
                    borderRadius: 6,
                    cursor: 'pointer',
                    transition: 'background-color 150ms',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F7F6F3';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  Skip
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
