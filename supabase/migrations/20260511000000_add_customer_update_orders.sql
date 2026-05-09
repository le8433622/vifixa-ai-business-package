-- Add UPDATE policy for customers on orders table
-- Fix: Customer could not cancel orders because only SELECT/INSERT were granted

DROP POLICY IF EXISTS "Customers can update own orders" ON orders;
CREATE POLICY "Customers can update own orders" ON orders
  FOR UPDATE USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);
