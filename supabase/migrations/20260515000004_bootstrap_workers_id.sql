-- Bootstrap: Add missing workers.id column
-- Schema drift: 001_init created workers with user_id as PK,
-- but 20260514000002 assumed id as PK (no-op due to IF NOT EXISTS)
-- All later migrations reference workers(id) — this must exist

-- ========== 1. Add id column mirroring user_id ==========
ALTER TABLE workers ADD COLUMN IF NOT EXISTS id UUID;
UPDATE workers SET id = user_id WHERE id IS NULL;
ALTER TABLE workers ALTER COLUMN id SET NOT NULL;

-- Add unique constraint (not PK — user_id is already PK)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'workers_id_unique'
  ) THEN
    ALTER TABLE workers ADD CONSTRAINT workers_id_unique UNIQUE (id);
  END IF;
END $$;

-- ========== 2. Add missing columns from 20260514000002 schema ==========
ALTER TABLE workers ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS location_lat NUMERIC;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS location_lng NUMERIC;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS service_radius NUMERIC DEFAULT 10;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS rating_avg NUMERIC DEFAULT 0;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS order_count INT DEFAULT 0;

-- ========== 3. Add missing FK on trust_scores (from 20260515000001) ==========
-- This FK was silently skipped because workers.id didn't exist at migration time
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'trust_scores' AND constraint_type = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE trust_scores
      ADD CONSTRAINT fk_trust_scores_worker
        FOREIGN KEY (worker_id)
        REFERENCES workers(id)
        ON DELETE CASCADE;
  END IF;
END $$;
