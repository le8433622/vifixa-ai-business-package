-- Realistic seed data for development & staging
-- Profiles (50), Orders (100), Transactions (50), Conversations (20), Service areas (10 HCMC poly), Disputes (5)
-- Uses actual schema column names from migrations

-- === PRODUCTION GUARD ===
-- This migration is DESTRUCTIVE. Only run in dev/staging.
DO $$
BEGIN
  IF current_setting('app.env', true) = 'production' THEN
    RAISE EXCEPTION 'seed_data migration cannot run in production. Set app.env = ''development'' to proceed.';
  END IF;
END;
$$;

-- === 0. Clean up before insert (dev only) ===
TRUNCATE TABLE
  ai_logs, check_in_events, escrow, refund_requests, workflow_states,
  conversations, complaints, messages, transactions, worker_earnings,
  commissions, orders, service_areas, workers,
  staking_positions, verification_badges, otp_codes, account_locks,
  deletion_requests, user_subscriptions, worker_boosts,
  in_app_notifications, user_notification_preferences, user_push_tokens,
  payment_intents, ai_action_requests, agent_runs, companion_sessions,
  companion_interactions, companion_memories, companion_profiles,
  verification_audit_log, broadcasts, kyc_documents, worker_portfolio,
  worker_location_history,
  profiles
CASCADE;

-- Add missing columns needed by existing trigger functions
ALTER TABLE workers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Disable triggers during seed insertion to avoid FK/timing issues
SET session_replication_role = 'replica';

-- === PROFILES ===
INSERT INTO profiles (id, email, phone, role, full_name, created_at)
SELECT
  gen_random_uuid(),
  format('user%s@vifixa.test', i),
  '09' || lpad(floor(random() * 100000000)::text, 9, '0'),
  CASE WHEN i <= 25 THEN 'worker' WHEN i <= 40 THEN 'customer' ELSE 'admin' END,
  (ARRAY['Nguyễn Văn An','Trần Thị Bích','Lê Hoàng Cường','Phạm Minh Đức','Hoàng Thị Em',
         'Đỗ Văn Phúc','Vũ Thị Giang','Ngô Quốc Huy','Đinh Công Khanh','Bùi Thị Lan',
         'Trương Văn Long','Lý Thị Minh','Hồ Văn Nam','Mai Thị Ngọc','Dương Văn Phát',
         'Đặng Thị Quỳnh','Nguyễn Văn Sơn','Phạm Thị Thanh','Lê Văn Tùng','Trần Thị Vân',
         'Hoàng Văn Anh','Vũ Thị Bình','Đỗ Văn Chiến','Trần Minh Đạt','Lê Thị Hương',
         'Phạm Văn Hải','Nguyễn Thị Hạnh','Đặng Văn Hiếu','Bùi Minh Hoàng','Võ Thị Hồng',
         'Lý Văn Hùng','Trần Thị Hương','Ngô Minh Khang','Đinh Thị Kiều','Hoàng Văn Lâm',
         'Mai Thị Linh','Phan Văn Long','Trương Thị Mỹ','Lê Minh Nghĩa','Nguyễn Thị Ngọc',
         'Phạm Văn Phước','Đỗ Thị Quyên','Vũ Văn Sỹ','Trần Thị Thảo','Lê Văn Thắng',
         'Hoàng Thị Thu','Ngô Văn Tiến','Phạm Thị Trang','Đặng Văn Trung','Bùi Thị Tuyết'])[i],
  now() - (random() * interval '180 days')
FROM generate_series(1, 50) AS i;

-- === WORKERS (for worker profiles) ===
INSERT INTO workers (id, user_id, full_name, skills, is_verified, trust_score, avg_earnings, order_count, rating_avg)
SELECT
  gen_random_uuid(),
  id,
  full_name,
  (ARRAY['["cleaning","repair"]','["plumbing","electrical"]','["moving","painting"]','["ac_repair","carpentry"]','["gardening","fumigation"]'])[floor(random() * 5 + 1)]::jsonb,
  random() > 0.2,
  floor(random() * 40 + 60)::int,
  (random() * 10000000 + 1000000)::int,
  floor(random() * 100)::int,
  round((random() * 2 + 3)::numeric, 1)
FROM profiles WHERE role = 'worker'
ON CONFLICT (user_id) DO NOTHING;

-- === ORDERS ===
INSERT INTO orders (customer_id, worker_id, category, description, status, estimated_price, final_price, location_lat, location_lng, created_at, completed_at)
SELECT
  (SELECT id FROM profiles WHERE role = 'customer' ORDER BY random() LIMIT 1),
  CASE WHEN random() > 0.3 THEN (SELECT user_id FROM workers ORDER BY random() LIMIT 1) ELSE NULL END,
  (ARRAY['cleaning','plumbing','electrical','moving','repair','gardening','painting','ac_repair','fumigation','carpentry'])[floor(random() * 10 + 1)],
  (ARRAY['Sửa máy lạnh không lạnh','Thông tắc bồn rửa chén','Lắp đặt đèn trần','Sơn lại tường nhà','Chuyển đồ qua quận mới',
         'Cắt tỉa cây cảnh','Sửa ống nước bể','Lắp máy nước nóng','Vệ sinh nhà cửa','Sửa khóa cửa'])[floor(random() * 10 + 1)],
  (ARRAY['pending','matched','in_progress','completed','cancelled','disputed'])[floor(random() * 6 + 1)],
  (random() * 5000000 + 100000)::int,
  CASE WHEN random() > 0.3 THEN (random() * 5000000 + 100000)::int ELSE NULL END,
  10.762622 + (random() - 0.5) * 0.1,
  106.660172 + (random() - 0.5) * 0.1,
  now() - (random() * interval '90 days'),
  CASE WHEN random() > 0.4 THEN now() - (random() * interval '30 days') ELSE NULL END
FROM generate_series(1, 100) AS i;

-- === TRANSACTIONS ===
INSERT INTO transactions (order_id, user_id, gateway, amount, currency, status, created_at)
SELECT
  (SELECT id FROM orders ORDER BY random() LIMIT 1),
  (SELECT id FROM profiles WHERE role IN ('customer','worker') ORDER BY random() LIMIT 1),
  (ARRAY['vnpay','stripe','wallet'])[floor(random() * 3 + 1)],
  (random() * 2000000 + 50000)::int,
  'VND',
  (ARRAY['succeeded','succeeded','succeeded','pending','failed'])[floor(random() * 5 + 1)],
  now() - (random() * interval '60 days')
FROM generate_series(1, 50) AS i;

-- === CONVERSATIONS + MESSAGES ===
DO $$
DECLARE
  conv_id UUID;
  c_id UUID;
  w_id UUID;
  msg_idx INT;
BEGIN
  FOR msg_idx IN 1..20 LOOP
    SELECT id INTO c_id FROM profiles WHERE role = 'customer' ORDER BY random() LIMIT 1;
    SELECT id INTO w_id FROM profiles WHERE role = 'worker' ORDER BY random() LIMIT 1;
    INSERT INTO conversations (customer_id, worker_id) VALUES (c_id, w_id)
    RETURNING id INTO conv_id;

    INSERT INTO messages (conversation_id, sender_id, content, created_at) VALUES
      (conv_id, c_id, (ARRAY['Chào bạn, mình cần sửa máy lạnh gấp','Báo giá giúp mình nhé','Ok, mình đồng ý','Cảm ơn bạn đã làm tốt','Cần thêm phụ tùng, báo anh chị sau'])[floor(random() * 5 + 1)], now() - (random() * interval '30 days')),
      (conv_id, w_id, (ARRAY['Dạ, bên em có thể qua chiều nay','Khoảng 500k bao gồm vật tư ạ','Em sẽ cố gắng trong 30 phút nữa','Vâng, cứ làm đi ạ','Anh chị có thể tới sớm hơn không?'])[floor(random() * 5 + 1)], now() - (random() * interval '29 days'));
  END LOOP;
END $$;

-- === SERVICE AREAS (10 HCMC districts, one per worker) ===
WITH worker_list AS (
  SELECT user_id, row_number() OVER (ORDER BY user_id) AS rn
  FROM workers
  LIMIT 10
), districts AS (
  SELECT row_number() OVER () AS rn, *
  FROM (VALUES
    ('Quận 1',    10.7769, 106.7009, 3.0, '[[106.690,10.770],[106.710,10.770],[106.715,10.785],[106.690,10.785],[106.690,10.770]]'::text),
    ('Quận 2',    10.7897, 106.7521, 4.0, '[[106.740,10.780],[106.770,10.780],[106.770,10.800],[106.740,10.800],[106.740,10.780]]'),
    ('Quận 3',    10.7790, 106.6823, 2.5, '[[106.672,10.773],[106.692,10.773],[106.692,10.785],[106.672,10.785],[106.672,10.773]]'),
    ('Quận 4',    10.7616, 106.7033, 2.0, '[[106.695,10.756],[106.712,10.756],[106.712,10.768],[106.695,10.768],[106.695,10.756]]'),
    ('Quận 5',    10.7558, 106.6640, 2.5, '[[106.654,10.750],[106.674,10.750],[106.674,10.762],[106.654,10.762],[106.654,10.750]]'),
    ('Quận 7',    10.7385, 106.7283, 4.0, '[[106.715,10.725],[106.745,10.725],[106.745,10.755],[106.715,10.755],[106.715,10.725]]'),
    ('Quận 10',   10.7714, 106.6655, 2.0, '[[106.656,10.765],[106.675,10.765],[106.675,10.778],[106.656,10.778],[106.656,10.765]]'),
    ('Bình Thạnh',10.8056, 106.7066, 3.5, '[[106.690,10.795],[106.720,10.795],[106.720,10.816],[106.690,10.816],[106.690,10.795]]'),
    ('Tân Bình',  10.7981, 106.6559, 3.5, '[[106.640,10.785],[106.670,10.785],[106.670,10.810],[106.640,10.810],[106.640,10.785]]'),
    ('Phú Nhuận', 10.8010, 106.6780, 2.5, '[[106.668,10.795],[106.688,10.795],[106.688,10.808],[106.668,10.808],[106.668,10.795]]')
  ) AS t(name, lat, lng, radius, coords)
)
INSERT INTO service_areas (worker_id, name, center_lat, center_lng, radius_km, geometry, is_active)
SELECT
  w.user_id, d.name, d.lat, d.lng, d.radius,
  jsonb_build_object('type','Polygon','coordinates',jsonb_build_array(d.coords::jsonb)),
  true
FROM districts d
JOIN worker_list w ON w.rn = d.rn;

-- === DISPUTES (insert into orders with disputed status) ===
DO $$
DECLARE
  o_id UUID;
  c_id UUID;
BEGIN
  FOR i IN 1..5 LOOP
    SELECT id INTO o_id FROM orders WHERE status = 'disputed' ORDER BY random() LIMIT 1;
    IF o_id IS NOT NULL THEN
      SELECT customer_id INTO c_id FROM orders WHERE id = o_id;
      INSERT INTO complaints (order_id, customer_id, complaint_type, description, status, created_at)
      VALUES (o_id, c_id,
        (ARRAY['quality','price','lateness','damage','incomplete'])[i],
        (ARRAY['Chất lượng dịch vụ không đạt yêu cầu','Giá cao hơn báo giá ban đầu','Thợ đến muộn 2 tiếng',
               'Làm hỏng đồ đạc trong nhà','Không hoàn thành đúng công việc'])[i],
        (ARRAY['pending','investigating','resolved'])[floor(random() * 3 + 1)],
        now() - (random() * interval '20 days'));
    END IF;
  END LOOP;
END $$;

-- Re-enable triggers
RESET session_replication_role;
