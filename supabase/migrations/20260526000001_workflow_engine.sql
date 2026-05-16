-- 🏗️ Workflow Engine — State Machine + Idempotency
-- Bổ sung cho auto-executor: quản lý trạng thái workflow theo order

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

CREATE TABLE IF NOT EXISTS idempotency_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  response JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_order ON workflow_states(order_id);
CREATE INDEX IF NOT EXISTS idx_workflow_state ON workflow_states(current_state);
CREATE INDEX IF NOT EXISTS idx_idempotency_key ON idempotency_keys(key);
CREATE INDEX IF NOT EXISTS idx_idempotency_created ON idempotency_keys(created_at);

ALTER TABLE workflow_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages workflow" ON workflow_states
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role manages idempotency" ON idempotency_keys
  FOR ALL USING (auth.role() = 'service_role');

GRANT ALL ON workflow_states TO service_role;
GRANT ALL ON idempotency_keys TO service_role;

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
