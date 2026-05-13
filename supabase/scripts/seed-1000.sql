-- Vifixa AI — Seed 1000 Test Users + Orders + Messages
-- Run: npx supabase db query --linked < supabase/scripts/seed-1000.sql

-- ============================================
-- HELPER FUNCTION: Create auth user
-- ============================================
CREATE OR REPLACE FUNCTION public.create_test_auth_user(
  p_email TEXT,
  p_password TEXT
) RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;
  IF v_user_id IS NOT NULL THEN RETURN v_user_id; END IF;

  INSERT INTO auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token,
    email_change, email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    p_email,
    crypt(p_password, gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    NOW(), NOW(), '', '', '', ''
  )
  RETURNING id INTO v_user_id;

  INSERT INTO auth.identities (
    provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) VALUES (
    v_user_id, v_user_id,
    jsonb_build_object('sub', v_user_id, 'email', p_email),
    'email', NOW(), NOW(), NOW()
  );

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 1: CREATE 1000 USERS
-- ============================================
DO $$
DECLARE
  cats TEXT[] := ARRAY['electricity','plumbing','appliance','air_conditioning','camera','painting','lock_smith','carpentry','cleaning','hvac'];
  dists TEXT[] := ARRAY['Dist 1','Dist 2','Dist 3','Dist 4','Dist 5','Dist 6','Dist 7','Dist 8','Dist 9','Dist 10','Dist 11','Dist 12','Binh Thanh','Phu Nhuan','Go Vap','Tan Binh','Tan Phu','Thu Duc'];
  fnames TEXT[] := ARRAY['Nguyễn','Trần','Lê','Phạm','Hoàng','Huỳnh','Phan','Vũ','Đặng','Bùi','Đỗ','Hồ','Ngô','Dương','Lý'];
  mnames TEXT[] := ARRAY['Văn','Thị','Đức','Minh','Quốc','Hữu','Công','Thanh','Ngọc','Anh'];
  lnames TEXT[] := ARRAY['Nam','Hùng','Dũng','Mạnh','Tuấn','Linh','Hương','Mai','Lan','Phương','Long','Thắng','Hiếu','Tâm','Sơn'];
  uid UUID; role TEXT; email TEXT; phone TEXT; name TEXT;
  cids UUID[] := '{}'::UUID[]; wids UUID[] := '{}'::UUID[]; aids UUID[] := '{}'::UUID[];
  aidx INT;
BEGIN
  RAISE NOTICE 'Step 1: Creating 1000 users...';
  FOR i IN 1..1000 LOOP
    role := CASE WHEN i <= 400 THEN 'customer' WHEN i <= 800 THEN 'worker' ELSE 'admin' END;
    email := role || '.test' || i || '@vifixa.test';
    uid := public.create_test_auth_user(email, 'Test123!@#');
    phone := '09' || LPAD(floor(random() * 100000000)::TEXT, 8, '0');
    name := CASE WHEN role = 'admin' THEN 'Admin Vifixa ' || i
                 ELSE fnames[1 + floor(random() * 15)] || ' ' || mnames[1 + floor(random() * 10)] || ' ' || lnames[1 + floor(random() * 15)] END;

    INSERT INTO public.profiles (id, email, phone, role, full_name, updated_at)
    VALUES (uid, email, phone, role, name, NOW())
    ON CONFLICT (id) DO UPDATE SET phone = EXCLUDED.phone, full_name = EXCLUDED.full_name, updated_at = NOW();

    IF role = 'worker' THEN
      INSERT INTO public.workers (user_id, skills, service_areas, trust_score, is_verified, avg_earnings)
      VALUES (uid, 
        (SELECT jsonb_agg(v) FROM (SELECT unnest(cats) v ORDER BY random() LIMIT 2 + floor(random() * 4)) t),
        (SELECT jsonb_agg(v) FROM (SELECT unnest(dists) v ORDER BY random() LIMIT 2 + floor(random() * 5)) t),
        30 + floor(random() * 71),
        random() > 0.3,
        500000 + floor(random() * 4500001)
      )
      ON CONFLICT (user_id) DO NOTHING;
      wids := array_append(wids, uid);
    END IF;
    IF role = 'customer' THEN cids := array_append(cids, uid); END IF;
    IF role = 'admin' THEN aids := array_append(aids, uid); END IF;

    IF i % 100 = 0 THEN RAISE NOTICE '  [%] users created', i; END IF;
  END LOOP;
  RAISE NOTICE 'Created: % cust, % work, % admin', array_length(cids,1), array_length(wids,1), array_length(aids,1);
END $$;

-- ============================================
-- STEP 2: CREATE 1000 ORDERS
-- ============================================
DO $$
DECLARE
  cats TEXT[] := ARRAY['electricity','plumbing','appliance','air_conditioning','camera','painting','lock_smith','carpentry','cleaning','hvac'];
  descs TEXT[] := ARRAY['Sửa vòi nước rò rỉ','Thay bóng đèn','Sửa ổ điện hở','Vệ sinh máy lạnh','Sửa tủ lạnh không lạnh','Lắp camera mới','Sơn tường','Sửa khóa cửa','Thông bồn cầu','Sửa máy giặt'];
  stats TEXT[] := ARRAY['pending','matched','in_progress','completed','cancelled'];
  cids UUID[]; wids UUID[]; cid UUID; wid UUID; stat TEXT; est INT;
  cnt INT := 0;
BEGIN
  SELECT array_agg(id) INTO cids FROM public.profiles WHERE role = 'customer';
  SELECT array_agg(user_id) INTO wids FROM public.workers;

  RAISE NOTICE 'Step 2: Creating 1000 orders...';
  FOR i IN 1..1000 LOOP
    cid := cids[1 + floor(random() * array_length(cids, 1))];
    wid := CASE WHEN random() > 0.15 THEN wids[1 + floor(random() * array_length(wids, 1))] ELSE NULL END;
    stat := stats[1 + floor(random() * 5)];
    IF wid IS NOT NULL AND stat = 'pending' THEN
      stat := (ARRAY['matched','in_progress','completed','cancelled'])[1 + floor(random() * 4)];
    END IF;
    est := 200000 + floor(random() * 4800001);

    INSERT INTO public.orders (customer_id, worker_id, category, description, estimated_price, final_price, status, rating, created_at)
    VALUES (
      cid, wid,
      cats[1 + floor(random() * 10)],
      descs[1 + floor(random() * 10)],
      est,
      CASE WHEN stat = 'completed' THEN est + floor(random() * 550001) - 50000 ELSE NULL END,
      stat,
      CASE WHEN stat = 'completed' AND random() > 0.2 THEN 3 + floor(random() * 3) ELSE NULL END,
      NOW() - (random() * 30 || ' days')::INTERVAL
    );
    cnt := cnt + 1;
    IF i % 200 = 0 THEN RAISE NOTICE '  [%] orders', i; END IF;
  END LOOP;
  RAISE NOTICE 'Orders created: %', cnt;
END $$;

-- ============================================
-- STEP 3: CREATE CHAT SESSIONS + MESSAGES
-- ============================================
DO $$
DECLARE
  cids UUID[]; sid UUID;
  msgs TEXT[] := ARRAY['Máy lạnh không lạnh','Vòi nước rò rỉ','Tủ lạnh kêu to','Đèn bếp chập','Camera mất kết nối','Tường nứt','Cửa kẹt','Bồn cầu tắc','Máy giặt không vắt','Ổ điện hở'];
  diags TEXT[] := ARRAY['Lỗi bo mạch','Hỏng tụ điện','Gãy dây curoa','Tắc đường ống','Mòn gioăng cao su','Chạm mass','Đứt dây điện'];
  sessions INT := 0; messages INT := 0;
  mcount INT;
BEGIN
  SELECT array_agg(id) INTO cids FROM public.profiles WHERE role = 'customer';
  RAISE NOTICE 'Step 3: Creating chat sessions...';
  
  FOR i IN 1..300 LOOP
    INSERT INTO public.chat_sessions (user_id, session_type, status, context)
    VALUES (
      cids[1 + floor(random() * array_length(cids, 1))],
      (ARRAY['support','diagnosis','booking'])[1 + floor(random() * 3)],
      (ARRAY['active','completed','abandoned'])[1 + floor(random() * 3)],
      jsonb_build_object('category', (ARRAY['electricity','plumbing','appliance','air_conditioning','camera'])[1 + floor(random() * 5)])
    )
    RETURNING id INTO sid;

    mcount := 2 + floor(random() * 14);
    FOR j IN 1..mcount LOOP
      INSERT INTO public.chat_messages (session_id, role, content, metadata)
      VALUES (
        sid,
        CASE WHEN j % 2 = 1 THEN 'user' ELSE 'assistant' END,
        msgs[1 + floor(random() * 10)],
        CASE WHEN j % 3 = 0 THEN jsonb_build_object('diagnosis', diags[1 + floor(random() * 7)]) ELSE '{}'::jsonb END
      );
      messages := messages + 1;
    END LOOP;
    sessions := sessions + 1;
    IF i % 100 = 0 THEN RAISE NOTICE '  [%] sessions, % msgs', sessions, messages; END IF;
  END LOOP;
  RAISE NOTICE 'Chat data: % sessions, % messages', sessions, messages;
END $$;

-- ============================================
-- STEP 4: CREATE COMPLAINTS
-- ============================================
DO $$
DECLARE
  rec RECORD; cnt INT := 0;
  types TEXT[] := ARRAY['poor_quality','late_arrival','wrong_price','rude_behavior','wrong_parts'];
  dscs TEXT[] := ARRAY['Thợ làm cẩu thả','Đến trễ','Báo giá sai','Thái độ không tốt','Sai linh kiện'];
BEGIN
  RAISE NOTICE 'Step 4: Creating complaints...';
  FOR rec IN SELECT id, customer_id FROM public.orders WHERE status = 'completed' LIMIT 50 LOOP
    INSERT INTO public.complaints (order_id, customer_id, complaint_type, description, status)
    VALUES (rec.id, rec.customer_id, types[1 + floor(random() * 5)], dscs[1 + floor(random() * 5)], (ARRAY['pending','investigating','resolved'])[1 + floor(random() * 3)]);
    cnt := cnt + 1;
  END LOOP;
  RAISE NOTICE 'Complaints: %', cnt;
END $$;

-- ============================================
-- STEP 5: CALCULATE TRUST SCORES
-- ============================================
DO $$
DECLARE
  wid UUID;
BEGIN
  RAISE NOTICE 'Step 5: Calculating trust scores...';
  FOR wid IN SELECT user_id FROM public.workers LOOP
    BEGIN
      PERFORM calculate_trust_score(wid);
    EXCEPTION WHEN OTHERS THEN END;
  END LOOP;
  RAISE NOTICE 'Trust scores calculated';
END $$;

-- ============================================
-- CLEANUP
-- ============================================
DROP FUNCTION IF EXISTS public.create_test_auth_user(TEXT, TEXT);

DO $$ BEGIN RAISE NOTICE '🎉 SEED COMPLETE'; END $$;
