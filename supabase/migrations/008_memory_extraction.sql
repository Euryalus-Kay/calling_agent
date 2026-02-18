-- ============================================================
-- Migration 008: Memory Extraction Support
-- Adds memory_extraction column to calls table
-- Adds unique index on contacts for upsert support
-- Adds verified_caller_id to profiles for custom caller ID
-- ============================================================

-- Add memory_extraction JSONB column to calls for storing what was extracted
ALTER TABLE public.calls ADD COLUMN IF NOT EXISTS memory_extraction JSONB;

-- Ensure contacts table has a unique constraint on (user_id, name) for upserts
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_user_name
  ON public.contacts(user_id, name);

-- Add verified_caller_id to profiles for Twilio Verified Caller ID feature
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verified_caller_id TEXT;
