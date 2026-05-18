-- Performance: Missing indexes for common query patterns
-- Phase 23: DB indexing optimization

-- Orders: composite indexes for active-order lookups
CREATE INDEX IF NOT EXISTS idx_orders_customer_status ON public.orders(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_worker_status ON public.orders(worker_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_service_type ON public.orders(service_type);

-- Partial: pending orders for surge pricing + worker matching
CREATE INDEX IF NOT EXISTS idx_orders_pending ON public.orders(status) WHERE status IN ('pending', 'diagnosed', 'quoted');

-- Transactions: history per user
CREATE INDEX IF NOT EXISTS idx_transactions_user_created ON public.transactions(user_id, created_at DESC);

-- Workers: FK index
CREATE INDEX IF NOT EXISTS idx_workers_user_id ON public.workers(user_id);

-- Service requests: worker_id + created_at
CREATE INDEX IF NOT EXISTS idx_requests_worker ON public.service_requests(worker_id);
CREATE INDEX IF NOT EXISTS idx_requests_created ON public.service_requests(created_at DESC);

-- Notifications: feed per user
CREATE INDEX IF NOT EXISTS idx_inapp_user_created ON public.in_app_notifications(user_id, created_at DESC);

-- AI logs: time-range queries
CREATE INDEX IF NOT EXISTS idx_ai_logs_created ON public.ai_logs(created_at DESC);

-- Wallet: balance queries
CREATE INDEX IF NOT EXISTS idx_wallets_user_balance ON public.wallets(user_id, currency);

-- Agent OS: approval queries
CREATE INDEX IF NOT EXISTS idx_approvals_action ON public.agent_approvals(action_id, status);

-- Membership plans: active + display order
CREATE INDEX IF NOT EXISTS idx_membership_plans_active ON public.membership_plans(is_active, display_order);
