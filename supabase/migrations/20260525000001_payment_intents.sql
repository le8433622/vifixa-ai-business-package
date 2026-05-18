-- 💳 Payment Intents + Webhook Events Tables
-- Bổ sung cho payment-process Edge Function

-- ========== 1. PAYMENT INTENTS ==========
CREATE TABLE IF NOT EXISTS payment_intents (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         UUID REFERENCES orders(id),
  user_id          UUID REFERENCES auth.users(id) NOT NULL,
  gateway          TEXT NOT NULL CHECK (gateway IN ('vnpay', 'stripe', 'momo', 'zalopay', 'wallet', 'mock')),
  amount           NUMERIC NOT NULL CHECK (amount > 0),
  currency         TEXT DEFAULT 'VND',
  status           TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'refunded', 'cancelled')),
  gateway_txn_id   TEXT,
  gateway_response JSONB,
  metadata         JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Table might exist with different columns from previous migration iteration
ALTER TABLE payment_intents ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id);
ALTER TABLE payment_intents ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE payment_intents ADD COLUMN IF NOT EXISTS gateway_txn_id TEXT;
ALTER TABLE payment_intents ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_pi_order ON payment_intents(order_id);
CREATE INDEX IF NOT EXISTS idx_pi_user ON payment_intents(user_id);
CREATE INDEX IF NOT EXISTS idx_pi_gateway_txn ON payment_intents(gateway_txn_id);
CREATE INDEX IF NOT EXISTS idx_pi_status ON payment_intents(status);

ALTER TABLE payment_intents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own payment intents"
  ON payment_intents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System manages payment intents"
  ON payment_intents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System updates payment intents"
  ON payment_intents FOR UPDATE
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ========== 2. WEBHOOK EVENTS ==========
CREATE TABLE IF NOT EXISTS webhook_events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway          TEXT NOT NULL,
  event_type       TEXT NOT NULL,
  event_id         TEXT,  -- Gateway's unique event ID (for dedup)
  raw_body         TEXT,
  status           TEXT DEFAULT 'received' CHECK (status IN ('received', 'processed', 'failed')),
  signature_valid  BOOLEAN,
  processed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_dedup ON webhook_events(gateway, event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_status ON webhook_events(status);

ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage webhooks"
  ON webhook_events FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ========== 3. UPDATE EXISTING TABLES ==========
-- Thêm escrow_id vào orders để liên kết
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_intent_id UUID REFERENCES payment_intents(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS escrow_id UUID REFERENCES escrow(id);

-- Index cho transaction history
CREATE INDEX IF NOT EXISTS idx_ledger_user_type ON ledger(created_at DESC, account);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at DESC);

-- ========== 4. SEED VNPay + STRIPE CONFIG ==========
INSERT INTO gateway_configs (key, display_name, description, active, sandbox, sandbox_keys, supported_currencies, supported_methods, priority)
VALUES
  ('vnpay', 'VNPay', 'Cổng thanh toán VNPay - ATM, QR, Internet Banking', false, true,
    '{"tmnCode": "YOUR_VNPAY_TMN_CODE", "secretKey": "YOUR_VNPAY_SECRET_KEY", "returnUrl": "https://your-domain.com/api/payments/vnpay/return", "sandbox": true}'::jsonb,
    '{VND}', '{qr,bank_transfer,atm}', 1),
  ('stripe', 'Stripe', 'Stripe payment gateway - Card, Apple Pay, Google Pay', false, true,
    '{"publishable_key": "YOUR_STRIPE_PUBLISHABLE_KEY", "secret_key": "YOUR_STRIPE_SECRET_KEY"}'::jsonb,
    '{USD,VND}', '{card,apple_pay,google_pay}', 2)
ON CONFLICT (key) DO UPDATE SET
  active = false, sandbox = true,
  sandbox_keys = EXCLUDED.sandbox_keys,
  supported_currencies = EXCLUDED.supported_currencies;

-- ========== 5. DATABASE FUNCTION: atomic_payment ==========
CREATE OR REPLACE FUNCTION atomic_payment(
  p_order_id UUID,
  p_customer_id UUID,
  p_worker_id UUID,
  p_amount NUMERIC,
  p_gateway TEXT,
  p_fee_rate NUMERIC DEFAULT 0.03
) RETURNS JSONB AS $$
DECLARE
  v_fee NUMERIC;
  v_worker_payout NUMERIC;
  v_txn_id UUID;
  v_pi_id UUID;
BEGIN
  v_fee := ROUND(p_amount * p_fee_rate * 100) / 100;
  v_worker_payout := p_amount - v_fee;

  -- Create payment intent
  INSERT INTO payment_intents (order_id, user_id, gateway, amount, status)
  VALUES (p_order_id, p_customer_id, p_gateway, p_amount, 'pending')
  RETURNING id INTO v_pi_id;

  -- Debit customer's txn wallet
  UPDATE wallets SET balance = balance - p_amount WHERE user_id = p_customer_id AND wallet_type = 'txn';
  
  -- Credit to escrow (pending)
  INSERT INTO escrow (order_id, customer_id, worker_id, amount, platform_fee, worker_payout, status)
  VALUES (p_order_id, p_customer_id, p_worker_id, p_amount, v_fee, v_worker_payout, 'pending');

  -- Record in ledger
  INSERT INTO ledger (txn_id, wallet_id, account, direction, amount, ref_type, ref_id, description)
  VALUES (gen_random_uuid(), (SELECT id FROM wallets WHERE user_id = p_customer_id AND wallet_type = 'txn'), 'payment.out', 'debit', p_amount, 'payment_intent', v_pi_id, 'Thanh toán đơn hàng');

  UPDATE orders SET payment_intent_id = v_pi_id WHERE id = p_order_id;

  RETURN jsonb_build_object('payment_intent_id', v_pi_id, 'amount', p_amount, 'fee', v_fee, 'worker_payout', v_worker_payout);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
