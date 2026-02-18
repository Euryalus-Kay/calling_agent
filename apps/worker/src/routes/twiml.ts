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

/** Build a dynamic opening greeting that immediately states who we are and why we're calling */
function buildGreeting(callId: string | undefined): string {
  if (!callId) return 'Hi, this is an AI agent. Are you available to talk for a moment?';

  const session = sessionStore.get(callId);
  if (!session) return 'Hi, this is an AI agent. Are you available to talk for a moment?';

  const profile = session.userProfile as Record<string, unknown>;
  const userName = String(profile?.full_name || '').trim();
  const purpose = session.purpose || '';
  const businessName = session.businessName || '';

  // Build a concise, direct greeting — no pleasantries, immediately identify as AI,
  // state who sent us, and what we need. Then ask if they're available.
  const shortPurpose = purpose.length > 80 ? purpose.slice(0, 77) + '...' : purpose;

  if (userName && businessName) {
    return `Hi, is this ${businessName}? This is an AI agent calling on behalf of ${userName}. ${userName} wanted to ask about ${shortPurpose}. Are you available to help with that?`;
  }

  if (userName) {
    return `Hi, this is an AI agent calling on behalf of ${userName}. ${userName} wanted to ask about ${shortPurpose}. Are you available to help with that?`;
  }

  return `Hi, this is an AI agent calling about ${shortPurpose}. Are you available to help with that?`;
}

export async function twimlRoute(fastify: FastifyInstance) {
  fastify.all('/twiml', async (request, reply) => {
    const { callId } = request.query as { callId?: string };
    const wsUrl = `wss://${config.WS_DOMAIN}/ws?callId=${callId || ''}`;
    const greeting = escapeXml(buildGreeting(callId));

    // ConversationRelay TwiML connects the call to our WebSocket
    // ElevenLabs for TTS, Deepgram for STT
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <ConversationRelay
      url="${wsUrl}"
      ttsProvider="ElevenLabs"
      voice="onwK4e9ZLuTAKqWW03F9-turbo_v2_5-1.0_0.45_0.75"
      transcriptionProvider="Deepgram"
      speechModel="nova-3-general"
      welcomeGreeting="${greeting}"
      interruptible="true"
      interruptByDtmf="true"
      dtmfDetection="true"
    />
  </Connect>
</Response>`;

    reply.type('text/xml').send(twiml);
  });
}
