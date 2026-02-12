export const QUEUE_NAMES = {
  CALLS: 'call-processing',
  SCHEDULED: 'scheduled-tasks',
} as const;

export enum TaskStatus {
  PLANNING = 'planning',
  READY = 'ready',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum CallStatus {
  QUEUED = 'queued',
  INITIATING = 'initiating',
  RINGING = 'ringing',
  IN_PROGRESS = 'in_progress',
  ON_HOLD = 'on_hold',
  NAVIGATING_MENU = 'navigating_menu',
  TRANSFERRED = 'transferred',
  VOICEMAIL = 'voicemail',
  COMPLETED = 'completed',
  FAILED = 'failed',
  NO_ANSWER = 'no_answer',
  BUSY = 'busy',
  RETRYING = 'retrying',
}

export enum ContactCategory {
  PERSONAL = 'personal',
  BUSINESS = 'business',
  MEDICAL = 'medical',
  GOVERNMENT = 'government',
  OTHER = 'other',
}

export enum MemoryCategory {
  GENERAL = 'general',
  PREFERENCE = 'preference',
  FACT = 'fact',
  MEDICAL = 'medical',
  FINANCIAL = 'financial',
  CONTACT = 'contact',
}

export enum NotificationType {
  CALL_COMPLETED = 'call_completed',
  CALL_FAILED = 'call_failed',
  TASK_COMPLETED = 'task_completed',
  SCHEDULED_REMINDER = 'scheduled_reminder',
  SYSTEM = 'system',
}

export enum TaskCategory {
  APPOINTMENT = 'appointment',
  INQUIRY = 'inquiry',
  RESERVATION = 'reservation',
  COMPLAINT = 'complaint',
  GENERAL = 'general',
}

export const VOICE_OPTIONS = [
  { id: 'professional', label: 'Professional', description: 'Clear and businesslike' },
  { id: 'friendly', label: 'Friendly', description: 'Warm and casual' },
  { id: 'formal', label: 'Formal', description: 'Polished and authoritative' },
] as const;

export const TIMEZONE_OPTIONS = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Phoenix', 'America/Anchorage', 'Pacific/Honolulu',
] as const;
