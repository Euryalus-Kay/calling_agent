import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getActiveConversation } from './websocket.js';
import { supabaseAdmin } from '../services/supabase.js';
import { config } from '../config.js';
import twilio from 'twilio';

const twilioClient = twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);

export async function callControlRoute(fastify: FastifyInstance) {
  // Middleware: auth check
  function checkAuth(request: FastifyRequest, reply: FastifyReply) {
    const authHeader = request.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${config.SUPABASE_SERVICE_ROLE_KEY}`) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
  }

  // POST /call-respond - User responds to a NEED_INFO question during a live call
  fastify.post('/call-respond', async (request: FastifyRequest, reply: FastifyReply) => {
    checkAuth(request, reply);
    if (reply.sent) return;

    const { callId, response } = request.body as { callId: string; response: string };
    if (!callId || !response) {
      return reply.status(400).send({ error: 'callId and response are required' });
    }

    const active = getActiveConversation(callId);
    if (!active) {
      return reply.status(404).send({ error: 'Call is not active' });
    }

    // Inject the user's response into the conversation
    active.conversation.injectSystemMessage(response);

    // Log it
    await supabaseAdmin.from('transcript_entries').insert({
      call_id: callId,
      speaker: 'system',
      content: `User provided info: ${response}`,
      event_type: 'user_response',
    });

    // Update status
    await supabaseAdmin
      .from('calls')
      .update({ status_detail: 'Received info from user, continuing...' })
      .eq('id', callId);

    return reply.send({ success: true });
  });

  // POST /call-hangup - User requests to end an active call
  fastify.post('/call-hangup', async (request: FastifyRequest, reply: FastifyReply) => {
    checkAuth(request, reply);
    if (reply.sent) return;

    const { callId } = request.body as { callId: string };
    if (!callId) {
      return reply.status(400).send({ error: 'callId is required' });
    }

    // Get the Twilio call SID from the database
    const { data: call } = await supabaseAdmin
      .from('calls')
      .select('twilio_call_sid')
      .eq('id', callId)
      .single();

    if (!call?.twilio_call_sid) {
      return reply.status(404).send({ error: 'Call not found or no Twilio SID' });
    }

    try {
      // Tell Twilio to end the call
      await twilioClient.calls(call.twilio_call_sid).update({ status: 'completed' });

      await supabaseAdmin
        .from('calls')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString(),
          status_detail: 'Ended by user',
          result_summary: 'Call was ended by the user.',
        })
        .eq('id', callId);

      return reply.send({ success: true });
    } catch (err) {
      fastify.log.error(`Failed to hangup call ${callId}: ${err}`);
      return reply.status(500).send({ error: 'Failed to end call' });
    }
  });
}
