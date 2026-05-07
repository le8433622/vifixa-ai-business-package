-- AI Chat System Migration
-- Created: 2026-05-06
-- Description: Add chat_sessions, chat_messages, device_profiles, maintenance_schedules, price_standards, subscriptions

-- ============================================
-- 1. CHAT SESSIONS & MESSAGES
-- ============================================

-- Chat sessions table
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  session_type VARCHAR(50) DEFAULT 'support', -- support, diagnosis, booking
  status VARCHAR(20) DEFAULT 'active', -- active, completed, abandoned
  context JSONB DEFAULT '{}', -- { category, location, device_info, etc. }
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE NOT NULL,
  role VARCHAR(20) NOT NULL, -- user, assistant, system
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}', -- { diagnosis, price_estimate, actions, etc. }
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for chat tables
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_status ON chat_sessions(status);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

-- RLS for chat_sessions
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chat sessions"
  ON chat_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own chat sessions"
  ON chat_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chat sessions"
  ON chat_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS for chat_messages
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages from own sessions"
  ON chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
      AND chat_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in own sessions"
  ON chat_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
      AND chat_sessions.user_id = auth.uid()
    )
  );

-- ============================================
-- 2. DEVICE PROFILES & MAINTENANCE
-- ============================================

-- Device profiles table (digital home profile)
CREATE TABLE IF NOT EXISTS device_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  device_type VARCHAR(50) NOT NULL, -- air_conditioner, washing_machine, refrigerator, etc.
  brand VARCHAR(100),
  model VARCHAR(100),
  serial_number VARCHAR(100),
  purchase_date DATE,
  warranty_expiry DATE,
  installation_date DATE,
  location_in_home VARCHAR(100), -- living_room, bedroom_1, kitchen, etc.
  specifications JSONB DEFAULT '{}', -- { capacity, power, features, etc. }
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Maintenance schedules table
CREATE TABLE IF NOT EXISTS maintenance_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id UUID REFERENCES device_profiles(id) ON DELETE CASCADE NOT NULL,
  maintenance_type VARCHAR(50) NOT NULL, -- cleaning, inspection, repair, replacement
  scheduled_date DATE NOT NULL,
  frequency VARCHAR(20), -- once, monthly, quarterly, yearly
  last_completed DATE,
  next_due DATE,
  status VARCHAR(20) DEFAULT 'pending', -- pending, completed, overdue, cancelled
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for device tables
CREATE INDEX IF NOT EXISTS idx_device_profiles_user_id ON device_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_device_profiles_type ON device_profiles(device_type);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_device_id ON maintenance_schedules(device_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_due ON maintenance_schedules(next_due);

-- RLS for device_profiles
ALTER TABLE device_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own devices"
  ON device_profiles FOR ALL
  USING (auth.uid() = user_id);

-- RLS for maintenance_schedules
ALTER TABLE maintenance_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own maintenance schedules"
  ON maintenance_schedules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM device_profiles
      WHERE device_profiles.id = maintenance_schedules.device_id
      AND device_profiles.user_id = auth.uid()
    )
  );

-- ============================================
-- 3. PRICE STANDARDS
-- ============================================

-- Price standards table (Grab-like pricing)
CREATE TABLE IF NOT EXISTS price_standards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category VARCHAR(50) NOT NULL, -- electricity, plumbing, appliance, air_conditioning
  subcategory VARCHAR(100), -- installation, repair, cleaning, etc.
  district VARCHAR(100), -- district name (null = apply to all)
  min_price DECIMAL(10,2) NOT NULL,
  max_price DECIMAL(10,2) NOT NULL,
  standard_price DECIMAL(10,2) NOT NULL,
  price_unit VARCHAR(20) DEFAULT 'job', -- job, hour, device
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_to DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for price_standards
CREATE INDEX IF NOT EXISTS idx_price_standards_category ON price_standards(category);
CREATE INDEX IF NOT EXISTS idx_price_standards_district ON price_standards(district);
CREATE INDEX IF NOT EXISTS idx_price_standards_active ON price_standards(is_active);

-- No RLS for price_standards (public read, admin write)
-- Admin can manage via admin dashboard

-- ============================================
-- 4. SUBSCRIPTIONS
-- ============================================

-- Subscriptions table (Premium features)
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  plan_type VARCHAR(50) NOT NULL, -- basic, premium, enterprise
  status VARCHAR(20) DEFAULT 'active', -- active, cancelled, expired, past_due
  stripe_subscription_id VARCHAR(100),
  stripe_customer_id VARCHAR(100),
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT false,
  features JSONB DEFAULT '{}', -- { advanced_diagnosis, warranty_ai, priority_matching, etc. }
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);

-- RLS for subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own subscriptions"
  ON subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 5. UPDATE EXISTING TABLES
-- ============================================

-- Add chat_session_id to orders table (link order to chat)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS chat_session_id UUID REFERENCES chat_sessions(id);
CREATE INDEX IF NOT EXISTS idx_orders_chat_session ON orders(chat_session_id);

-- Add match_score to orders table (AI matching score)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS match_score DECIMAL(5,2); -- 0-100 score

-- Add price_comparison to orders table (for price transparency)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS price_comparison JSONB DEFAULT '{}'; -- { standard, quoted, difference, warning }

-- ============================================
-- 6. TRIGGERS FOR UPDATED_AT
-- ============================================

-- Function to update updated_at timestamp (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_chat_sessions_updated_at BEFORE UPDATE ON chat_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_device_profiles_updated_at BEFORE UPDATE ON device_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_maintenance_schedules_updated_at BEFORE UPDATE ON maintenance_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_price_standards_updated_at BEFORE UPDATE ON price_standards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. INSERT SAMPLE PRICE STANDARDS
-- ============================================

-- Sample price standards for major categories (Ho Chi Minh City)
INSERT INTO price_standards (category, subcategory, district, min_price, max_price, standard_price, price_unit, description) VALUES
-- Electricity
('electricity', 'repair', NULL, 100000, 300000, 200000, 'job', 'Sửa chữa điện cơ bản'),
('electricity', 'installation', NULL, 200000, 500000, 350000, 'job', 'Lắp đặt thiết bị điện'),
('electricity', 'inspection', NULL, 80000, 150000, 120000, 'job', 'Kiểm tra hệ thống điện'),

-- Plumbing
('plumbing', 'repair', NULL, 120000, 350000, 250000, 'job', 'Sửa chữa nước cơ bản'),
('plumbing', 'installation', NULL, 250000, 600000, 400000, 'job', 'Lắp đặt thiết bị nước'),
('plumbing', 'unclog', NULL, 150000, 400000, 300000, 'job', 'Thông tắc cống/nước'),

-- Air Conditioning
('air_conditioning', 'cleaning', NULL, 200000, 400000, 300000, 'job', 'Vệ sinh máy lạnh'),
('air_conditioning', 'repair', NULL, 300000, 800000, 500000, 'job', 'Sửa chữa máy lạnh'),
('air_conditioning', 'installation', NULL, 500000, 1200000, 800000, 'job', 'Lắp đặt máy lạnh'),
('air_conditioning', 'gas_refill', NULL, 300000, 600000, 450000, 'job', 'Bơm gas máy lạnh'),

-- Appliance
('appliance', 'repair', NULL, 150000, 500000, 300000, 'job', 'Sửa chữa gia dụng'),
('appliance', 'cleaning', NULL, 100000, 300000, 200000, 'job', 'Vệ sinh gia dụng'),

-- Camera
('camera', 'installation', NULL, 300000, 800000, 500000, 'job', 'Lắp đặt camera'),
('camera', 'repair', NULL, 150000, 400000, 250000, 'job', 'Sửa chữa camera');

-- ============================================
-- 8. GRANT PERMISSIONS
-- ============================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON chat_sessions TO authenticated;
GRANT SELECT, INSERT ON chat_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON device_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON maintenance_schedules TO authenticated;
GRANT SELECT ON price_standards TO authenticated;
GRANT SELECT, INSERT, UPDATE ON subscriptions TO authenticated;

-- Grant permissions to service role (for Edge Functions)
GRANT ALL ON chat_sessions TO service_role;
GRANT ALL ON chat_messages TO service_role;
GRANT ALL ON device_profiles TO service_role;
GRANT ALL ON maintenance_schedules TO service_role;
GRANT ALL ON price_standards TO service_role;
GRANT ALL ON subscriptions TO service_role;
