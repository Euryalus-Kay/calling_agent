import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';
import { SUMMARY_SYSTEM_PROMPT } from '@/lib/ai/prompts';

const anthropic = new Anthropic();

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!taskId || typeof taskId !== 'string') {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
    }

    // Fetch task
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .eq('user_id', user.id)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Return existing summary if available
    if (task.summary) {
      return NextResponse.json({ summary: task.summary });
    }

    // Fetch all calls for this task
    const { data: calls, error: callsError } = await supabase
      .from('calls')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at');

    if (callsError) {
      console.error('[Summary] Failed to fetch calls:', callsError);
      return NextResponse.json(
        { error: 'Failed to load call data' },
        { status: 500 }
      );
    }

    if (!calls || calls.length === 0) {
      return NextResponse.json({ summary: 'No calls were made for this task.' });
    }

    // Check if all calls are done before generating summary
    const activeStatuses = ['queued', 'initiating', 'ringing', 'in_progress', 'on_hold', 'navigating_menu', 'transferred', 'voicemail', 'retrying'];
    const hasActiveCalls = calls.some((c) => activeStatuses.includes(c.status));
    if (hasActiveCalls) {
      return NextResponse.json(
        { error: 'Some calls are still in progress. Summary will be generated when all calls complete.' },
        { status: 409 }
      );
    }

    // Fetch transcripts for all calls to give the summary model full context
    const admin = createSupabaseAdminClient();
    const callIds = calls.map((c) => c.id);
    const { data: transcripts } = await admin
      .from('call_transcripts')
      .select('call_id, speaker, content, event_type')
      .in('call_id', callIds)
      .order('created_at', { ascending: true });

    // Build transcript text grouped by call
    const transcriptsByCall: Record<string, string[]> = {};
    if (transcripts) {
      for (const t of transcripts as { call_id: string; speaker: string; content: string; event_type: string | null }[]) {
        if (!transcriptsByCall[t.call_id]) transcriptsByCall[t.call_id] = [];
        if (t.event_type === 'speech' || t.event_type === 'answer_captured' || !t.event_type) {
          const label = t.speaker === 'agent' ? 'AI' : t.speaker === 'human' ? 'Them' : 'System';
          transcriptsByCall[t.call_id].push(`${label}: ${t.content}`);
        }
      }
    }

    // Build call results text
    const callResults = calls
      .map((call, i) => {
        const status = call.status === 'completed' ? 'Successful' : call.status;
        const retryInfo = (call.retry_count ?? 0) > 0 ? ` (took ${(call.retry_count ?? 0) + 1} attempts)` : '';
        return `Call ${i + 1}: ${call.business_name} (${call.phone_number})${retryInfo}
Status: ${status}
Purpose: ${call.purpose}
Result: ${call.result_summary || 'No result available'}
${call.error ? `Error: ${call.error}` : ''}
${call.duration_seconds ? `Duration: ${Math.floor(call.duration_seconds / 60)}m ${call.duration_seconds % 60}s` : ''}`;
      })
      .join('\n\n---\n\n');

    // Build full transcript data
    const transcriptData = calls
      .map((call, i) => {
        const lines = transcriptsByCall[call.id];
        if (!lines || lines.length === 0) return `Call ${i + 1} (${call.business_name}): No transcript available`;
        return `Call ${i + 1} (${call.business_name}):\n${lines.join('\n')}`;
      })
      .join('\n\n---\n\n');

    // Smart web search: only search for businesses/organizations, not personal contacts
    let webContext = '';
    try {
      const braveKey = process.env.BRAVE_SEARCH_API_KEY;
      if (braveKey) {
        // Filter to likely businesses (skip personal names / contacts)
        const personalIndicators = ['mom', 'dad', 'wife', 'husband', 'friend', 'brother', 'sister'];
        const uniqueBusinesses = [...new Set(
          calls
            .filter((c) => {
              const name = (c.business_name || '').toLowerCase();
              const purpose = (c.purpose || '').toLowerCase();
              // Skip if the name looks like a personal contact
              if (personalIndicators.some((p) => name.includes(p))) return false;
              // Skip if purpose is clearly personal (message, tell them, etc.)
              if (['tell them', 'let them know', 'pass along', 'message from'].some((p) => purpose.includes(p))) return false;
              return true;
            })
            .map((c) => c.business_name)
            .filter(Boolean)
        )];

        if (uniqueBusinesses.length > 0) {
          const searchResults = await Promise.allSettled(
            uniqueBusinesses.slice(0, 3).map(async (biz: string) => {
              const query = `${biz} address hours website`;
              const res = await fetch(
                `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=3`,
                { headers: { 'X-Subscription-Token': braveKey, Accept: 'application/json' } }
              );
              if (!res.ok) return null;
              const data = await res.json();
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const snippets = (data.web?.results || []).slice(0, 3).map((r: any) =>
                `${r.title}: ${r.description}${r.url ? ` (${r.url})` : ''}`
              );
              return snippets.length > 0 ? `${biz}:\n${snippets.join('\n')}` : null;
            })
          );
          const validResults = searchResults
            .filter((r): r is PromiseFulfilledResult<string | null> => r.status === 'fulfilled' && !!r.value)
            .map((r) => r.value);
          if (validResults.length > 0) {
            webContext = `WEB SEARCH CONTEXT (use to enrich summary with addresses, links, hours, etc.):\n${validResults.join('\n\n')}`;
          }
        }
      }
    } catch (err) {
      console.log('[Summary] Web search failed (non-critical):', err);
    }

    const systemPrompt = SUMMARY_SYSTEM_PROMPT
      .replace('{{ORIGINAL_REQUEST}}', task.input_text)
      .replace('{{CALL_RESULTS}}', callResults)
      .replace('{{TRANSCRIPT_DATA}}', transcriptData)
      .replace('{{WEB_CONTEXT}}', webContext);

    // Generate summary with Claude Opus 4
    let summary: string;
    try {
      const response = await anthropic.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 2048,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: 'Synthesize a thorough, conversational summary of everything that happened and was learned from these calls. Include all specific details. If web search context is available, weave in useful details like addresses and links naturally.',
          },
        ],
      });

      summary =
        response.content[0].type === 'text'
          ? response.content[0].text
          : 'Unable to generate summary.';
    } catch (err) {
      console.error('[Summary] Claude API failed:', err);
      // Fallback: generate a basic summary from call data
      const successfulCalls = calls.filter((c) => c.status === 'completed');
      const failedCalls = calls.filter((c) => c.status === 'failed' || c.status === 'no_answer' || c.status === 'busy');
      summary = `Completed ${successfulCalls.length} of ${calls.length} calls.${
        failedCalls.length > 0 ? ` ${failedCalls.length} call(s) were unsuccessful.` : ''
      }${
        successfulCalls.map((c) => c.result_summary).filter(Boolean).length > 0
          ? '\n\n' + successfulCalls.map((c) => `${c.business_name}: ${c.result_summary}`).join('\n')
          : ''
      }`;
    }

    // Save summary to task
    const { error: updateError } = await supabase
      .from('tasks')
      .update({ summary, status: 'completed' })
      .eq('id', taskId);

    if (updateError) {
      console.error('[Summary] Failed to save summary:', updateError);
    }

    return NextResponse.json({ summary });
  } catch (err) {
    console.error('[Summary] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Failed to generate summary. Please try again.' },
      { status: 500 }
    );
  }
}
