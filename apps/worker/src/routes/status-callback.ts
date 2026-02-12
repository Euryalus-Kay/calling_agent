import type { FastifyInstance } from 'fastify';
import { supabaseAdmin } from '../services/supabase.js';

const STATUS_MAP: Record<string, string> = {
  initiated: 'initiating',
  ringing: 'ringing',
  'in-progress': 'in_progress',
  completed: 'completed',
  busy: 'busy',
  'no-answer': 'no_answer',
  failed: 'failed',
  canceled: 'failed',
};

export async function statusCallbackRoute(fastify: FastifyInstance) {
  fastify.post('/status-callback', async (request, reply) => {
    const body = request.body as Record<string, string>;
    const callSid = body.CallSid;
    const callStatus = body.CallStatus;
    const duration = body.CallDuration;

    if (!callSid) {
      return reply.status(400).send('Missing CallSid');
    }

    const ourStatus = STATUS_MAP[callStatus] || callStatus;

    const updateData: Record<string, unknown> = { status: ourStatus };
    if (duration) {
      updateData.duration_seconds = parseInt(duration, 10);
    }
    if (
      ['completed', 'busy', 'no-answer', 'failed', 'canceled'].includes(
        callStatus
      )
    ) {
      updateData.ended_at = new Date().toISOString();
    }

    await supabaseAdmin
      .from('calls')
      .update(updateData)
      .eq('twilio_call_sid', callSid);

    fastify.log.info(`Status callback: ${callSid} -> ${callStatus}`);

    reply.status(200).send('OK');
  });
}
