-- Add new call state fields for hold tracking, retries, and detailed status
ALTER TABLE calls ADD COLUMN IF NOT EXISTS retry_count integer DEFAULT 0;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS max_retries integer DEFAULT 2;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS hold_started_at timestamptz;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS status_detail text;

-- Add event_type to transcript_entries for system events
ALTER TABLE transcript_entries ADD COLUMN IF NOT EXISTS event_type text;

-- Allow 'system' as a speaker in transcript_entries
-- Drop old speaker constraint and add updated one that includes 'system'
ALTER TABLE transcript_entries DROP CONSTRAINT IF EXISTS transcript_entries_speaker_check;
ALTER TABLE transcript_entries ADD CONSTRAINT transcript_entries_speaker_check
  CHECK (speaker IN ('agent', 'human', 'system'));

-- Update the calls status check to include new statuses
-- Drop old constraint if exists, add new one
ALTER TABLE calls DROP CONSTRAINT IF EXISTS calls_status_check;
ALTER TABLE calls ADD CONSTRAINT calls_status_check CHECK (
  status IN (
    'queued', 'initiating', 'ringing', 'in_progress',
    'on_hold', 'navigating_menu', 'transferred', 'voicemail',
    'completed', 'failed', 'no_answer', 'busy', 'retrying'
  )
);

-- Index for finding active calls quickly (used by concurrent limit check)
CREATE INDEX IF NOT EXISTS idx_calls_user_active
  ON calls (user_id)
  WHERE status IN ('initiating', 'ringing', 'in_progress', 'on_hold', 'navigating_menu', 'transferred');

-- Index for transcript event lookups
CREATE INDEX IF NOT EXISTS idx_transcript_event_type
  ON transcript_entries (call_id, event_type)
  WHERE event_type IS NOT NULL;
