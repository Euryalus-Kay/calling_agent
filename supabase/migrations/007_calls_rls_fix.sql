-- ============================================================
-- Migration 007: Add missing INSERT/UPDATE RLS policies for calls table
-- The calls table only had SELECT policy, causing inserts to fail
-- ============================================================

-- Allow users to create call records for their own tasks
CREATE POLICY "Users can create own calls"
  ON public.calls FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own call records
CREATE POLICY "Users can update own calls"
  ON public.calls FOR UPDATE
  USING (auth.uid() = user_id);
