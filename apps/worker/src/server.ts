import Fastify from 'fastify';
import fastifyWs from '@fastify/websocket';
import fastifyFormbody from '@fastify/formbody';
import { twimlRoute } from './routes/twiml.js';
import { websocketRoute } from './routes/websocket.js';
import { statusCallbackRoute } from './routes/status-callback.js';
import { enqueueCallRoute } from './routes/enqueue-call.js';
import { smsRoutes } from './routes/sms.js';
import { startWorker } from './worker/call-worker.js';
import { startSMSWorker } from './worker/sms-worker.js';
import { config } from './config.js';

const fastify = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
    },
  },
});

// Register plugins
fastify.register(fastifyWs);
fastify.register(fastifyFormbody);

// Register routes
fastify.register(twimlRoute);
fastify.register(websocketRoute);
fastify.register(statusCallbackRoute);
fastify.register(enqueueCallRoute);
fastify.register(smsRoutes);

// Health check
fastify.get('/health', async () => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
}));

async function start() {
  try {
    await fastify.listen({ port: config.PORT, host: '0.0.0.0' });
    console.log(`Server listening on port ${config.PORT}`);

    // Start the BullMQ workers in the same process
    startWorker();
    startSMSWorker();
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
