import { Worker, Queue } from 'bullmq';
import { config } from '../config.js';
import { supabaseAdmin } from '../services/supabase.js';
import { sendSMS } from '../services/sms-manager.js';
import { releaseNumber } from '../services/number-pool.js';

interface SMSJobData {
  callId: string;
  taskId: string;
  userId: string;
  businessName: string;
  phoneNumber: string;
  smsBody: string;
  callerIdNumber?: string;
}

const connection = {
  url: config.REDIS_URL,
  maxRetriesPerRequest: null as null,
};

export const smsQueue = new Queue('sms-processing', { connection });

export function startSMSWorker() {
  const worker = new Worker<SMSJobData>(
    'sms-processing',
    async (job) => {
      const { callId, taskId, userId, businessName, phoneNumber, smsBody, callerIdNumber } = job.data;

      console.log(`[SMS Worker] Processing SMS job ${callId} to ${phoneNumber}`);

      try {
        // Update status to initiating
        await supabaseAdmin
          .from('calls')
          .update({ status: 'initiating', started_at: new Date().toISOString() })
          .eq('id', callId);

        // Send the SMS
        const result = await sendSMS({
          callId,
          to: phoneNumber,
          body: smsBody,
          fromNumber: callerIdNumber,
        });

        // Mark as completed
        await supabaseAdmin
          .from('calls')
          .update({
            status: 'completed',
            twilio_call_sid: result.sid,
            ended_at: new Date().toISOString(),
            duration_seconds: 0,
            result_summary: `SMS sent to ${businessName}: "${smsBody.substring(0, 100)}${smsBody.length > 100 ? '...' : ''}"`,
            status_detail: `Message ${result.status}`,
          })
          .eq('id', callId);

        console.log(`[SMS Worker] SMS ${callId} sent successfully (SID: ${result.sid})`);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`[SMS Worker] Failed to send SMS ${callId}:`, errorMessage);

        await supabaseAdmin
          .from('calls')
          .update({
            status: 'failed',
            error: errorMessage,
            ended_at: new Date().toISOString(),
            status_detail: 'SMS delivery failed',
          })
          .eq('id', callId);
      } finally {
        releaseNumber(callId);
      }
    },
    {
      connection,
      concurrency: 10,
    }
  );

  worker.on('completed', (job) => {
    console.log(`[SMS Worker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[SMS Worker] Job ${job?.id} failed:`, err.message);
  });

  console.log('[SMS Worker] Started and listening for SMS jobs');
  return worker;
}
