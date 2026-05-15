-- Migration: Unify V4 backup features into current schema
-- Step by step updates to trust_scores table and addition of missing tables

-- ========== 1. First, drop any existing primary key constraint on trust_scores ==========
DO $$
BEGIN
  -- Drop any existing primary key constraint
  EXECUTE (
    SELECT 'ALTER TABLE trust_scores DROP CONSTRAINT ' || conname
    FROM pg_constraint
    WHERE conrelid = 'trust_scores'::regclass
      AND contype = 'p'
  );
EXCEPTION WHEN UNDEFINED_OBJECT THEN
  -- No primary key constraint exists, which is fine
  NULL;
END $$;

-- ========== 2. Rename user_id to worker_id in trust_scores ==========
ALTER TABLE trust_scores 
  RENAME COLUMN user_id TO worker_id;

-- ========== 3. Add missing columns to trust_scores ==========
ALTER TABLE trust_scores 
  ADD COLUMN IF NOT EXISTS id UUID,
  ADD COLUMN IF NOT EXISTS completed_orders INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_rating DECIMAL(3,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dispute_rate DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_calculated TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- ========== 4. Update existing rows to have a UUID id ==========
UPDATE trust_scores 
SET id = gen_random_uuid()
WHERE id IS NULL;

-- ========== 5. Set id as primary key ==========
ALTER TABLE trust_scores
  ADD PRIMARY KEY (id);

-- ========== 6. Drop columns we don't need from old structure ==========
ALTER TABLE trust_scores 
  DROP COLUMN IF EXISTS history,
  DROP COLUMN IF EXISTS last_updated;

-- ========== 7. Ensure foreign key constraint ==========
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'trust_scores' 
      AND constraint_type = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE trust_scores
      ADD CONSTRAINT fk_trust_scores_worker
        FOREIGN KEY (worker_id)
        REFERENCES workers(id)
        ON DELETE CASCADE;
  END IF;
END $$;

-- ========== 8. Extend workers table with V4 backup fields ==========
ALTER TABLE workers 
  ADD COLUMN IF NOT EXISTS total_orders INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_rating DECIMAL(3,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dispute_rate DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS verification_status TEXT CHECK (verification_status IN ('pending', 'verified', 'rejected')) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS id_document_url TEXT,
  ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN DEFAULT FALSE;

-- ========== 9. Extend orders table with V4 backup payment fields ==========
ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payout_status TEXT CHECK (payout_status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending';

-- ========== 10. Create complaints table if it doesn't exist ==========
CREATE TABLE IF NOT EXISTS complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  complaint_type TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'investigating', 'resolved', 'rejected')) DEFAULT 'pending',
  assigned_to UUID REFERENCES profiles(id),
  resolution TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_complaints_order ON complaints(order_id);
CREATE INDEX IF NOT EXISTS idx_complaints_customer ON complaints(customer_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);

-- ========== 11. Create warranty_claims table if it doesn't exist ==========
CREATE TABLE IF NOT EXISTS warranty_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  claim_reason TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'processing')) DEFAULT 'pending',
  approved_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_warranty_claims_order ON warranty_claims(order_id);
CREATE INDEX IF NOT EXISTS idx_warranty_claims_customer ON warranty_claims(customer_id);
CREATE INDEX IF NOT EXISTS idx_warranty_claims_status ON warranty_claims(status);

-- ========== 12. Create payouts table if it doesn't exist ==========
CREATE TABLE IF NOT EXISTS payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2) NOT NULL,
  stripe_transfer_id TEXT,
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payouts_order ON payouts(order_id);
CREATE INDEX IF NOT EXISTS idx_payouts_worker ON payouts(worker_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);

-- ========== 13. Enable RLS on all tables ==========
ALTER TABLE trust_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranty_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

-- ========== 14. RLS Policies ==========
-- trust_scores: workers can view own, admins can view all
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trust_scores' AND policyname = 'Workers can view own trust scores') THEN
    CREATE POLICY "Workers can view own trust scores"
      ON trust_scores FOR SELECT
      USING (auth.uid() = worker_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trust_scores' AND policyname = 'Admins can view all trust scores') THEN
    CREATE POLICY "Admins can view all trust scores"
      ON trust_scores FOR SELECT
      USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;
END $$;

-- complaints: customers can view own, workers can view assigned, admins can view all
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'complaints' AND policyname = 'Customers can view own complaints') THEN
    CREATE POLICY "Customers can view own complaints"
      ON complaints FOR SELECT
      USING (auth.uid() = customer_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'complaints' AND policyname = 'Workers can view assigned complaints') THEN
    CREATE POLICY "Workers can view assigned complaints"
      ON complaints FOR SELECT
      USING (EXISTS (
        SELECT 1 FROM orders
        WHERE orders.id = complaints.order_id
        AND orders.worker_id = auth.uid()
      ));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'complaints' AND policyname = 'Admins can view all complaints') THEN
    CREATE POLICY "Admins can view all complaints"
      ON complaints FOR SELECT
      USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;
END $$;

-- warranty_claims: similar to complaints
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'warranty_claims' AND policyname = 'Customers can view own warranty claims') THEN
    CREATE POLICY "Customers can view own warranty claims"
      ON warranty_claims FOR SELECT
      USING (auth.uid() = customer_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'warranty_claims' AND policyname = 'Workers can view assigned warranty claims') THEN
    CREATE POLICY "Workers can view assigned warranty claims"
      ON warranty_claims FOR SELECT
      USING (EXISTS (
        SELECT 1 FROM orders
        WHERE orders.id = warranty_claims.order_id
        AND orders.worker_id = auth.uid()
      ));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'warranty_claims' AND policyname = 'Admins can view all warranty claims') THEN
    CREATE POLICY "Admins can view all warranty claims"
      ON warranty_claims FOR SELECT
      USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;
END $$;

-- payouts: workers can view own, admins can view all
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payouts' AND policyname = 'Workers can view own payouts') THEN
    CREATE POLICY "Workers can view own payouts"
      ON payouts FOR SELECT
      USING (auth.uid() = worker_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payouts' AND policyname = 'Admins can view all payouts') THEN
    CREATE POLICY "Admins can view all payouts"
      ON payouts FOR SELECT
      USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;
END $$;

-- ========== 15. Grants ==========
GRANT ALL ON trust_scores, complaints, warranty_claims, payouts TO service_role;
GRANT SELECT ON trust_scores, complaints, warranty_claims, payouts TO authenticated;