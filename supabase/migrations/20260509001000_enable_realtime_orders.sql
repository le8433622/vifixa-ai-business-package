-- Enable Realtime for orders table
-- Allows customer, worker, admin pages to subscribe to live order changes

ALTER PUBLICATION supabase_realtime ADD TABLE orders;
