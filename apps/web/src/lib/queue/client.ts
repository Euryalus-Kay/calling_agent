import { Queue } from 'bullmq';
import { getRedisConnection } from './connection';

const QUEUE_NAME = 'call-processing';

export const callQueue = new Queue(QUEUE_NAME, {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
});
