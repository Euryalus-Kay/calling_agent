import { Worker, type Job } from 'bullmq';
import { initiateCall, releaseNumber } from '../services/call-manager.js';
import { sessionStore, type CallSessionData } from '../services/session-store.js';
import { supabaseAdmin } from '../services/supabase.js';
import { config } from '../config.js';

const QUEUE_NAME = 'call-processing';

interface CallJobData {
  callId: string;
  taskId: string;
  userId: string;
  businessName: string;
  phoneNumber: string;
  purpose: string;
  questions: string[];
  context: string;
  userProfile: Record<string, unknown>;
  retryCount?: number;
  previousAttemptNotes?: string;
  callerIdNumber?: string;
  accountTier?: 'free' | 'pro' | 'unlimited';
}

let worker: Worker<CallJobData> | null = null;

export function startWorker() {
  const connection = {
    url: config.REDIS_URL,
    maxRetriesPerRequest: null as null,
  };

  worker = new Worker<CallJobData>(
    QUEUE_NAME,
    async (job: Job<CallJobData>) => {
      const {
        callId,
        taskId,
        userId,
        phoneNumber,
        businessName,
        purpose,
        questions,
        context,
        userProfile,
        retryCount = 0,
        previousAttemptNotes,
        callerIdNumber,
        accountTier,
      } = job.data;

      console.log(
        `[Worker] Processing call ${callId} to ${businessName} at ${phoneNumber}${retryCount > 0 ? ` (retry ${retryCount})` : ''}`
      );

      // For retries, fetch the phone number from the existing call record
      let actualPhoneNumber = phoneNumber;
      if (!actualPhoneNumber) {
        const { data: existingCall } = await supabaseAdmin
          .from('calls')
          .select('phone_number')
          .eq('id', callId)
          .single();
        if (existingCall) {
          actualPhoneNumber = existingCall.phone_number;
        }
      }

      if (!actualPhoneNumber) {
        throw new Error('No phone number available for call');
      }

      // Store call data for the WebSocket handler
      const sessionData: CallSessionData = {
        businessName,
        purpose,
        questions,
        context,
        userProfile,
        taskId,
        userId,
        retryCount,
        previousAttemptNotes,
        callerIdNumber,
        accountTier,
      };
      sessionStore.set(callId, sessionData);

      // Update status to initiating
      await supabaseAdmin
        .from('calls')
        .update({
          status: 'initiating',
          status_detail: retryCount > 0 ? `Retry attempt ${retryCount}` : null,
          retry_count: retryCount,
        })
        .eq('id', callId);

      console.log(`[Worker] Call ${callId}: callerIdNumber=${JSON.stringify(callerIdNumber)}, type=${typeof callerIdNumber}, dialing ${actualPhoneNumber}`);

      try {
        const callSid = await initiateCall(callId, actualPhoneNumber, callerIdNumber);

        await supabaseAdmin
          .from('calls')
          .update({
            twilio_call_sid: callSid,
            status: 'ringing',
            status_detail: null,
          })
          .eq('id', callId);

        console.log(
          `[Worker] Call ${callId} initiated with SID ${callSid}`
        );

        return { callSid };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';

        // If it's a retryable error and we haven't exhausted retries, mark for retry
        if (retryCount < 2 && isRetryableError(errorMsg)) {
          await supabaseAdmin
            .from('calls')
            .update({
              status: 'retrying',
              status_detail: `Failed: ${errorMsg}. Retrying in a few seconds...`,
              retry_count: retryCount,
            })
            .eq('id', callId);
        } else {
          await supabaseAdmin
            .from('calls')
            .update({
              status: 'failed',
              error: errorMsg,
              ended_at: new Date().toISOString(),
              status_detail: null,
            })
            .eq('id', callId);
        }

        sessionStore.delete(callId);
        releaseNumber(callId);
        throw error;
      }
    },
    {
      connection,
      concurrency: 10,
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
    }
  );

  worker.on('completed', (job) => {
    console.log(`[Worker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('[Worker] Error:', err.message);
  });

  console.log('[Worker] BullMQ call worker started');
}

function isRetryableError(msg: string): boolean {
  const retryable = ['ECONNREFUSED', 'timeout', 'rate limit', 'temporarily', '503', '429'];
  return retryable.some(keyword => msg.toLowerCase().includes(keyword.toLowerCase()));
}
