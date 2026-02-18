// ---- Account Tiers & Credits ----

export type AccountTier = 'free' | 'pro' | 'unlimited';

export const TIER_LIMITS = {
  free: {
    credits_monthly: 25,
    daily_tasks: 5,
    concurrent_calls: 3,
    max_calls_per_task: 3,
    max_call_duration_sec: 300, // 5 min
    history_days: 30,
    max_memories: 50,
    max_contacts: 50,
    summary_model: 'claude-haiku-4-5-20251001' as const,
  },
  pro: {
    credits_monthly: 200,
    daily_tasks: 50,
    concurrent_calls: 10,
    max_calls_per_task: 10,
    max_call_duration_sec: 600, // 10 min
    history_days: null as null,
    max_memories: null as null,
    max_contacts: null as null,
    summary_model: 'claude-opus-4-6' as const,
  },
  unlimited: {
    credits_monthly: -1, // unlimited
    daily_tasks: -1, // unlimited
    concurrent_calls: 20,
    max_calls_per_task: 20,
    max_call_duration_sec: 900, // 15 min
    history_days: null as null,
    max_memories: null as null,
    max_contacts: null as null,
    summary_model: 'claude-opus-4-6' as const,
  },
} as const;

export interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: 'monthly_reset' | 'call_usage' | 'sms_usage' | 'purchase' | 'admin_grant' | 'tier_upgrade';
  description: string;
  reference_id: string | null;
  created_at: string;
}

// ---- User Profile ----

export interface UserProfile {
  id: string;
  full_name: string | null;
  phone_number: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  insurance_provider: string | null;
  insurance_member_id: string | null;
  preferences: Record<string, unknown>;
  onboarding_completed: boolean;
  timezone: string;
  notification_email: boolean;
  notification_sms: boolean;
  ai_voice_preference: string;
  daily_call_limit: number;
  theme: string;
  verified_caller_id: string | null;
  account_tier: AccountTier;
  credits_remaining: number;
  credits_monthly_allowance: number;
  billing_period_start: string;
  billing_period_end: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  input_text: string;
  parsed_intent: Record<string, unknown> | null;
  plan: CallPlan | null;
  status: string;
  summary: string | null;
  clarifying_messages: ChatMessage[];
  is_favorite: boolean;
  category: string | null;
  scheduled_task_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CallPlan {
  summary: string;
  calls: PlannedCall[];
}

export interface PlannedCall {
  business_name: string;
  phone_number: string;
  purpose: string;
  questions: string[];
  context: string;
  priority?: 'high' | 'medium' | 'low';
  expected_duration?: string;
  type?: 'call' | 'sms';
  sms_body?: string;
}

export interface MemoryExtraction {
  memories: Array<{ key: string; value: string; category: string }>;
  contact_saved: { name: string; phone_number: string; category: string } | null;
  extracted_at: string;
}

export interface Call {
  id: string;
  task_id: string;
  user_id: string;
  business_name: string;
  phone_number: string;
  purpose: string;
  status: string;
  twilio_call_sid: string | null;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  result: Record<string, unknown> | null;
  result_summary: string | null;
  error: string | null;
  retry_count: number;
  max_retries: number;
  hold_started_at: string | null;
  status_detail: string | null;
  memory_extraction: MemoryExtraction | null;
  created_at: string;
  updated_at: string;
}

export interface TranscriptEntry {
  id: string;
  call_id: string;
  speaker: 'agent' | 'human' | 'system';
  content: string;
  timestamp_ms: number | null;
  event_type: string | null;
  created_at: string;
}

export interface UserMemory {
  id: string;
  user_id: string;
  key: string;
  value: string;
  source: string | null;
  category: 'general' | 'preference' | 'fact' | 'medical' | 'financial' | 'contact';
  confidence: number;
  last_used_at: string | null;
  use_count: number;
  created_at: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface PlannerResponse {
  status: 'needs_clarification' | 'ready';
  message: string;
  clarifying_questions?: string[];
  new_memories?: Array<{ key: string; value: string; category?: string }>;
  plan?: CallPlan & { estimated_duration?: string };
}

export interface CallJobData {
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
}

export interface Contact {
  id: string;
  user_id: string;
  name: string;
  phone_number: string | null;
  email: string | null;
  company: string | null;
  category: 'personal' | 'business' | 'medical' | 'government' | 'other';
  notes: string | null;
  is_favorite: boolean;
  last_contacted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScheduledTask {
  id: string;
  user_id: string;
  task_id: string | null;
  title: string;
  description: string;
  scheduled_for: string;
  recurrence: 'daily' | 'weekly' | 'monthly' | null;
  status: 'pending' | 'executed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface TaskTemplate {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string | null;
  icon: string | null;
  is_public: boolean;
  use_count: number;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: 'call_completed' | 'call_failed' | 'task_completed' | 'scheduled_reminder' | 'system';
  read: boolean;
  link: string | null;
  created_at: string;
}

export interface UserStats {
  total_tasks: number;
  total_calls: number;
  successful_calls: number;
  total_call_minutes: number;
  tasks_this_week: number;
  most_called_category: string | null;
}
