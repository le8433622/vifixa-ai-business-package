-- Performance: Missing indexes for common query patterns
-- Phase 23: DB indexing optimization

-- Orders: composite indexes for active-order lookups
CREATE INDEX IF NOT EXISTS idx_orders_customer_status ON public.orders(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_worker_status ON public.orders(worker_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_category ON public.orders(category);

-- Partial: pending orders for surge pricing + worker matching
CREATE INDEX IF NOT EXISTS idx_orders_pending ON public.orders(status) WHERE status IN ('pending', 'diagnosed', 'quoted');

-- Transactions: history per user
CREATE INDEX IF NOT EXISTS idx_transactions_user_created ON public.transactions(user_id, created_at DESC);

-- Workers: FK index
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workers') THEN
    CREATE INDEX IF NOT EXISTS idx_workers_user_id ON public.workers(user_id);
  END IF;
END $$;

-- Service requests
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'service_requests') THEN
    CREATE INDEX IF NOT EXISTS idx_requests_worker ON public.service_requests(worker_id);
    CREATE INDEX IF NOT EXISTS idx_requests_created ON public.service_requests(created_at DESC);
  END IF;
END $$;

-- Notifications: feed per user
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'in_app_notifications') THEN
    CREATE INDEX IF NOT EXISTS idx_inapp_user_created ON public.in_app_notifications(user_id, created_at DESC);
  END IF;
END $$;

-- AI logs: time-range queries
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_logs') THEN
    CREATE INDEX IF NOT EXISTS idx_ai_logs_created ON public.ai_logs(created_at DESC);
  END IF;
END $$;

-- Wallet: balance queries
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wallets') THEN
    CREATE INDEX IF NOT EXISTS idx_wallets_user_balance ON public.wallets(user_id, currency);
  END IF;
END $$;

-- Agent OS: approval queries
CREATE INDEX IF NOT EXISTS idx_approvals_action ON public.agent_approvals(action_id, status);

-- Membership plans: active
CREATE INDEX IF NOT EXISTS idx_membership_plans_active ON public.membership_plans(is_active);
