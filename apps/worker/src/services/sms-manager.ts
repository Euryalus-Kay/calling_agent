import twilio from 'twilio';
import { config } from '../config.js';
import { getAvailableNumber } from './number-pool.js';

const client = twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);

interface SendSMSOptions {
  callId: string; // We reuse the call record ID for tracking
  to: string;
  body: string;
  fromNumber?: string;
}

interface SMSResult {
  sid: string;
  status: string;
  dateCreated: string;
}

/**
 * Send an SMS message via Twilio.
 */
export async function sendSMS({ callId, to, body, fromNumber }: SendSMSOptions): Promise<SMSResult> {
  const from = fromNumber || getAvailableNumber(callId);

  console.log(`[SMS] Sending to ${to} from ${from}: "${body.substring(0, 50)}..."`);

  const message = await client.messages.create({
    to,
    from,
    body,
  });

  return {
    sid: message.sid,
    status: message.status,
    dateCreated: message.dateCreated?.toISOString() || new Date().toISOString(),
  };
}
