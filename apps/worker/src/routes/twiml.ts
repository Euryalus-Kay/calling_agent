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

/** Build a dynamic opening greeting based on who we're calling and why */
function buildGreeting(callId: string | undefined): string {
  if (!callId) return 'Hello, this is an AI assistant calling.';

  const session = sessionStore.get(callId);
  if (!session) return 'Hello, this is an AI assistant calling.';

  const profile = session.userProfile as Record<string, unknown>;
  const userName = String(profile?.full_name || '').trim();
  const businessName = session.businessName || '';
  const purpose = session.purpose || '';

  // Determine scenario: business vs personal contact
  const purposeLower = purpose.toLowerCase();
  const nameLower = businessName.toLowerCase();
  const isPersonal =
    purposeLower.includes('friend') ||
    purposeLower.includes('tell them') ||
    purposeLower.includes('let them know') ||
    purposeLower.includes('pass along') ||
    purposeLower.includes('message') ||
    nameLower.includes('mom') ||
    nameLower.includes('dad') ||
    nameLower.includes('wife') ||
    nameLower.includes('husband');

  // Build a short, natural purpose snippet for the greeting
  const shortPurpose = purpose.length > 80 ? purpose.slice(0, 77) + '...' : purpose;

  if (isPersonal && userName) {
    return `Hey there, this is an AI assistant calling on behalf of ${userName}. I'm reaching out about ${shortPurpose}.`;
  }

  if (userName) {
    return `Hi there, I'm an AI assistant calling on behalf of ${userName} regarding ${shortPurpose}.`;
  }

  return `Hi there, I'm an AI assistant calling about ${shortPurpose}.`;
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
      voice="JBFqnCBsd6RMkjVDRZzb"
      ttsModel="eleven_turbo_v2_5"
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
