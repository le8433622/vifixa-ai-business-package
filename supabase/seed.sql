-- Seed data cho Vifixa AI
-- Chạy sau khi `supabase db reset`

-- ========== TEST USERS (phải tồn tại trong auth.users trước) ==========
-- Lưu ý: Các UUID này phải được tạo thủ công trong Supabase Auth
-- để test, dùng Supabase Dashboard tạo user trước, hoặc dùng register endpoint

-- profiles sẽ được tạo tự động qua trigger khi user register
-- Nên seed.sql chỉ seed data test không phụ thuộc auth.users

-- ========== WORKERS ==========
INSERT INTO workers (id, full_name, phone, location_lat, location_lng, service_radius, is_verified, trust_score, rating_avg, order_count)
VALUES
  ('00000000-0000-0000-0000-000000000010', 'Nguyễn Văn Thợ', '+84912345678', 10.7769, 106.7009, 15, true, 85, 4.5, 47),
  ('00000000-0000-0000-0000-000000000011', 'Trần Văn Sửa', '+84987654321', 10.7822, 106.6897, 10, true, 72, 4.2, 23),
  ('00000000-0000-0000-0000-000000000012', 'Lê Văn Điện', '+84911223344', 10.7625, 106.6825, 20, false, 50, 0, 0)
ON CONFLICT (id) DO NOTHING;

-- ========== WORKER SKILLS ==========
INSERT INTO worker_skills (worker_id, skill, level, verified, completed_jobs)
VALUES
  ('00000000-0000-0000-0000-000000000010', 'ac_repair', 5, true, 20),
  ('00000000-0000-0000-0000-000000000010', 'electricity', 4, true, 15),
  ('00000000-0000-0000-0000-000000000010', 'plumbing', 3, true, 12),
  ('00000000-0000-0000-0000-000000000011', 'ac_repair', 4, true, 15),
  ('00000000-0000-0000-0000-000000000011', 'appliance', 3, true, 8),
  ('00000000-0000-0000-0000-000000000012', 'electricity', 4, false, 0),
  ('00000000-0000-0000-0000-000000000012', 'plumbing', 3, false, 0)
ON CONFLICT (worker_id, skill) DO NOTHING;

-- ========== SERVICE REQUESTS ==========
INSERT INTO service_requests (id, customer_id, description, category, diagnosis, price_estimate, status)
VALUES
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001',
   'Máy lạnh không lạnh, chảy nước', 'ac_repair',
   '{"diagnosis": "Thiếu gas hoặc lọc bụi bẩn", "severity": "medium", "recommended_skills": ["ac_repair"]}',
   '{"min": 300000, "max": 800000, "currency": "VND"}',
   'priced'),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000002',
   'Đèn phòng khách chập chờn', 'electricity',
   '{"diagnosis": "Có thể hỏng công tắc hoặc đấu dây lỏng", "severity": "low", "recommended_skills": ["electricity"]}',
   '{"min": 100000, "max": 300000, "currency": "VND"}',
   'priced'),
  ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000003',
   'Vòi nước bếp bị rò rỉ', 'plumbing',
   NULL, NULL,
   'diagnosing')
ON CONFLICT (id) DO NOTHING;

-- ========== ORDERS ==========
INSERT INTO orders (request_id, customer_id, worker_id, location_lat, location_lng, address, category, description, diagnosis, status, estimated_price, final_price, platform_fee, worker_payout, payment_status, rating, review_comment, completed_at)
VALUES
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010',
   10.7769, 106.7009, '123 Nguyễn Huệ, Q.1, TP.HCM',
   'ac_repair', 'Máy lạnh không lạnh, chảy nước',
   '{"diagnosis": "Thiếu gas, cần nạp thêm", "severity": "medium"}',
   'completed', 500000, 450000, 50000, 400000, 'paid', 5, 'Thợ làm tốt, đúng hẹn', NOW() - INTERVAL '7 days'),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000011',
   10.7822, 106.6897, '456 Lê Lợi, Q.1, TP.HCM',
   'electricity', 'Đèn phòng khách chập chờn',
   '{"diagnosis": "Công tắc hỏng, cần thay mới", "severity": "low"}',
   'in_progress', 200000, NULL, 20000, 180000, 'unpaid', NULL, NULL, NULL),
  (NULL, '00000000-0000-0000-0000-000000000003', NULL,
   10.7625, 106.6825, '789 Võ Văn Tần, Q.3, TP.HCM',
   'plumbing', 'Vòi nước bếp bị rò rỉ', NULL,
   'pending', 300000, NULL, 30000, 270000, 'unpaid', NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- ========== TRANSACTIONS ==========
INSERT INTO transactions (order_id, user_id, gateway, gateway_txn_id, amount, currency, fee, status, metadata, succeeded_at)
SELECT
  id, customer_id, 'vnpay', 'VNP_TEST_' || id, final_price, 'VND', platform_fee, 'succeeded',
  '{"bank_code": "NCB", "card_type": "ATM"}', completed_at
FROM orders
WHERE status = 'completed' AND payment_status = 'paid'
ON CONFLICT DO NOTHING;