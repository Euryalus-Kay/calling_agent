import type { FastifyInstance } from 'fastify';
import { config } from '../config.js';
import { sessionStore } from '../services/session-store.js';

/** Escape XML special characters for safe TwiML embedding */
function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Build a short, natural greeting.
 * Format: "Hi, this is an AI agent calling on behalf of [user]. [user] was wondering [purpose]."
 * The purpose is rewritten so the user's name is the subject, not "ask" or "call".
 */
function buildGreeting(callId: string | undefined): string {
  if (!callId) return 'Hi, this is an AI agent. Do you have a moment?';

  const session = sessionStore.get(callId);
  if (!session) return 'Hi, this is an AI agent. Do you have a moment?';

  const profile = session.userProfile as Record<string, unknown>;
  const userName = String(profile?.full_name || '').trim();
  const purpose = session.purpose || '';

  if (!userName) {
    return 'Hi, this is an AI agent. Do you have a moment?';
  }

  // Rewrite the purpose so the user is the subject
  const purposeLine = rewritePurpose(purpose, userName);

  if (purposeLine) {
    return `Hi, this is an AI agent calling on behalf of ${userName}. ${purposeLine}`;
  }

  return `Hi, this is an AI agent calling on behalf of ${userName}. Do you have a moment?`;
}

/**
 * Rewrite the raw planner purpose into a natural sentence with the user as subject.
 *
 * Input examples from planner:
 *   "Call on behalf of Karel and ask how their day was — have a friendly, casual conversation"
 *   "Schedule an oil change for next Saturday"
 *   "Ask about availability for a dental cleaning"
 *   "Check if they have the part in stock"
 *   "Remind them about the appointment tomorrow"
 *
 * Output examples:
 *   "Karel was wondering how your day was."
 *   "Karel wanted to schedule an oil change for next Saturday."
 *   "Karel wanted to ask about availability for a dental cleaning."
 *   "Karel wanted to check if you have the part in stock."
 *   "Karel wanted to remind you about the appointment tomorrow."
 */
function rewritePurpose(raw: string, userName: string): string {
  if (!raw) return '';

  let core = raw
    // Strip "Call on behalf of X and " prefix
    .replace(/^call\s+on\s+behalf\s+of\s+\S+\s+and\s+/i, '')
    // Strip plain "Call and " prefix
    .replace(/^call\s+and\s+/i, '')
    // Strip "Call " prefix (just "Call them about...")
    .replace(/^call\s+(them|this|the)\s+/i, '')
    // Strip trailing filler after em-dash or dash ("— have a friendly...")
    .replace(/\s*[—–]\s+have\s+a\s+.*/i, '')
    // Strip trailing ellipsis from truncation
    .replace(/\.{2,}$/, '')
    // Replace "their" with "your" (since we're talking TO the person)
    .replace(/\btheir\b/gi, 'your')
    // Replace "them" with "you" in relevant contexts
    .replace(/\bask them\b/gi, 'ask you')
    .replace(/\btell them\b/gi, 'let you know')
    .replace(/\bremind them\b/gi, 'remind you')
    .replace(/\bcheck with them\b/gi, 'check with you')
    .trim();

  if (!core) return '';

  // Determine the right connector based on how the purpose starts
  const lowerCore = core.toLowerCase();

  let sentence: string;

  if (lowerCore.startsWith('ask ') || lowerCore.startsWith('ask about ')) {
    // "ask how your day was" → "Karel wanted to ask how your day was."
    sentence = `${userName} wanted to ${core}`;
  } else if (lowerCore.startsWith('check ') || lowerCore.startsWith('find out ') || lowerCore.startsWith('see if ') || lowerCore.startsWith('see whether ')) {
    // "check if you have..." → "Karel wanted to check if you have..."
    sentence = `${userName} wanted to ${core}`;
  } else if (lowerCore.startsWith('schedule ') || lowerCore.startsWith('book ') || lowerCore.startsWith('make ') || lowerCore.startsWith('set up ') || lowerCore.startsWith('cancel ')) {
    // "schedule an oil change" → "Karel wanted to schedule an oil change."
    sentence = `${userName} wanted to ${core}`;
  } else if (lowerCore.startsWith('remind ')) {
    // "remind you about..." → "Karel wanted to remind you about..."
    sentence = `${userName} wanted to ${core}`;
  } else if (lowerCore.startsWith('how ') || lowerCore.startsWith('what ') || lowerCore.startsWith('when ') || lowerCore.startsWith('where ') || lowerCore.startsWith('do you ') || lowerCore.startsWith('are you ') || lowerCore.startsWith('is there ')) {
    // Direct question: "how your day was" → "Karel was wondering how your day was."
    sentence = `${userName} was wondering ${core}`;
  } else if (lowerCore.startsWith('get ') || lowerCore.startsWith('confirm ') || lowerCore.startsWith('verify ') || lowerCore.startsWith('follow up ') || lowerCore.startsWith('inquire ')) {
    sentence = `${userName} wanted to ${core}`;
  } else {
    // Fallback: "Karel wanted to [purpose]"
    // Lowercase first char since it follows "wanted to"
    const lowered = core.charAt(0).toLowerCase() + core.slice(1);
    sentence = `${userName} wanted to ${lowered}`;
  }

  // Clean up: ensure proper ending punctuation
  sentence = sentence.replace(/[.!?]+$/, '').trim();

  // Add question mark if it reads like a question, otherwise period
  if (/\b(wondering|how|what|when|where|do you|are you|is there)\b/i.test(sentence)) {
    // If it's clearly a question form, keep period (it's an indirect question)
    sentence += '.';
  } else {
    sentence += '.';
  }

  return sentence;
}

export async function twimlRoute(fastify: FastifyInstance) {
  fastify.all('/twiml', async (request, reply) => {
    const { callId } = request.query as { callId?: string };
    const wsUrl = `wss://${config.WS_DOMAIN}/ws?callId=${callId || ''}`;
    const greeting = escapeXml(buildGreeting(callId));

    // ConversationRelay TwiML connects the call to our WebSocket
    // ElevenLabs for TTS, Deepgram for STT
    // welcomeGreeting speaks automatically as soon as the call connects
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <ConversationRelay
      url="${wsUrl}"
      ttsProvider="ElevenLabs"
      voice="JBFqnCBsd6RMkjVDRZzb"
      transcriptionProvider="Deepgram"
      speechModel="nova-3-general"
      welcomeGreeting="${greeting}"
      interruptible="true"
      dtmfDetection="true"
    />
  </Connect>
</Response>`;

    reply.type('text/xml').send(twiml);
  });
}
