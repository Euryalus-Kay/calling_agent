import twilio from 'twilio';
import { config } from '../config.js';
import { getAvailableNumber, releaseNumber } from './number-pool.js';

const client = twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);

/**
 * Normalize a phone number to E.164 format (+1XXXXXXXXXX for US numbers).
 * Handles: "3129097473", "13129097473", "+13129097473", "(312) 909-7473" etc.
 */
function normalizeToE164(phone: string): string {
  // Strip everything except digits
  const digits = phone.replace(/[^\d]/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  // Already has country code or international
  if (phone.startsWith('+')) return phone;
  return `+${digits}`;
}

export async function initiateCall(
  callId: string,
  toNumber: string,
  fromNumber?: string
): Promise<string> {
  const twimlUrl = `https://${config.WS_DOMAIN}/twiml?callId=${encodeURIComponent(callId)}`;
  const statusCallbackUrl = `https://${config.WS_DOMAIN}/status-callback`;

  // Normalize destination to E.164 for comparison
  const toNormalized = normalizeToE164(toNumber);

  // Use provided caller ID (verified user number), or get one from the pool.
  // CRITICAL: If the caller ID matches the destination number, we'd be calling
  // ourselves — carriers reject/loop this. Fall back to a pool number instead.
  // Compare normalized E.164 to catch format mismatches like "3129097473" vs "+13129097473"
  let from: string;
  const fromNormalized = fromNumber ? normalizeToE164(fromNumber) : null;
  if (fromNumber && fromNumber.length > 0 && fromNormalized !== toNormalized) {
    // Ensure caller ID is in E.164 format for Twilio
    from = fromNormalized!;
  } else {
    if (fromNumber && fromNormalized === toNormalized) {
      console.log(`[CallManager] Call ${callId}: caller ID ${fromNumber} (normalized: ${fromNormalized}) matches destination ${toNumber} (normalized: ${toNormalized}) — using pool number to avoid self-call`);
    }
    from = getAvailableNumber(callId);
  }
  console.log(`[CallManager] Call ${callId}: fromNumber=${JSON.stringify(fromNumber)}, fromNormalized=${fromNormalized}, to=${toNumber}, toNormalized=${toNormalized}, resolved from=${from}`);

  const call = await client.calls.create({
    from,
    to: toNormalized,
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
