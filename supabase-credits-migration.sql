-- Phase 1: Credit System Migration
-- Run this in the Supabase SQL Editor (subsrf project)

-- 1. Add credits columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS credits integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credits_reset_at timestamptz DEFAULT now();

-- 2. Backfill credits based on current tier for existing users
UPDATE profiles SET
  credits = CASE
    WHEN tier = 'pro'     THEN 300
    WHEN tier = 'starter' THEN 75
    ELSE 0
  END,
  credits_reset_at = date_trunc('month', now())
WHERE credits = 0;

-- 3. Atomic deduct RPC — runs as postgres (SECURITY DEFINER), bypasses RLS.
--    Railway calls this with the service key after verifying the user's JWT.
--    Never exposed directly to the extension client.
CREATE OR REPLACE FUNCTION deduct_credits(user_id uuid, amount integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_bal integer;
BEGIN
  UPDATE profiles
  SET credits = credits - amount
  WHERE id = user_id AND credits >= amount
  RETURNING credits INTO new_bal;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'insufficient_credits';
  END IF;

  RETURN new_bal;
END;
$$;

-- 4. Refund RPC — caps at the tier's monthly limit so refunds can't exceed max
CREATE OR REPLACE FUNCTION refund_credits(user_id uuid, amount integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_bal integer;
  cap     integer;
BEGIN
  SELECT CASE
    WHEN tier = 'pro'     THEN 300
    WHEN tier = 'starter' THEN 75
    ELSE 0
  END INTO cap FROM profiles WHERE id = user_id;

  UPDATE profiles
  SET credits = LEAST(cap, credits + amount)
  WHERE id = user_id
  RETURNING credits INTO new_bal;

  RETURN new_bal;
END;
$$;
