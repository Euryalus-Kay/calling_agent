export interface CallSessionData {
  businessName: string;
  purpose: string;
  questions: string[];
  context: string;
  userProfile: Record<string, unknown>;
  taskId: string;
  userId: string;
  retryCount?: number;
  previousAttemptNotes?: string;
}

// In-memory session store for call data.
// Works because the BullMQ worker and WebSocket server run in the same process.
// For horizontal scaling, replace with Redis.
const store = new Map<string, CallSessionData>();

export const sessionStore = {
  get: (callId: string) => store.get(callId),
  set: (callId: string, data: CallSessionData) => store.set(callId, data),
  delete: (callId: string) => store.delete(callId),
  has: (callId: string) => store.has(callId),
};
