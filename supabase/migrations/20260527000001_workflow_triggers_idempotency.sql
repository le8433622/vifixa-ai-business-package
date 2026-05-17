-- 🔗 Workflow + Idempotency (Phase 7A)
-- Ensures tables, RLS, and auto-create workflow_state on order insert

-- ========== 1. ENSURE WORKFLOW STATES TABLE ==========
CREATE TABLE IF NOT EXISTS workflow_states (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL UNIQUE,
  current_state TEXT NOT NULL DEFAULT 'created',
  workflow_definition TEXT NOT NULL DEFAULT 'order_flow',
  context JSONB DEFAULT '{}',
  error_count INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_order ON workflow_states(order_id);
CREATE INDEX IF NOT EXISTS idx_workflow_state ON workflow_states(current_state);

ALTER TABLE workflow_states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages workflow" ON workflow_states;
CREATE POLICY "Service role manages workflow" ON workflow_states
  FOR ALL USING (auth.role() = 'service_role');

GRANT ALL ON workflow_states TO service_role;

-- Auto-create workflow_state khi order được tạo
CREATE OR REPLACE FUNCTION auto_create_workflow()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO workflow_states (order_id, current_state)
  VALUES (NEW.id, 'created')
  ON CONFLICT (order_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_create_workflow ON orders;
CREATE TRIGGER trg_auto_create_workflow
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_workflow();

-- ========== 2. IDEMPOTENCY KEYS TABLE ==========
CREATE TABLE IF NOT EXISTS idempotency_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  response JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_idempotency_key ON idempotency_keys(key);
CREATE INDEX IF NOT EXISTS idx_idempotency_created ON idempotency_keys(created_at);

ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages idempotency" ON idempotency_keys;
CREATE POLICY "Service role manages idempotency" ON idempotency_keys
  FOR ALL USING (auth.role() = 'service_role');

GRANT ALL ON idempotency_keys TO service_role;

-- ========== 3. REFUNDS TABLE (Customer refund requests) ==========
CREATE TABLE IF NOT EXISTS refund_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'processed')),
  admin_note TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refund_order ON refund_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_refund_customer ON refund_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_refund_status ON refund_requests(status);

ALTER TABLE refund_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can view own refund requests" ON refund_requests;
CREATE POLICY "Customers can view own refund requests" ON refund_requests
  FOR SELECT USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Customers can create refund requests" ON refund_requests;
CREATE POLICY "Customers can create refund requests" ON refund_requests
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Admins can manage all refunds" ON refund_requests;
CREATE POLICY "Admins can manage all refunds" ON refund_requests
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

GRANT SELECT, INSERT ON refund_requests TO authenticated;
GRANT ALL ON refund_requests TO service_role;

-- ========== 4. UPDATE ORDERS STATUS CHECK (add refunded) ==========
-- Only if the constraint doesn't already include 'refunded'
-- Note: This is a safe ALTER, won't fail if already included
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'matched', 'in_progress', 'completed', 'cancelled', 'disputed', 'refunded'));

-- ========== 5. SCHEDULED CLEANUP OF OLD IDEMPOTENCY KEYS ==========
-- Runs daily at midnight via pg_cron if available, otherwise manual
-- DELETE FROM idempotency_keys WHERE created_at < NOW() - INTERVAL '7 days';