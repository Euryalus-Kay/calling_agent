import type { FastifyInstance } from 'fastify';
import { config } from '../config.js';
import { smsQueue } from '../worker/sms-worker.js';

interface EnqueueSMSBody {
  callId: string;
  taskId: string;
  userId: string;
  businessName: string;
  phoneNumber: string;
  smsBody: string;
  callerIdNumber?: string;
}

export async function smsRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: EnqueueSMSBody }>('/enqueue-sms', async (request, reply) => {
    // Verify auth
    const authHeader = request.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${config.SUPABASE_SERVICE_ROLE_KEY}`) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const { callId, taskId, userId, businessName, phoneNumber, smsBody, callerIdNumber } = request.body;

    if (!callId || !phoneNumber || !smsBody) {
      return reply.code(400).send({ error: 'Missing required fields: callId, phoneNumber, smsBody' });
    }

    try {
      await smsQueue.add(
        `sms-${callId}`,
        {
          callId,
          taskId,
          userId,
          businessName,
          phoneNumber,
          smsBody,
          callerIdNumber,
        },
        {
          attempts: 2,
          backoff: { type: 'exponential', delay: 3000 },
        }
      );

      fastify.log.info(`[SMS] Enqueued SMS job for ${callId} to ${phoneNumber}`);
      return reply.send({ success: true, callId });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      fastify.log.error(`[SMS] Failed to enqueue: ${errorMessage}`);
      return reply.code(500).send({ error: `Failed to enqueue SMS: ${errorMessage}` });
    }
  });
}
