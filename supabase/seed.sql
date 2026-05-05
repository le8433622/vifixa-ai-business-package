-- Seed data for Vifixa AI development
-- Based on 14_OKR_KPI.md targets

-- Note: Profiles are created via Supabase Auth, this seeds workers, orders, and trust scores

-- Insert sample worker profiles (run after creating auth users)
-- Replace UUIDs with actual auth.users ids after signup

-- Sample worker 1 (Electrician)
INSERT INTO public.workers (user_id, skills, service_areas, trust_score, is_verified, avg_earnings)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  '["electricity", "lighting", "wiring"]'::jsonb,
  '["District 1", "District 2", "District 3"]'::jsonb,
  85,
  true,
  2500000
) ON CONFLICT (user_id) DO NOTHING;

-- Sample worker 2 (Plumber)
INSERT INTO public.workers (user_id, skills, service_areas, trust_score, is_verified, avg_earnings)
VALUES (
  '00000000-0000-0000-0000-000000000002'::uuid,
  '["plumbing", "piping", "drainage"]'::jsonb,
  '["District 1", "District 4", "District 5"]'::jsonb,
  90,
  true,
  3000000
) ON CONFLICT (user_id) DO NOTHING;

-- Sample orders
INSERT INTO public.orders (customer_id, worker_id, category, description, ai_diagnosis, estimated_price, final_price, status)
VALUES (
  '00000000-0000-0000-0000-000000000003'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'electricity',
  'Light switch not working in bedroom',
  '{"diagnosis": "Possible faulty switch or wiring issue", "severity": "medium", "recommended_skills": ["electricity"]}'::jsonb,
  500000,
  450000,
  'completed'
) ON CONFLICT DO NOTHING;

-- Sample trust scores
INSERT INTO public.trust_scores (user_id, score, history)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  85,
  '[{"score": 80, "date": "2024-01-01"}, {"score": 85, "date": "2024-02-01"}]'::jsonb
) ON CONFLICT (user_id) DO NOTHING;

-- Sample AI logs
INSERT INTO public.ai_logs (order_id, agent_type, input, output)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'diagnosis',
  '{"description": "Light switch not working", "category": "electricity"}'::jsonb,
  '{"diagnosis": "Possible faulty switch", "severity": "medium", "confidence": 0.85}'::jsonb
) ON CONFLICT DO NOTHING;
