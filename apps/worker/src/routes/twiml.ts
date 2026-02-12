import type { FastifyInstance } from 'fastify';
import { config } from '../config.js';

export async function twimlRoute(fastify: FastifyInstance) {
  fastify.all('/twiml', async (request, reply) => {
    const { callId } = request.query as { callId?: string };
    const wsUrl = `wss://${config.WS_DOMAIN}/ws?callId=${callId || ''}`;

    // ConversationRelay TwiML connects the call to our WebSocket
    // ElevenLabs for TTS, Deepgram for STT
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <ConversationRelay
      url="${wsUrl}"
      ttsProvider="ElevenLabs"
      voice="cgSgspJ2msm6clMCkdW9"
      transcriptionProvider="Deepgram"
      speechModel="nova-3-general"
      welcomeGreeting="Hello, I'm an AI assistant calling on behalf of a customer. I have a few questions if you have a moment."
      interruptible="true"
      interruptByDtmf="true"
    />
  </Connect>
</Response>`;

    reply.type('text/xml').send(twiml);
  });
}
