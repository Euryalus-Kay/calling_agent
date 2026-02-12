-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcript_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_memory ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Tasks
CREATE POLICY "Users can view own tasks"
  ON public.tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks"
  ON public.tasks FOR UPDATE
  USING (auth.uid() = user_id);

-- Calls
CREATE POLICY "Users can view own calls"
  ON public.calls FOR SELECT
  USING (auth.uid() = user_id);

-- Transcripts
CREATE POLICY "Users can view own transcripts"
  ON public.transcript_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.calls
      WHERE calls.id = transcript_entries.call_id
      AND calls.user_id = auth.uid()
    )
  );

-- User memory
CREATE POLICY "Users can view own memory"
  ON public.user_memory FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own memory"
  ON public.user_memory FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own memory"
  ON public.user_memory FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own memory"
  ON public.user_memory FOR DELETE
  USING (auth.uid() = user_id);
