-- Seed data for Vifixa AI — 34 tỉnh thành ready

-- Insert test profiles (customers)
INSERT INTO profiles (id, email, phone, role, full_name, address)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'customer1@test.com', '+84123456789', 'customer', 'Nguyễn Văn A', '123 Nguyễn Huệ, Quận 1, Hồ Chí Minh'),
  ('00000000-0000-0000-0000-000000000002', 'customer2@test.com', '+84987654321', 'customer', 'Trần Thị B', '45 Cầu Giấy, Hà Nội'),
  ('00000000-0000-0000-0000-000000000003', 'customer3@test.com', '+84111222333', 'customer', 'Lê Văn C', '78 Hải Châu, Đà Nẵng')
ON CONFLICT (id) DO NOTHING;

-- Insert test workers with diverse province coverage
INSERT INTO workers (user_id, skills, service_areas, trust_score, is_verified)
VALUES
  -- HCMC worker
  ('00000000-0000-0000-0000-000000000010', 
   '["electricity", "ac_repair", "water"]'::jsonb, 
   '["Quận 1", "Quận 2", "Quận 3", "Quận 7", "Bình Thạnh"]'::jsonb, 
   85, true),
  -- Hanoi worker
  ('00000000-0000-0000-0000-000000000011', 
   '["ac_repair", "appliance"]'::jsonb, 
   '["Cầu Giấy", "Đống Đa", "Ba Đình", "Thanh Xuân"]'::jsonb, 
   72, true),
  -- Da Nang worker
  ('00000000-0000-0000-0000-000000000012', 
   '["electricity", "water", "plumbing"]'::jsonb, 
   '["Hải Châu", "Thanh Khê", "Sơn Trà"]'::jsonb, 
   90, false),
  -- Binh Duong worker
  ('00000000-0000-0000-0000-000000000013', 
   '["plumbing", "carpentry"]'::jsonb, 
   '["Thủ Dầu Một", "Dĩ An", "Thuận An"]'::jsonb, 
   65, false)
ON CONFLICT (user_id) DO NOTHING;

-- Insert test workers profiles
INSERT INTO profiles (id, email, phone, role, full_name)
VALUES
  ('00000000-0000-0000-0000-000000000010', 'worker1@test.com', '+84901111111', 'worker', 'Phạm Văn An'),
  ('00000000-0000-0000-0000-000000000011', 'worker2@test.com', '+84902222222', 'worker', 'Nguyễn Văn Bình'),
  ('00000000-0000-0000-0000-000000000012', 'worker3@test.com', '+84903333333', 'worker', 'Trần Văn Cường'),
  ('00000000-0000-0000-0000-000000000013', 'worker4@test.com', '+84904444444', 'worker', 'Lê Văn Dũng')
ON CONFLICT (id) DO NOTHING;

-- Insert sample orders
INSERT INTO orders (customer_id, worker_id, category, description, estimated_price, status, address, location_lat, location_lng)
VALUES
  ('00000000-0000-0000-0000-000000000001', 
   '00000000-0000-0000-0000-000000000010', 
   'ac_repair', 
   'Máy lạnh không lạnh, chảy nước', 
   500000, 
   'completed',
   '123 Nguyễn Huệ, Quận 1, Hồ Chí Minh',
   10.7769, 106.6954),
  ('00000000-0000-0000-0000-000000000002', 
   '00000000-0000-0000-0000-000000000011', 
   'electricity', 
   'Đèn phòng khách chập chờn', 
   200000, 
   'in_progress',
   '45 Cầu Giấy, Hà Nội',
   21.0285, 105.8400),
  ('00000000-0000-0000-0000-000000000003', 
   NULL, 
   'water', 
   'Vòi nước bếp bị rò rỉ', 
   300000, 
   'pending',
   '78 Hải Châu, Đà Nẵng',
   16.0600, 108.2100)
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
