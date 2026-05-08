-- Stripe integration — run in Supabase SQL Editor (subsrf project)
-- Adds Stripe customer/subscription ID columns to profiles

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

-- Index lets the cancellation webhook look up users by customer ID quickly
CREATE INDEX IF NOT EXISTS profiles_stripe_customer_id_idx
  ON profiles (stripe_customer_id);
