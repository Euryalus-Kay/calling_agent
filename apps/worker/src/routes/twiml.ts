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
 * Build a short, natural greeting that starts immediately on pickup.
 * Keep it concise: identify as AI, say who sent us, state what we need.
 * Never use raw business_name if it's generic (e.g. "Personal Contact").
 */
function buildGreeting(callId: string | undefined): string {
  if (!callId) return 'Hi, this is an AI assistant. Do you have a moment?';

  const session = sessionStore.get(callId);
  if (!session) return 'Hi, this is an AI assistant. Do you have a moment?';

  const profile = session.userProfile as Record<string, unknown>;
  const userName = String(profile?.full_name || '').trim();
  const purpose = session.purpose || '';

  // Extract a clean, short purpose — take the core action, skip filler
  const shortPurpose = cleanPurpose(purpose);

  if (userName && shortPurpose) {
    return `Hi, this is an AI agent calling on behalf of ${userName}. ${shortPurpose}`;
  }

  if (userName) {
    return `Hi, this is an AI agent calling on behalf of ${userName}. Do you have a moment?`;
  }

  if (shortPurpose) {
    return `Hi, this is an AI agent. ${shortPurpose}`;
  }

  return 'Hi, this is an AI agent. Do you have a moment?';
}

/**
 * Clean up the raw purpose string into a short, natural sentence.
 * Strips filler like "Call on behalf of X and...", keeps the core ask.
 */
function cleanPurpose(raw: string): string {
  if (!raw) return '';

  // Remove common filler patterns from AI planner output
  let cleaned = raw
    // "Call on behalf of X and ask ..." → "ask ..."
    .replace(/^call\s+(on behalf of\s+\w+\s+and\s+)?/i, '')
    // "ask how their day was — have a friendly, casual c..." → "ask how their day was"
    .replace(/\s*[—–-]\s+have\s+a\s+.*/i, '')
    // Remove trailing ellipsis from truncation
    .replace(/\.{2,}$/, '')
    .trim();

  // Capitalize first letter
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  // If it doesn't end with a question mark or period, add a period
  if (cleaned && !/[.?!]$/.test(cleaned)) {
    cleaned += '.';
  }

  // Cap at ~60 chars for spoken clarity
  if (cleaned.length > 60) {
    const cut = cleaned.lastIndexOf(' ', 57);
    cleaned = cleaned.slice(0, cut > 20 ? cut : 57) + '.';
  }

  return cleaned;
}

export async function twimlRoute(fastify: FastifyInstance) {
  fastify.all('/twiml', async (request, reply) => {
    const { callId } = request.query as { callId?: string };
    const wsUrl = `wss://${config.WS_DOMAIN}/ws?callId=${callId || ''}`;
    const greeting = escapeXml(buildGreeting(callId));

    // ConversationRelay TwiML connects the call to our WebSocket
    // ElevenLabs for TTS, Deepgram for STT
    // welcomeGreeting speaks automatically as soon as the call connects — no waiting for the person to speak
    // Removed <Pause> as it was causing dead air before the greeting played, making the person say "Hello?" first
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
