import Anthropic from '@anthropic-ai/sdk';
import { TASK_PLANNER_SYSTEM_PROMPT, MEMORY_EXTRACTION_PROMPT } from './prompts';
import type { ChatMessage, PlannerResponse } from '@/types';

const anthropic = new Anthropic();

interface PlannerInput {
  userMessage: string;
  conversationHistory: ChatMessage[];
  userProfile: Record<string, unknown>;
  userMemories: Array<{ key: string; value: string; category?: string }>;
  userContacts?: Array<{ name: string; phone_number: string | null; company: string | null; category: string }>;
}

export async function planTask({
  userMessage,
  conversationHistory,
  userProfile,
  userMemories,
  userContacts = [],
}: PlannerInput): Promise<PlannerResponse> {
  const systemPrompt = TASK_PLANNER_SYSTEM_PROMPT
    .replace(
      '{{USER_PROFILE}}',
      JSON.stringify(userProfile, null, 2)
    )
    .replace(
      '{{USER_MEMORIES}}',
      userMemories.length > 0
        ? userMemories.map((m) => `- ${m.key}: ${m.value}${m.category ? ` [${m.category}]` : ''}`).join('\n')
        : 'None stored yet.'
    )
    .replace(
      '{{USER_CONTACTS}}',
      userContacts.length > 0
        ? userContacts.map((c) => `- ${c.name}${c.company ? ` (${c.company})` : ''}: ${c.phone_number || 'no phone'}${c.category ? ` [${c.category}]` : ''}`).join('\n')
        : 'No contacts saved yet.'
    );

  const messages = [
    ...conversationHistory.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user' as const, content: userMessage },
  ];

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 4096,
    system: systemPrompt,
    messages,
  });

  const text =
    response.content[0].type === 'text' ? response.content[0].text : '';

  // Parse JSON from the response, handling potential markdown code blocks
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      status: 'needs_clarification',
      message: text,
      clarifying_questions: ['Could you provide more details about what you need?'],
    };
  }

  try {
    return JSON.parse(jsonMatch[0]) as PlannerResponse;
  } catch {
    return {
      status: 'needs_clarification',
      message: 'I had trouble understanding that. Could you rephrase what you need?',
      clarifying_questions: ['What specifically would you like me to help with?'],
    };
  }
}

interface MemoryExtractionInput {
  userProfile: Record<string, unknown>;
  userMemories: Array<{ key: string; value: string }>;
  businessName: string;
  callPurpose: string;
  transcriptSummary: string;
}

export async function extractMemories({
  userProfile,
  userMemories,
  businessName,
  callPurpose,
  transcriptSummary,
}: MemoryExtractionInput): Promise<{
  memories: Array<{ key: string; value: string; category: string }>;
  contact_update: {
    name: string;
    phone_number: string;
    company: string;
    category: string;
    notes: string;
  } | null;
}> {
  const systemPrompt = MEMORY_EXTRACTION_PROMPT
    .replace('{{USER_PROFILE}}', JSON.stringify(userProfile, null, 2))
    .replace(
      '{{USER_MEMORIES}}',
      userMemories.length > 0
        ? userMemories.map((m) => `- ${m.key}: ${m.value}`).join('\n')
        : 'None stored yet.'
    )
    .replace('{{BUSINESS_NAME}}', businessName)
    .replace('{{CALL_PURPOSE}}', callPurpose)
    .replace('{{TRANSCRIPT_SUMMARY}}', transcriptSummary);

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: 'Extract memories from this call.' }],
  });

  const text =
    response.content[0].type === 'text' ? response.content[0].text : '';

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { memories: [], contact_update: null };
    return JSON.parse(jsonMatch[0]);
  } catch {
    return { memories: [], contact_update: null };
  }
}
