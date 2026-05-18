-- Phase 21: Multi-Service Expansion
-- Seed data for 8 services: cleaning, delivery, moving, elder_care, child_care, pet_care, tutoring, massage
-- 2026-06-01

-- ========== 1. Service Definitions ==========

INSERT INTO agent_actions (id, domain, name, description, handler, autonomy_level, risk_level, confirm_message, persona, is_active, required_fields, pricing_rules) VALUES
-- Cleaning
('cleaning.detect', 'service', 'cleaning.detect', 'Nhận diện dịch vụ dọn dẹp', 'serviceRegistry.detect()', 1, 'low', NULL, ARRAY['customer'], true, '["area_sqm", "cleaning_type"]', '{"base_price": 90000, "unit": "hour", "min_hours": 2, "pricing": {"basic": 90000, "deep": 150000, "post_construction": 120000}}'::jsonb),
('cleaning.quote', 'service', 'cleaning.quote', 'Báo giá dịch vụ dọn dẹp', 'serviceRegistry.quote()', 1, 'low', NULL, ARRAY['customer'], true, '["area_sqm", "cleaning_type", "hours"]', '{"base_price": 90000, "unit": "hour"}'::jsonb),
('cleaning.book', 'service', 'cleaning.book', 'Đặt dịch vụ dọn dẹp', 'POST /functions/v1/customer-requests', 2, 'medium', 'Xác nhận đặt dịch vụ dọn dẹp?', ARRAY['customer'], true, '["area_sqm", "cleaning_type", "schedule_time", "address"]', '{"base_price": 90000, "unit": "hour"}'::jsonb),

-- Deep Cleaning
('deep_cleaning.detect', 'service', 'deep_cleaning.detect', 'Nhận diện tổng vệ sinh', 'serviceRegistry.detect()', 1, 'low', NULL, ARRAY['customer'], true, '["area_sqm", "property_type"]', '{"base_price": 25000, "unit": "sqm", "pricing": {"under_50sqm": 40000, "50_100sqm": 30000, "over_100sqm": 25000}}'::jsonb),
('deep_cleaning.quote', 'service', 'deep_cleaning.quote', 'Báo giá tổng vệ sinh', 'serviceRegistry.quote()', 1, 'low', NULL, ARRAY['customer'], true, '["area_sqm", "property_type"]', '{"base_price": 25000, "unit": "sqm"}'::jsonb),
('deep_cleaning.book', 'service', 'deep_cleaning.book', 'Đặt tổng vệ sinh', 'POST /functions/v1/customer-requests', 2, 'medium', 'Xác nhận đặt tổng vệ sinh?', ARRAY['customer'], true, '["area_sqm", "property_type", "schedule_time", "address"]', '{"base_price": 25000, "unit": "sqm"}'::jsonb),

-- Delivery
('delivery.detect', 'service', 'delivery.detect', 'Nhận diện dịch vụ giao hàng', 'serviceRegistry.detect()', 1, 'low', NULL, ARRAY['customer'], true, '["pickup_address", "dropoff_address", "package_weight"]', '{"base_price": 15000, "unit": "order", "per_km": 5000, "free_km": 2, "pricing": {"standard": 15000, "express": 30000, "instant": 45000}}'::jsonb),
('delivery.quote', 'service', 'delivery.quote', 'Báo giá giao hàng', 'serviceRegistry.quote()', 1, 'low', NULL, ARRAY['customer'], true, '["distance_km", "package_weight", "delivery_type"]', '{"base_price": 15000, "per_km": 5000}'::jsonb),
('delivery.book', 'service', 'delivery.book', 'Đặt giao hàng', 'POST /functions/v1/customer-requests', 2, 'medium', 'Xác nhận đặt giao hàng?', ARRAY['customer'], true, '["pickup_address", "dropoff_address", "package_weight", "delivery_type"]', '{"base_price": 15000, "per_km": 5000}'::jsonb),

-- Moving
('moving.detect', 'service', 'moving.detect', 'Nhận diện dịch vụ chuyển nhà', 'serviceRegistry.detect()', 1, 'low', NULL, ARRAY['customer'], true, '["from_address", "to_address", "property_type", "vehicle_type"]', '{"base_price": 1200000, "unit": "package", "pricing": {"1pn": 1500000, "2pn": 2500000, "3pn": 4000000, "office": 3000000}}'::jsonb),
('moving.quote', 'service', 'moving.quote', 'Báo giá chuyển nhà', 'serviceRegistry.quote()', 1, 'low', NULL, ARRAY['customer'], true, '["distance_km", "property_type", "vehicle_type"]', '{"base_price": 1200000, "unit": "package"}'::jsonb),
('moving.book', 'service', 'moving.book', 'Đặt chuyển nhà', 'POST /functions/v1/customer-requests', 2, 'medium', 'Xác nhận đặt chuyển nhà?', ARRAY['customer'], true, '["from_address", "to_address", "property_type", "vehicle_type", "schedule_time"]', '{"base_price": 1200000, "unit": "package"}'::jsonb),

-- Elder Care
('elder_care.detect', 'service', 'elder_care.detect', 'Nhận diện dịch vụ chăm sóc người già', 'serviceRegistry.detect()', 1, 'low', NULL, ARRAY['customer'], true, '["care_type", "hours_per_day", "medical_condition"]', '{"base_price": 120000, "unit": "hour", "pricing": {"basic": 120000, "medical": 180000, "overnight": 1500000}}'::jsonb),
('elder_care.quote', 'service', 'elder_care.quote', 'Báo giá chăm sóc người già', 'serviceRegistry.quote()', 1, 'low', NULL, ARRAY['customer'], true, '["care_type", "hours_per_day"]', '{"base_price": 120000, "unit": "hour"}'::jsonb),
('elder_care.book', 'service', 'elder_care.book', 'Đặt chăm sóc người già', 'POST /functions/v1/customer-requests', 2, 'medium', 'Xác nhận đặt dịch vụ chăm sóc?', ARRAY['customer'], true, '["care_type", "hours_per_day", "schedule_time", "address", "medical_condition"]', '{"base_price": 120000, "unit": "hour"}'::jsonb),

-- Child Care
('child_care.detect', 'service', 'child_care.detect', 'Nhận diện dịch vụ trông trẻ', 'serviceRegistry.detect()', 1, 'low', NULL, ARRAY['customer'], true, '["child_age", "hours", "tutoring_needed"]', '{"base_price": 100000, "unit": "hour", "pricing": {"basic": 100000, "with_tutoring": 180000}}'::jsonb),
('child_care.quote', 'service', 'child_care.quote', 'Báo giá trông trẻ', 'serviceRegistry.quote()', 1, 'low', NULL, ARRAY['customer'], true, '["child_age", "hours"]', '{"base_price": 100000, "unit": "hour"}'::jsonb),
('child_care.book', 'service', 'child_care.book', 'Đặt trông trẻ', 'POST /functions/v1/customer-requests', 2, 'medium', 'Xác nhận đặt dịch vụ trông trẻ?', ARRAY['customer'], true, '["child_age", "hours", "schedule_time", "address", "tutoring_needed"]', '{"base_price": 100000, "unit": "hour"}'::jsonb),

-- Pet Care
('pet_care.detect', 'service', 'pet_care.detect', 'Nhận diện dịch vụ chăm thú cưng', 'serviceRegistry.detect()', 1, 'low', NULL, ARRAY['customer'], true, '["pet_type", "pet_weight", "service_type"]', '{"base_price": 100000, "unit": "session", "pricing": {"walk": 80000, "bath_small": 100000, "bath_medium": 180000, "bath_large": 250000, "grooming": 250000, "sitting": 300000}}'::jsonb),
('pet_care.quote', 'service', 'pet_care.quote', 'Báo giá chăm thú cưng', 'serviceRegistry.quote()', 1, 'low', NULL, ARRAY['customer'], true, '["pet_type", "pet_weight", "service_type"]', '{"base_price": 100000, "unit": "session"}'::jsonb),
('pet_care.book', 'service', 'pet_care.book', 'Đặt chăm thú cưng', 'POST /functions/v1/customer-requests', 2, 'medium', 'Xác nhận đặt dịch vụ chăm thú cưng?', ARRAY['customer'], true, '["pet_type", "pet_weight", "service_type", "schedule_time", "address"]', '{"base_price": 100000, "unit": "session"}'::jsonb),

-- Tutoring
('tutoring.detect', 'service', 'tutoring.detect', 'Nhận diện dịch vụ gia sư', 'serviceRegistry.detect()', 1, 'low', NULL, ARRAY['customer'], true, '["subject", "grade_level", "hours"]', '{"base_price": 150000, "unit": "hour", "pricing": {"primary": 150000, "middle": 180000, "high": 220000, "university_prep": 300000, "language": 250000, "programming": 350000}}'::jsonb),
('tutoring.quote', 'service', 'tutoring.quote', 'Báo giá gia sư', 'serviceRegistry.quote()', 1, 'low', NULL, ARRAY['customer'], true, '["subject", "grade_level", "hours"]', '{"base_price": 150000, "unit": "hour"}'::jsonb),
('tutoring.book', 'service', 'tutoring.book', 'Đặt gia sư', 'POST /functions/v1/customer-requests', 2, 'medium', 'Xác nhận đặt gia sư?', ARRAY['customer'], true, '["subject", "grade_level", "hours", "schedule_time", "address"]', '{"base_price": 150000, "unit": "hour"}'::jsonb),

-- Massage
('massage.detect', 'service', 'massage.detect', 'Nhận diện dịch vụ massage', 'serviceRegistry.detect()', 1, 'low', NULL, ARRAY['customer'], true, '["massage_type", "duration"]', '{"base_price": 250000, "unit": "session", "pricing": {"relax_60": 280000, "relax_90": 400000, "acupressure_60": 350000, "sports_60": 400000, "physio_60": 500000}}'::jsonb),
('massage.quote', 'service', 'massage.quote', 'Báo giá massage', 'serviceRegistry.quote()', 1, 'low', NULL, ARRAY['customer'], true, '["massage_type", "duration"]', '{"base_price": 250000, "unit": "session"}'::jsonb),
('massage.book', 'service', 'massage.book', 'Đặt massage', 'POST /functions/v1/customer-requests', 2, 'medium', 'Xác nhận đặt massage?', ARRAY['customer'], true, '["massage_type", "duration", "schedule_time", "address"]', '{"base_price": 250000, "unit": "session"}'::jsonb);

-- ========== 2. Policy Matrix for New Services ==========

-- Customer policies for new services (L2 = auto with confirmation)
INSERT INTO agent_policies (action_id, persona, autonomy_level, requires_approval, max_daily_usage) VALUES
-- Cleaning
('cleaning.detect', 'customer', 2, false, 50),
('cleaning.quote', 'customer', 2, false, 50),
('cleaning.book', 'customer', 2, true, 10),
-- Deep Cleaning
('deep_cleaning.detect', 'customer', 2, false, 50),
('deep_cleaning.quote', 'customer', 2, false, 50),
('deep_cleaning.book', 'customer', 2, true, 10),
-- Delivery
('delivery.detect', 'customer', 2, false, 50),
('delivery.quote', 'customer', 2, false, 50),
('delivery.book', 'customer', 2, true, 20),
-- Moving
('moving.detect', 'customer', 2, false, 20),
('moving.quote', 'customer', 2, false, 20),
('moving.book', 'customer', 2, true, 5),
-- Elder Care
('elder_care.detect', 'customer', 2, false, 50),
('elder_care.quote', 'customer', 2, false, 50),
('elder_care.book', 'customer', 2, true, 10),
-- Child Care
('child_care.detect', 'customer', 2, false, 50),
('child_care.quote', 'customer', 2, false, 50),
('child_care.book', 'customer', 2, true, 10),
-- Pet Care
('pet_care.detect', 'customer', 2, false, 50),
('pet_care.quote', 'customer', 2, false, 50),
('pet_care.book', 'customer', 2, true, 10),
-- Tutoring
('tutoring.detect', 'customer', 2, false, 50),
('tutoring.quote', 'customer', 2, false, 50),
('tutoring.book', 'customer', 2, true, 10),
-- Massage
('massage.detect', 'customer', 2, false, 50),
('massage.quote', 'customer', 2, false, 50),
('massage.book', 'customer', 2, true, 10);

-- Worker policies for new services (L3 = auto for job finding)
INSERT INTO agent_policies (action_id, persona, autonomy_level, requires_approval, max_daily_usage) VALUES
('cleaning.detect', 'worker', 3, false, 100),
('delivery.detect', 'worker', 3, false, 100),
('moving.detect', 'worker', 3, false, 50),
('elder_care.detect', 'worker', 3, false, 50),
('child_care.detect', 'worker', 3, false, 50),
('pet_care.detect', 'worker', 3, false, 50),
('tutoring.detect', 'worker', 3, false, 50),
('massage.detect', 'worker', 3, false, 50);

-- Admin policies for new services (L4 = full auto for monitoring)
INSERT INTO agent_policies (action_id, persona, autonomy_level, requires_approval, max_daily_usage) VALUES
('cleaning.detect', 'admin', 4, false, 1000),
('deep_cleaning.detect', 'admin', 4, false, 1000),
('delivery.detect', 'admin', 4, false, 1000),
('moving.detect', 'admin', 4, false, 1000),
('elder_care.detect', 'admin', 4, false, 1000),
('child_care.detect', 'admin', 4, false, 1000),
('pet_care.detect', 'admin', 4, false, 1000),
('tutoring.detect', 'admin', 4, false, 1000),
('massage.detect', 'admin', 4, false, 1000);

-- ========== 3. Service Skills ==========

-- Skills required for each service
INSERT INTO agent_actions (id, domain, name, description, handler, autonomy_level, risk_level, confirm_message, persona, is_active, required_fields, pricing_rules) VALUES
-- Cleaning skills
('skill.cleaning_basic', 'skill', 'skill.cleaning_basic', 'Kỹ năng dọn dẹp cơ bản', 'skillRegistry.verify()', 0, 'low', NULL, ARRAY['worker'], true, '["experience_years", "references"]', NULL),
('skill.cleaning_deep', 'skill', 'skill.cleaning_deep', 'Kỹ năng tổng vệ sinh', 'skillRegistry.verify()', 0, 'low', NULL, ARRAY['worker'], true, '["experience_years", "equipment"]', NULL),
('skill.cleaning_office', 'skill', 'skill.cleaning_office', 'Kỹ năng dọn văn phòng', 'skillRegistry.verify()', 0, 'low', NULL, ARRAY['worker'], true, '["experience_years", "team_size"]', NULL),

-- Delivery skills
('skill.delivery_motorbike', 'skill', 'skill.delivery_motorbike', 'Giao hàng xe máy', 'skillRegistry.verify()', 0, 'low', NULL, ARRAY['worker'], true, '["license", "vehicle_type"]', NULL),
('skill.delivery_truck', 'skill', 'skill.delivery_truck', 'Giao hàng xe tải', 'skillRegistry.verify()', 0, 'low', NULL, ARRAY['worker'], true, '["license", "vehicle_type", "tonnage"]', NULL),

-- Moving skills
('skill.moving_team', 'skill', 'skill.moving_team', 'Đội chuyển nhà', 'skillRegistry.verify()', 0, 'low', NULL, ARRAY['worker'], true, '["team_size", "vehicle_type", "insurance"]', NULL),

-- Care skills
('skill.elder_care_basic', 'skill', 'skill.elder_care_basic', 'Chăm sóc người già cơ bản', 'skillRegistry.verify()', 0, 'low', NULL, ARRAY['worker'], true, '["experience_years", "certificates"]', NULL),
('skill.elder_care_medical', 'skill', 'skill.elder_care_medical', 'Chăm sóc người già có bệnh nền', 'skillRegistry.verify()', 0, 'medium', NULL, ARRAY['worker'], true, '["nursing_license", "experience_years"]', NULL),
('skill.child_care', 'skill', 'skill.child_care', 'Trông trẻ', 'skillRegistry.verify()', 0, 'low', NULL, ARRAY['worker'], true, '["experience_years", "background_check"]', NULL),
('skill.pet_care', 'skill', 'skill.pet_care', 'Chăm thú cưng', 'skillRegistry.verify()', 0, 'low', NULL, ARRAY['worker'], true, '["experience_years", "pet_first_aid"]', NULL),

-- Tutoring skills
('skill.tutoring_primary', 'skill', 'skill.tutoring_primary', 'Gia sư tiểu học', 'skillRegistry.verify()', 0, 'low', NULL, ARRAY['worker'], true, '["education_level", "subject_expertise"]', NULL),
('skill.tutoring_secondary', 'skill', 'skill.tutoring_secondary', 'Gia sư THCS/THPT', 'skillRegistry.verify()', 0, 'low', NULL, ARRAY['worker'], true, '["education_level", "subject_expertise"]', NULL),
('skill.tutoring_language', 'skill', 'skill.tutoring_language', 'Gia sư ngoại ngữ', 'skillRegistry.verify()', 0, 'low', NULL, ARRAY['worker'], true, '["language_cert", "teaching_experience"]', NULL),
('skill.tutoring_programming', 'skill', 'skill.tutoring_programming', 'Gia sư lập trình', 'skillRegistry.verify()', 0, 'low', NULL, ARRAY['worker'], true, '["tech_stack", "project_experience"]', NULL),

-- Massage skills
('skill.massage_relax', 'skill', 'skill.massage_relax', 'Massage thư giãn', 'skillRegistry.verify()', 0, 'low', NULL, ARRAY['worker'], true, '["certification", "experience_years"]', NULL),
('skill.massage_acupressure', 'skill', 'skill.massage_acupressure', 'Massage bấm huyệt', 'skillRegistry.verify()', 0, 'medium', NULL, ARRAY['worker'], true, '["medical_certification", "experience_years"]', NULL),
('skill.massage_physio', 'skill', 'skill.massage_physio', 'Vật lý trị liệu', 'skillRegistry.verify()', 0, 'high', NULL, ARRAY['worker'], true, '["physiotherapy_license", "experience_years"]', NULL);

-- ========== 4. Service Categories for UI ==========

-- Add service categories for display
INSERT INTO agent_actions (id, domain, name, description, handler, autonomy_level, risk_level, confirm_message, persona, is_active, required_fields, pricing_rules) VALUES
('service_category.cleaning', 'category', 'service_category.cleaning', 'Dọn dẹp nhà cửa', 'category.display()', 0, 'low', NULL, ARRAY['customer', 'worker', 'admin'], true, '[]', '{"icon": "🧹", "color": "emerald", "order": 2}'::jsonb),
('service_category.delivery', 'category', 'service_category.delivery', 'Giao hàng', 'category.display()', 0, 'low', NULL, ARRAY['customer', 'worker', 'admin'], true, '[]', '{"icon": "📦", "color": "blue", "order": 3}'::jsonb),
('service_category.moving', 'category', 'service_category.moving', 'Chuyển nhà', 'category.display()', 0, 'low', NULL, ARRAY['customer', 'worker', 'admin'], true, '[]', '{"icon": "🚚", "color": "orange", "order": 4}'::jsonb),
('service_category.elder_care', 'category', 'service_category.elder_care', 'Chăm sóc người già', 'category.display()', 0, 'low', NULL, ARRAY['customer', 'worker', 'admin'], true, '[]', '{"icon": "👴", "color": "purple", "order": 5}'::jsonb),
('service_category.child_care', 'category', 'service_category.child_care', 'Trông trẻ', 'category.display()', 0, 'low', NULL, ARRAY['customer', 'worker', 'admin'], true, '[]', '{"icon": "👶", "color": "pink", "order": 6}'::jsonb),
('service_category.pet_care', 'category', 'service_category.pet_care', 'Chăm thú cưng', 'category.display()', 0, 'low', NULL, ARRAY['customer', 'worker', 'admin'], true, '[]', '{"icon": "🐾", "color": "amber", "order": 7}'::jsonb),
('service_category.tutoring', 'category', 'service_category.tutoring', 'Gia sư', 'category.display()', 0, 'low', NULL, ARRAY['customer', 'worker', 'admin'], true, '[]', '{"icon": "📚", "color": "indigo", "order": 8}'::jsonb),
('service_category.massage', 'category', 'service_category.massage', 'Massage tại nhà', 'category.display()', 0, 'low', NULL, ARRAY['customer', 'worker', 'admin'], true, '[]', '{"icon": "💆", "color": "teal", "order": 9}'::jsonb);
