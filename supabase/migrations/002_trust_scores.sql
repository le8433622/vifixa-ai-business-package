-- Migration: Trust Scores and Quality System
-- Per 12_OPERATIONS_AND_TRUST.md - Trust score for workers
-- Per Step 7: Trust & Quality - Task 1

-- Add trust-related columns to workers table
ALTER TABLE workers 
ADD COLUMN IF NOT EXISTS trust_score INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS total_orders INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_rating DECIMAL(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS dispute_rate DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS verification_status TEXT CHECK (verification_status IN ('pending', 'verified', 'rejected')) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS id_document_url TEXT;

-- Create trust_scores table for historical tracking
CREATE TABLE IF NOT EXISTS trust_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id UUID REFERENCES workers(user_id) ON DELETE CASCADE NOT NULL,
  score INTEGER NOT NULL,
  completed_orders INTEGER DEFAULT 0,
  avg_rating DECIMAL(3,2) DEFAULT 0,
  dispute_rate DECIMAL(5,2) DEFAULT 0,
  last_calculated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create function to calculate trust score
-- Formula: (completed_orders × 10) + (avg_rating × 20) - (disputes × 30)
CREATE OR REPLACE FUNCTION calculate_trust_score(worker_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  completed_count INTEGER;
  avg_rating_val DECIMAL(3,2);
  dispute_count INTEGER;
  total_orders_count INTEGER;
  trust_score_val INTEGER;
BEGIN
  -- Get completed orders count
  SELECT COUNT(*) INTO completed_count
  FROM orders
  WHERE worker_id = worker_uuid AND status = 'completed';

  -- Get average rating
  SELECT COALESCE(AVG(rating), 0) INTO avg_rating_val
  FROM orders
  WHERE worker_id = worker_uuid AND rating IS NOT NULL;

  -- Get dispute count
  SELECT COUNT(*) INTO dispute_count
  FROM orders
  WHERE worker_id = worker_uuid AND status = 'disputed';

  -- Get total orders
  SELECT COUNT(*) INTO total_orders_count
  FROM orders
  WHERE worker_id = worker_uuid;

  -- Calculate trust score
  trust_score_val := (completed_count * 10) + (FLOOR(avg_rating_val) * 20) - (dispute_count * 30);

  -- Ensure score is between 0 and 100
  IF trust_score_val < 0 THEN
    trust_score_val := 0;
  ELSIF trust_score_val > 100 THEN
    trust_score_val := 100;
  END IF;

  -- Update workers table
  UPDATE workers
  SET 
    trust_score = trust_score_val,
    total_orders = total_orders_count,
    avg_rating = avg_rating_val,
    dispute_rate = CASE 
      WHEN total_orders_count > 0 
      THEN (dispute_count::DECIMAL / total_orders_count::DECIMAL) * 100 
      ELSE 0 
    END
  WHERE user_id = worker_uuid;

  -- Insert into trust_scores history
  INSERT INTO trust_scores (worker_id, score, completed_orders, avg_rating, dispute_rate)
  VALUES (worker_uuid, trust_score_val, completed_count, avg_rating_val, 
    CASE 
      WHEN total_orders_count > 0 
      THEN (dispute_count::DECIMAL / total_orders_count::DECIMAL) * 100 
      ELSE 0 
    END
  );

  RETURN trust_score_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger function to auto-update trust score
CREATE OR REPLACE FUNCTION trigger_update_trust_score()
RETURNS TRIGGER AS $$
BEGIN
  -- Only recalculate if order status changed to completed or disputed
  IF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'completed' OR NEW.status = 'disputed' THEN
      PERFORM calculate_trust_score(NEW.worker_id);
    END IF;
  END IF;
  
  -- For new orders with rating update
  IF TG_OP = 'UPDATE' AND NEW.rating IS NOT NULL AND OLD.rating IS NULL THEN
    PERFORM calculate_trust_score(NEW.worker_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on orders table
DROP TRIGGER IF EXISTS orders_trust_score_trigger ON orders;
CREATE TRIGGER orders_trust_score_trigger
AFTER UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION trigger_update_trust_score();

-- Create complaints table
CREATE TABLE IF NOT EXISTS complaints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- Create warranty_claims table
CREATE TABLE IF NOT EXISTS warranty_claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  claim_reason TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'processing')) DEFAULT 'pending',
  approved_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Enable RLS on new tables
ALTER TABLE trust_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranty_claims ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trust_scores
CREATE POLICY "Workers can view own trust scores"
  ON trust_scores FOR SELECT
  USING (worker_id = auth.uid());

CREATE POLICY "Admins can view all trust scores"
  ON trust_scores FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- RLS Policies for complaints
CREATE POLICY "Customers can create complaints"
  ON complaints FOR INSERT
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Customers can view own complaints"
  ON complaints FOR SELECT
  USING (customer_id = auth.uid());

CREATE POLICY "Admins can manage all complaints"
  ON complaints FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- RLS Policies for warranty_claims
CREATE POLICY "Customers can create warranty claims"
  ON warranty_claims FOR INSERT
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Customers can view own warranty claims"
  ON warranty_claims FOR SELECT
  USING (customer_id = auth.uid());

CREATE POLICY "Admins can manage all warranty claims"
  ON warranty_claims FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trust_scores_worker_id ON trust_scores(worker_id);
CREATE INDEX IF NOT EXISTS idx_complaints_order_id ON complaints(order_id);
CREATE INDEX IF NOT EXISTS idx_complaints_customer_id ON complaints(customer_id);
CREATE INDEX IF NOT EXISTS idx_warranty_claims_order_id ON warranty_claims(order_id);
CREATE INDEX IF NOT EXISTS idx_warranty_claims_customer_id ON warranty_claims(customer_id);

-- Create storage bucket for verification documents (private)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('verification-docs', 'verification-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: Workers can upload own docs
CREATE POLICY "Workers can upload verification docs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'verification-docs' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policy: Workers can view own docs
CREATE POLICY "Workers can view own verification docs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'verification-docs' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policy: Admins can view all verification docs
CREATE POLICY "Admins can view all verification docs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'verification-docs'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
