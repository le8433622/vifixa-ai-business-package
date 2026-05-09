-- Add missing rating and review_comment columns to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating >= 1 AND rating <= 5);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS review_comment TEXT;
