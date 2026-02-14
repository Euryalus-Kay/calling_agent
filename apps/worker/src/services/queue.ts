import { Queue } from 'bullmq';
import { config } from '../config.js';

export const callQueue = new Queue('call-processing', {
  connection: {
    url: config.REDIS_URL,
    maxRetriesPerRequest: null,
  },
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
});
