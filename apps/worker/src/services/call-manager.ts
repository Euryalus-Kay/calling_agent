import twilio from 'twilio';
import { config } from '../config.js';
import { getAvailableNumber, releaseNumber } from './number-pool.js';

const client = twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);

export async function initiateCall(
  callId: string,
  toNumber: string,
  fromNumber?: string
): Promise<string> {
  const twimlUrl = `https://${config.WS_DOMAIN}/twiml?callId=${encodeURIComponent(callId)}`;
  const statusCallbackUrl = `https://${config.WS_DOMAIN}/status-callback`;

  // Use provided caller ID (verified user number), or get one from the pool
  const from = fromNumber || getAvailableNumber(callId);

  const call = await client.calls.create({
    from,
    to: toNumber,
    url: twimlUrl,
    statusCallback: statusCallbackUrl,
    statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
    statusCallbackMethod: 'POST',
    machineDetection: 'DetectMessageEnd',
    timeout: 30,
  });

  return call.sid;
}

export { releaseNumber };
