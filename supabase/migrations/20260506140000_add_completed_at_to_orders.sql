-- Add completed_at column to orders table
-- Per user report: column orders.completed_at does not exist

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Add comment
COMMENT ON COLUMN orders.completed_at IS 'Thời điểm hoàn thành công việc';

-- Update existing completed orders to set completed_at = updated_at
UPDATE orders 
SET completed_at = updated_at 
WHERE status = 'completed' AND completed_at IS NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_completed_at 
ON orders(completed_at) 
WHERE completed_at IS NOT NULL;
