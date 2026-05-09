-- Stripe integration fields for subscription tables
-- Requires manual Stripe Dashboard setup: create products + prices, then update stripe_price_id

ALTER TABLE public.subscription_plans
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;

ALTER TABLE public.customer_subscriptions
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_subscriptions_stripe_subscription_id
  ON public.customer_subscriptions (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;
