-- Phase 3: Account Management
-- Admin lock/unlock, auto-lock rules, account deletion, staking

-- ========== 1. Account locks table ==========
CREATE TABLE IF NOT EXISTS account_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  lock_level TEXT NOT NULL CHECK (lock_level IN ('warning', 'temporary', 'permanent')),
  reason TEXT NOT NULL,
  locked_by UUID REFERENCES profiles(id),
  locked_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  unlocked_at TIMESTAMPTZ,
  unlocked_by UUID REFERENCES profiles(id),
  unlock_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_account_locks_user ON account_locks(user_id);
CREATE INDEX IF NOT EXISTS idx_account_locks_active ON account_locks(user_id) WHERE unlocked_at IS NULL;

ALTER TABLE account_locks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'account_locks' AND policyname = 'Admins can manage locks') THEN
    CREATE POLICY "Admins can manage locks"
      ON account_locks FOR ALL
      USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'account_locks' AND policyname = 'Users can view own locks') THEN
    CREATE POLICY "Users can view own locks"
      ON account_locks FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ========== 2. Cancellation tracking ==========
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS cancel_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cancel_month TEXT,
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS lock_reason TEXT;

-- ========== 3. Auto-lock trigger: cancel >3 in a month ==========
CREATE OR REPLACE FUNCTION check_cancel_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_month TEXT;
  v_count INTEGER;
BEGIN
  IF NEW.status = 'cancelled' AND (OLD.status IS NULL OR OLD.status NOT IN ('cancelled', 'completed')) THEN
    v_month := to_char(NOW(), 'YYYY-MM');

    -- Update cancel count atomically
    UPDATE profiles
    SET
      cancel_count = CASE
        WHEN cancel_month IS DISTINCT FROM v_month THEN 1
        ELSE cancel_count + 1
      END,
      cancel_month = v_month
    WHERE id = NEW.customer_id;

    -- Read back the count
    SELECT cancel_count INTO v_count FROM profiles WHERE id = NEW.customer_id;

    -- Auto-lock if >3 cancellations
    IF v_count > 3 THEN
      UPDATE profiles SET
        is_locked = TRUE,
        locked_at = NOW(),
        lock_reason = 'Tự động khóa: hủy ' || v_count || ' đơn trong tháng ' || v_month
      WHERE id = NEW.customer_id;

      INSERT INTO account_locks (user_id, lock_level, reason, locked_at, expires_at)
      VALUES (
        NEW.customer_id,
        'temporary',
        'Tự động khóa 7 ngày do hủy ' || v_count || ' đơn trong tháng ' || v_month,
        NOW(),
        NOW() + INTERVAL '7 days'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cancel_limit ON orders;
CREATE TRIGGER trg_cancel_limit
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION check_cancel_limit();

-- ========== 4. Auto-unlock expired temporary locks ==========
CREATE OR REPLACE FUNCTION auto_unlock_accounts()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Unlock expired temporary locks
  UPDATE profiles p
  SET is_locked = FALSE, locked_at = NULL, lock_reason = NULL
  FROM account_locks al
  WHERE al.user_id = p.id
    AND al.unlocked_at IS NULL
    AND al.expires_at < NOW()
    AND al.lock_level = 'temporary';

  UPDATE account_locks
  SET unlocked_at = NOW(), unlock_reason = 'Tự động mở khóa: hết hạn'
  WHERE unlocked_at IS NULL
    AND expires_at < NOW()
    AND lock_level = 'temporary';
END;
$$;

-- ========== 5. Account deletion request table ==========
CREATE TABLE IF NOT EXISTS deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  export_url TEXT
);

ALTER TABLE deletion_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'deletion_requests' AND policyname = 'Users can manage own deletion request') THEN
    CREATE POLICY "Users can manage own deletion request"
      ON deletion_requests FOR ALL
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ========== 6. Staking table (for UI) ==========
CREATE TABLE IF NOT EXISTS staking_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL,
  days INTEGER NOT NULL,
  interest_rate NUMERIC NOT NULL DEFAULT 5.0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'matured', 'early_unstaked')),
  start_date TIMESTAMPTZ DEFAULT NOW(),
  maturity_date TIMESTAMPTZ NOT NULL,
  early_unstake_fee NUMERIC DEFAULT 0.05,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staking_user ON staking_positions(user_id);

ALTER TABLE staking_positions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'staking_positions' AND policyname = 'Users can view own staking') THEN
    CREATE POLICY "Users can view own staking"
      ON staking_positions FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ========== 7. RPC: Check if user is locked ==========
CREATE OR REPLACE FUNCTION is_account_locked(check_user_id UUID)
RETURNS TABLE(
  is_locked BOOLEAN,
  lock_level TEXT,
  lock_reason TEXT,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.is_locked,
    al.lock_level,
    COALESCE(p.lock_reason, al.reason),
    al.expires_at
  FROM profiles p
  LEFT JOIN account_locks al ON al.user_id = p.id AND al.unlocked_at IS NULL
  WHERE p.id = check_user_id
  ORDER BY al.locked_at DESC
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION is_account_locked TO service_role;
GRANT EXECUTE ON FUNCTION auto_unlock_accounts TO service_role;
