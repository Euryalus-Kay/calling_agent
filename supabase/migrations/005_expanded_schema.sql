-- ============================================================
-- Migration 005: Expanded Schema
-- Adds contacts, scheduled_tasks, task_templates, notifications
-- Expands profiles, tasks, and user_memory with new columns
-- ============================================================

-- -------------------------------------------------------
-- 1. ALTER existing tables with new columns
-- -------------------------------------------------------

-- Expand profiles
ALTER TABLE public.profiles
  ADD COLUMN timezone TEXT DEFAULT 'America/Chicago',
  ADD COLUMN notification_email BOOLEAN DEFAULT TRUE,
  ADD COLUMN notification_sms BOOLEAN DEFAULT FALSE,
  ADD COLUMN ai_voice_preference TEXT DEFAULT 'professional',
  ADD COLUMN daily_call_limit INTEGER DEFAULT 20,
  ADD COLUMN theme TEXT DEFAULT 'system';

-- Expand user_memory
ALTER TABLE public.user_memory
  ADD COLUMN category TEXT DEFAULT 'general'
    CHECK (category IN ('general', 'preference', 'fact', 'medical', 'financial', 'contact')),
  ADD COLUMN confidence FLOAT DEFAULT 1.0,
  ADD COLUMN last_used_at TIMESTAMPTZ,
  ADD COLUMN use_count INTEGER DEFAULT 0;

-- -------------------------------------------------------
-- 2. Create new tables
-- -------------------------------------------------------

-- Contacts
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone_number TEXT,
  email TEXT,
  company TEXT,
  category TEXT DEFAULT 'other'
    CHECK (category IN ('personal', 'business', 'medical', 'government', 'other')),
  notes TEXT,
  is_favorite BOOLEAN DEFAULT FALSE,
  last_contacted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_contacts_user_id ON public.contacts(user_id);
CREATE INDEX idx_contacts_category ON public.contacts(category);

-- Scheduled tasks
CREATE TABLE public.scheduled_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  recurrence TEXT CHECK (recurrence IN ('daily', 'weekly', 'monthly') OR recurrence IS NULL),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'executed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_scheduled_tasks_user_id ON public.scheduled_tasks(user_id);
CREATE INDEX idx_scheduled_tasks_status ON public.scheduled_tasks(status);
CREATE INDEX idx_scheduled_tasks_scheduled_for ON public.scheduled_tasks(scheduled_for);

-- Expand tasks (add columns after scheduled_tasks table exists for FK)
ALTER TABLE public.tasks
  ADD COLUMN is_favorite BOOLEAN DEFAULT FALSE,
  ADD COLUMN category TEXT,
  ADD COLUMN scheduled_task_id UUID REFERENCES public.scheduled_tasks(id) ON DELETE SET NULL;

-- Task templates
CREATE TABLE public.task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT,
  icon TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_task_templates_user_id ON public.task_templates(user_id);
CREATE INDEX idx_task_templates_is_public ON public.task_templates(is_public);

-- Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL
    CHECK (type IN ('call_completed', 'call_failed', 'task_completed', 'scheduled_reminder', 'system')),
  read BOOLEAN DEFAULT FALSE,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);

-- -------------------------------------------------------
-- 3. Enable RLS on new tables
-- -------------------------------------------------------

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------
-- 4. RLS Policies
-- -------------------------------------------------------

-- Contacts: users access own contacts only
CREATE POLICY "Users can view own contacts"
  ON public.contacts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own contacts"
  ON public.contacts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contacts"
  ON public.contacts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own contacts"
  ON public.contacts FOR DELETE
  USING (auth.uid() = user_id);

-- Scheduled tasks: users access own only
CREATE POLICY "Users can view own scheduled tasks"
  ON public.scheduled_tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own scheduled tasks"
  ON public.scheduled_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scheduled tasks"
  ON public.scheduled_tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own scheduled tasks"
  ON public.scheduled_tasks FOR DELETE
  USING (auth.uid() = user_id);

-- Task templates: users can read own + public, write own only
CREATE POLICY "Users can view own templates"
  ON public.task_templates FOR SELECT
  USING (auth.uid() = user_id OR is_public = TRUE);

CREATE POLICY "Users can create own templates"
  ON public.task_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates"
  ON public.task_templates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates"
  ON public.task_templates FOR DELETE
  USING (auth.uid() = user_id);

-- Notifications: users access own only
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

-- -------------------------------------------------------
-- 5. Auto-update triggers for new tables with updated_at
-- -------------------------------------------------------

CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_scheduled_tasks_updated_at
  BEFORE UPDATE ON public.scheduled_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- -------------------------------------------------------
-- 6. Enable Realtime on notifications
-- -------------------------------------------------------

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
