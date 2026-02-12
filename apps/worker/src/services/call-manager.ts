import twilio from 'twilio';
import { config } from '../config.js';

const client = twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);

export async function initiateCall(
  callId: string,
  toNumber: string
): Promise<string> {
  const twimlUrl = `https://${config.WS_DOMAIN}/twiml?callId=${encodeURIComponent(callId)}`;
  const statusCallbackUrl = `https://${config.WS_DOMAIN}/status-callback`;

  const call = await client.calls.create({
    from: config.TWILIO_PHONE_NUMBER,
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
