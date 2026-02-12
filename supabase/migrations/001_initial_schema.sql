-- User profiles (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone_number TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  insurance_provider TEXT,
  insurance_member_id TEXT,
  preferences JSONB DEFAULT '{}'::jsonb,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tasks (a user request that spawns calls)
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  input_text TEXT NOT NULL,
  parsed_intent JSONB,
  plan JSONB,
  status TEXT NOT NULL DEFAULT 'planning',
  summary TEXT,
  clarifying_messages JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Individual calls within a task
CREATE TABLE public.calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  purpose TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  twilio_call_sid TEXT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  result JSONB,
  result_summary TEXT,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Transcript entries (one row per utterance)
CREATE TABLE public.transcript_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES public.calls(id) ON DELETE CASCADE,
  speaker TEXT NOT NULL CHECK (speaker IN ('agent', 'human')),
  content TEXT NOT NULL,
  timestamp_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User memory (persists across sessions)
CREATE TABLE public.user_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, key)
);

-- Indexes
CREATE INDEX idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_calls_task_id ON public.calls(task_id);
CREATE INDEX idx_calls_user_id ON public.calls(user_id);
CREATE INDEX idx_calls_status ON public.calls(status);
CREATE INDEX idx_calls_twilio_sid ON public.calls(twilio_call_sid);
CREATE INDEX idx_transcript_call_id ON public.transcript_entries(call_id);
CREATE INDEX idx_user_memory_user_id ON public.user_memory(user_id);
