import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { config } from '../config.js';

const connection = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const callQueue = new Queue('call-processing', {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
});
