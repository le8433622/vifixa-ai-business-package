-- Minimal Migration: Only add what's essential
-- Skip everything that already exists

-- Only add missing columns to workers (with IF NOT EXISTS)
ALTER TABLE workers 
ADD COLUMN IF NOT EXISTS trust_score INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS total_orders INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_rating DECIMAL(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS dispute_rate DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS verification_status TEXT CHECK (verification_status IN ('pending', 'verified', 'rejected')) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS id_document_url TEXT;

-- Create trust_scores table (if not exists)
CREATE TABLE IF NOT EXISTS trust_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES workers(user_id) ON DELETE CASCADE NOT NULL,
  score INTEGER NOT NULL,
  completed_orders INTEGER DEFAULT 0,
  avg_rating DECIMAL(3,2) DEFAULT 0,
  dispute_rate DECIMAL(5,2) DEFAULT 0,
  last_calculated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create function to calculate trust score
CREATE OR REPLACE FUNCTION calculate_trust_score(worker_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  completed_count INTEGER;
  avg_rating_val DECIMAL(3,2);
  dispute_count INTEGER;
  total_orders_count INTEGER;
  trust_score_val INTEGER;
BEGIN
  SELECT COUNT(*) INTO completed_count FROM orders WHERE worker_id = worker_uuid AND status = 'completed';
  SELECT COALESCE(AVG(rating), 0) INTO avg_rating_val FROM orders WHERE worker_id = worker_uuid AND rating IS NOT NULL;
  SELECT COUNT(*) INTO dispute_count FROM orders WHERE worker_id = worker_uuid AND status = 'disputed';
  SELECT COUNT(*) INTO total_orders_count FROM orders WHERE worker_id = worker_uuid;

  trust_score_val := (completed_count * 10) + (FLOOR(avg_rating_val) * 20) - (dispute_count * 30);
  
  IF trust_score_val < 0 THEN trust_score_val := 0;
  ELSIF trust_score_val > 100 THEN trust_score_val := 100;
  END IF;

  UPDATE workers SET 
    trust_score = trust_score_val,
    total_orders = total_orders_count,
    avg_rating = avg_rating_val,
    dispute_rate = CASE WHEN total_orders_count > 0 THEN (dispute_count::DECIMAL / total_orders_count::DECIMAL) * 100 ELSE 0 END
  WHERE user_id = worker_uuid;

  INSERT INTO trust_scores (worker_id, score, completed_orders, avg_rating, dispute_rate)
  VALUES (worker_uuid, trust_score_val, completed_count, avg_rating_val, 
    CASE WHEN total_orders_count > 0 THEN (dispute_count::DECIMAL / total_orders_count::DECIMAL) * 100 ELSE 0 END
  );

  RETURN trust_score_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger function
CREATE OR REPLACE FUNCTION trigger_update_trust_score()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'completed' OR NEW.status = 'disputed' THEN
      PERFORM calculate_trust_score(NEW.worker_id);
    END IF;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.rating IS NOT NULL AND OLD.rating IS NULL THEN
    PERFORM calculate_trust_score(NEW.worker_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (drop first)
DROP TRIGGER IF EXISTS orders_trust_score_trigger ON orders;
CREATE TRIGGER orders_trust_score_trigger
AFTER UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION trigger_update_trust_score();

-- Create complaints table (if not exists)
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

-- Create warranty_claims table (if not exists)
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
