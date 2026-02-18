import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

const FOLLOWUP_PROMPT = `You are analyzing a completed phone call task to see if there are any follow-up questions worth asking the USER (the person who asked the AI to make the calls — NOT the person called).

The goal: learn things about the user that will make FUTURE calls smarter and more personalized. Only ask if there's something genuinely useful to remember.

USER PROFILE:
{{USER_PROFILE}}

EXISTING MEMORIES:
{{USER_MEMORIES}}

ORIGINAL REQUEST: {{ORIGINAL_REQUEST}}

CALL RESULTS:
{{CALL_RESULTS}}

TRANSCRIPT:
{{TRANSCRIPT}}

RULES:
- Ask 0-3 questions MAX. If nothing useful to learn, return empty array.
- Questions should be QUICK to answer (yes/no, a name, a preference). Not essays.
- Focus on things that would actually help on future calls:
  - Regular providers: "Is Dr. Smith your regular dentist, or were you just trying them out?"
  - Preferences: "Do you usually prefer morning or afternoon appointments?"
  - Facts: "Is that your home pharmacy or a one-time visit?"
  - Relationships: "Is Sarah a coworker or a friend?"
- DON'T ask about things already in the profile or memories.
- DON'T ask obvious things or things that don't matter for future calls.
- DON'T ask what the user thought of the call quality.
- Each question should have a clear "memory_key" (what fact to store) and "category".

Respond with JSON only:
{
  "questions": [
    {
      "id": "unique_short_id",
      "question": "the question to ask",
      "memory_key": "what to remember (e.g., 'preferred dentist')",
      "category": "preference|fact|medical|financial|contact|general",
      "quick_answers": ["Yes", "No"] or ["Morning", "Afternoon", "No preference"] — 2-4 short options for quick tap
    }
  ]
}

If nothing worth asking: {"questions": []}`;

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

    // Fetch task
    const { data: task } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .eq('user_id', user.id)
      .single();

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Fetch calls
    const { data: calls } = await supabase
      .from('calls')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at');

    if (!calls || calls.length === 0) {
      return NextResponse.json({ questions: [] });
    }

    // Fetch user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // Fetch existing memories
    const admin = createSupabaseAdminClient();
    const { data: memories } = await admin
      .from('user_memory')
      .select('key, value, category')
      .eq('user_id', user.id)
      .limit(50);

    // Fetch transcripts
    const callIds = calls.map((c) => c.id);
    const { data: transcripts } = await admin
      .from('transcript_entries')
      .select('call_id, speaker, content, event_type')
      .in('call_id', callIds)
      .order('created_at', { ascending: true });

    // Build transcript text
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

    const callResultsText = calls
      .map((call, i) => {
        const transcript = transcriptsByCall[call.id]?.join('\n') || 'No transcript';
        return `Call ${i + 1}: ${call.business_name} (${call.phone_number})
Status: ${call.status}
Purpose: ${call.purpose}
Result: ${call.result_summary || 'No result'}`;
      })
      .join('\n\n');

    const fullTranscript = calls
      .map((call, i) => {
        const lines = transcriptsByCall[call.id];
        if (!lines || lines.length === 0) return `Call ${i + 1} (${call.business_name}): No transcript`;
        return `Call ${i + 1} (${call.business_name}):\n${lines.join('\n')}`;
      })
      .join('\n\n---\n\n');

    const memoryText = memories && memories.length > 0
      ? memories.map((m: { key: string; value: string }) => `- ${m.key}: ${m.value}`).join('\n')
      : 'None stored yet.';

    const prompt = FOLLOWUP_PROMPT
      .replace('{{USER_PROFILE}}', JSON.stringify(profile || {}, null, 2))
      .replace('{{USER_MEMORIES}}', memoryText)
      .replace('{{ORIGINAL_REQUEST}}', task.input_text)
      .replace('{{CALL_RESULTS}}', callResultsText)
      .replace('{{TRANSCRIPT}}', fullTranscript);

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: prompt,
      messages: [{ role: 'user', content: 'Generate follow-up questions if any would help build useful memories.' }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return NextResponse.json({ questions: [] });
      }
      const result = JSON.parse(jsonMatch[0]);
      return NextResponse.json({ questions: result.questions || [] });
    } catch {
      return NextResponse.json({ questions: [] });
    }
  } catch (err) {
    console.error('[FollowupQuestions] Error:', err);
    return NextResponse.json({ questions: [] });
  }
}
