-- Migration 009: Credits & Tier System
-- Adds account tiers (free/pro/unlimited), credit tracking, and atomic credit functions

-- Add tier and credits columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_tier TEXT DEFAULT 'free' CHECK (account_tier IN ('free', 'pro', 'unlimited'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS credits_remaining INTEGER DEFAULT 25;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS credits_monthly_allowance INTEGER DEFAULT 25;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS billing_period_start TIMESTAMPTZ DEFAULT now();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS billing_period_end TIMESTAMPTZ DEFAULT (now() + interval '30 days');
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Create credit transactions log
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- positive = added, negative = used
  type TEXT NOT NULL CHECK (type IN ('monthly_reset', 'call_usage', 'sms_usage', 'purchase', 'admin_grant', 'tier_upgrade')),
  description TEXT NOT NULL DEFAULT '',
  reference_id TEXT, -- call_id, task_id, etc.
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_created ON credit_transactions(user_id, created_at DESC);

-- RLS
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credit transactions"
  ON credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Atomic deduct_credits function (uses row-level lock)
CREATE OR REPLACE FUNCTION deduct_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_type TEXT,
  p_description TEXT DEFAULT '',
  p_reference_id TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_tier TEXT;
  v_balance INTEGER;
BEGIN
  -- Lock the row and get current state
  SELECT account_tier, credits_remaining
  INTO v_tier, v_balance
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  -- Unlimited tier always passes (still log the transaction)
  IF v_tier = 'unlimited' THEN
    INSERT INTO credit_transactions (user_id, amount, type, description, reference_id)
    VALUES (p_user_id, -p_amount, p_type, p_description, p_reference_id);
    RETURN TRUE;
  END IF;

  -- Check sufficient balance
  IF v_balance < p_amount THEN
    RETURN FALSE;
  END IF;

  -- Deduct
  UPDATE profiles
  SET credits_remaining = credits_remaining - p_amount
  WHERE id = p_user_id;

  -- Log transaction
  INSERT INTO credit_transactions (user_id, amount, type, description, reference_id)
  VALUES (p_user_id, -p_amount, p_type, p_description, p_reference_id);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic add_credits function
CREATE OR REPLACE FUNCTION add_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_type TEXT,
  p_description TEXT DEFAULT ''
) RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET credits_remaining = credits_remaining + p_amount
  WHERE id = p_user_id;

  INSERT INTO credit_transactions (user_id, amount, type, description)
  VALUES (p_user_id, p_amount, p_type, p_description);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable realtime for credit_transactions (so UI updates live)
ALTER PUBLICATION supabase_realtime ADD TABLE credit_transactions;
