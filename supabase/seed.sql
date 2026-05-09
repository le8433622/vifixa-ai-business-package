-- Seed data for Vifixa AI
-- This file is loaded automatically by `supabase db reset`

-- Insert test profiles (customers)
INSERT INTO profiles (id, email, phone, role, full_name)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'customer1@test.com', '+84123456789', 'customer', 'Nguyễn Văn A'),
  ('00000000-0000-0000-0000-000000000002', 'customer2@test.com', '+84987654321', 'customer', 'Trần Thị B'),
  ('00000000-0000-0000-0000-000000000003', 'customer3@test.com', '+84111222333', 'customer', 'Lê Văn C')
ON CONFLICT (id) DO NOTHING;

-- Insert test workers
INSERT INTO workers (user_id, skills, service_areas, trust_score, is_verified)
VALUES
  ('00000000-0000-0000-0000-000000000010', 
   '["electricity", "ac_repair", "water"]'::jsonb, 
   '["District 1", "District 2", "District 3"]'::jsonb, 
   85, 
   true),
  ('00000000-0000-0000-0000-000000000011', 
   '["ac_repair", "appliance"]'::jsonb, 
   '["District 1", "District 7", "District 4"]'::jsonb, 
   72, 
   true),
  ('00000000-0000-0000-0000-000000000012', 
   '["electricity", "water", "plumbing"]'::jsonb, 
   '["District 2", "District 9", "Thu Duc"]'::jsonb, 
   90, 
   false)
ON CONFLICT (user_id) DO NOTHING;

-- Insert sample orders
INSERT INTO orders (customer_id, worker_id, category, description, estimated_price, status)
VALUES
  ('00000000-0000-0000-0000-000000000001', 
   '00000000-0000-0000-0000-000000000010', 
   'ac_repair', 
   'Máy lạnh không lạnh, chảy nước', 
   500000, 
   'completed'),
  ('00000000-0000-0000-0000-000000000002', 
   '00000000-0000-0000-0000-000000000011', 
   'electricity', 
   'Đèn phòng khách chập chờn', 
   200000, 
   'in_progress'),
  ('00000000-0000-0000-0000-000000000003', 
   NULL, 
   'water', 
   'Vòi nước bếp bị rò rỉ', 
   300000, 
   'pending')
ON CONFLICT DO NOTHING;

-- Insert sample AI logs
INSERT INTO ai_logs (order_id, agent_type, input, output)
SELECT 
  o.id,
  'diagnosis',
  '{"description": "Máy lạnh không lạnh", "category": "ac_repair"}'::jsonb,
  '{"diagnosis": "Thiếu gas hoặc lọc bụi bẩn", "severity": "medium", "recommended_skills": ["ac_repair"]}'::jsonb
FROM orders o 
WHERE o.category = 'ac_repair' 
LIMIT 1
ON CONFLICT DO NOTHING;
