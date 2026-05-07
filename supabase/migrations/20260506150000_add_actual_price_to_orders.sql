-- Add actual_price column to orders table
-- Per user report: column orders.actual_price does not exist

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS actual_price NUMERIC;

-- Add comment
COMMENT ON COLUMN orders.actual_price IS 'Giá thực tế sau khi hoàn thành công việc';

-- Update existing completed orders to set actual_price = estimated_price
UPDATE orders 
SET actual_price = estimated_price 
WHERE status = 'completed' AND actual_price IS NULL AND estimated_price IS NOT NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_actual_price 
ON orders(actual_price) 
WHERE actual_price IS NOT NULL;
