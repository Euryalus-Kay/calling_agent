import { type FastifyInstance } from 'fastify';
import { Queue } from 'bullmq';
import { config } from '../config.js';

const QUEUE_NAME = 'call-processing';

let callQueue: Queue | null = null;

function getQueue(): Queue {
  if (!callQueue) {
    callQueue = new Queue(QUEUE_NAME, {
      connection: {
        url: config.REDIS_URL,
        maxRetriesPerRequest: null as null,
      },
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
      },
    });
  }
  return callQueue;
}

interface EnqueueCallBody {
  callId: string;
  taskId: string;
  userId: string;
  businessName: string;
  phoneNumber: string;
  purpose: string;
  questions: string[];
  context: string;
  userProfile: Record<string, unknown>;
}

export async function enqueueCallRoute(fastify: FastifyInstance) {
  fastify.post<{ Body: EnqueueCallBody }>('/enqueue-call', async (request, reply) => {
    const authHeader = request.headers.authorization;
    const expectedToken = config.SUPABASE_SERVICE_ROLE_KEY;

    // Simple auth: require the service role key as a bearer token
    if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const {
      callId,
      taskId,
      userId,
      businessName,
      phoneNumber,
      purpose,
      questions,
      context,
      userProfile,
    } = request.body;

    if (!callId || !taskId || !phoneNumber) {
      return reply.status(400).send({ error: 'Missing required fields' });
    }

    try {
      const queue = getQueue();
      await queue.add('make-call', {
        callId,
        taskId,
        userId,
        businessName,
        phoneNumber,
        purpose,
        questions,
        context,
        userProfile,
      });

      return reply.send({ success: true, callId });
    } catch (err) {
      console.error('[EnqueueCall] Failed to enqueue:', err);
      return reply.status(500).send({ error: 'Failed to enqueue call' });
    }
  });
}
