import { config } from '../config.js';

/**
 * Twilio Number Pool
 *
 * Manages a pool of Twilio phone numbers for concurrent calls.
 * Uses round-robin with in-use tracking to distribute calls across numbers.
 * Falls back to a single number if no pool is configured.
 */

// Track which numbers are currently in use (callId → number)
const inUseMap = new Map<string, string>();

// Round-robin index
let nextIndex = 0;

/**
 * Get all available numbers (pool + fallback single number)
 */
function getAllNumbers(): string[] {
  const poolNumbers = config.TWILIO_PHONE_NUMBERS || [];
  if (poolNumbers.length > 0) return poolNumbers;
  // Fallback to single number
  return config.TWILIO_PHONE_NUMBER ? [config.TWILIO_PHONE_NUMBER] : [];
}

/**
 * Get an available number for a new call.
 * Prefers numbers that aren't currently in use.
 * Falls back to round-robin if all numbers are busy.
 */
export function getAvailableNumber(callId: string): string {
  const numbers = getAllNumbers();
  if (numbers.length === 0) {
    throw new Error('No Twilio phone numbers configured');
  }

  // If only one number, use it
  if (numbers.length === 1) {
    inUseMap.set(callId, numbers[0]);
    return numbers[0];
  }

  // Find numbers currently in use
  const currentlyInUse = new Set(inUseMap.values());

  // Try to find an idle number (not currently in use)
  for (let i = 0; i < numbers.length; i++) {
    const idx = (nextIndex + i) % numbers.length;
    if (!currentlyInUse.has(numbers[idx])) {
      nextIndex = (idx + 1) % numbers.length;
      inUseMap.set(callId, numbers[idx]);
      console.log(`[NumberPool] Assigned ${numbers[idx]} to call ${callId} (idle)`);
      return numbers[idx];
    }
  }

  // All numbers are in use — round-robin anyway (shared usage)
  const number = numbers[nextIndex % numbers.length];
  nextIndex = (nextIndex + 1) % numbers.length;
  inUseMap.set(callId, number);
  console.log(`[NumberPool] Assigned ${number} to call ${callId} (round-robin, all busy)`);
  return number;
}

/**
 * Release a number back to the pool when a call ends.
 */
export function releaseNumber(callId: string): void {
  const number = inUseMap.get(callId);
  if (number) {
    inUseMap.delete(callId);
    console.log(`[NumberPool] Released ${number} from call ${callId}`);
  }
}

/**
 * Get current pool stats for monitoring.
 */
export function getPoolStats(): { total: number; inUse: number; available: number } {
  const numbers = getAllNumbers();
  const currentlyInUse = new Set(inUseMap.values());
  return {
    total: numbers.length,
    inUse: currentlyInUse.size,
    available: numbers.length - currentlyInUse.size,
  };
}
