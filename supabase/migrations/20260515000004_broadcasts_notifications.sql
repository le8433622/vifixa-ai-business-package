-- P0.4: Broadcasts + Notifications system
-- Types
DO $$ BEGIN
  CREATE TYPE broadcast_status AS ENUM ('draft', 'scheduled', 'published', 'archived', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE broadcast_priority AS ENUM ('low', 'normal', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE broadcast_target_role AS ENUM ('all', 'workers', 'customers', 'specific_users');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE broadcast_category AS ENUM (
    'promotion', 'news', 'technology', 'maintenance_tip',
    'policy_update', 'system_announcement', 'worker_tip',
    'community', 'event', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Broadcasts table
CREATE TABLE IF NOT EXISTS public.broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE,
  summary TEXT,
  body TEXT NOT NULL,
  body_html TEXT,
  category broadcast_category NOT NULL,
  priority broadcast_priority DEFAULT 'normal',
  target_role broadcast_target_role NOT NULL DEFAULT 'all',
  target_provinces TEXT[],
  target_skills TEXT[],
  target_user_ids UUID[],
  exclude_user_ids UUID[],
  status broadcast_status DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  is_ai_generated BOOLEAN DEFAULT false,
  ai_prompt TEXT,
  ai_model TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  reviewed_by UUID REFERENCES public.profiles(id),
  view_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  open_rate DECIMAL(5,2),
  click_rate DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage broadcasts" ON public.broadcasts
  FOR ALL USING (is_admin());

CREATE POLICY "Everyone can view published" ON public.broadcasts
  FOR SELECT USING (status = 'published');

CREATE INDEX IF NOT EXISTS idx_broadcasts_status ON public.broadcasts(status);
CREATE INDEX IF NOT EXISTS idx_broadcasts_category ON public.broadcasts(category);
CREATE INDEX IF NOT EXISTS idx_broadcasts_created ON public.broadcasts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_broadcasts_scheduled ON public.broadcasts(scheduled_at) WHERE status = 'scheduled';

-- Broadcast attachments
CREATE TABLE IF NOT EXISTS public.broadcast_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id UUID NOT NULL REFERENCES public.broadcasts(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('image', 'document', 'video', 'link')),
  url TEXT NOT NULL,
  title TEXT,
  file_size INTEGER,
  mime_type TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.broadcast_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage attachments" ON public.broadcast_attachments FOR ALL USING (is_admin());
CREATE POLICY "Everyone can view attachments" ON public.broadcast_attachments FOR SELECT USING (true);
CREATE INDEX IF NOT EXISTS idx_broadcast_attachments ON public.broadcast_attachments(broadcast_id);

-- In-app notifications
CREATE TABLE IF NOT EXISTS public.in_app_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  broadcast_id UUID REFERENCES public.broadcasts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category broadcast_category,
  priority broadcast_priority DEFAULT 'normal',
  action_url TEXT,
  action_label TEXT,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  is_archived BOOLEAN DEFAULT false,
  push_sent BOOLEAN DEFAULT false,
  push_sent_at TIMESTAMPTZ,
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMPTZ,
  sms_sent BOOLEAN DEFAULT false,
  sms_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.in_app_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.in_app_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON public.in_app_notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own notifications" ON public.in_app_notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notif_user ON public.in_app_notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_unread ON public.in_app_notifications(user_id) WHERE NOT is_read AND NOT is_archived;

-- Notification templates
CREATE TABLE IF NOT EXISTS public.notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category broadcast_category NOT NULL,
  title_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  push_body_template TEXT,
  variables JSONB DEFAULT '[]',
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage templates" ON public.notification_templates FOR ALL USING (is_admin());
CREATE POLICY "Everyone can view templates" ON public.notification_templates FOR SELECT USING (true);

-- User notification preferences
CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  push_enabled BOOLEAN DEFAULT true,
  email_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  subscribed_categories broadcast_category[],
  unsubscribed_categories broadcast_category[] DEFAULT '{}',
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '07:00',
  frequency TEXT DEFAULT 'immediate' CHECK (frequency IN ('immediate', 'daily_digest', 'weekly_digest', 'never')),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own prefs" ON public.user_notification_preferences FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all prefs" ON public.user_notification_preferences FOR SELECT USING (is_admin());

-- Notification templates seed
INSERT INTO notification_templates (name, category, title_template, body_template, push_body_template, variables, is_system) VALUES
('weekly_promotion', 'promotion', '🎉 Giảm {{discount}}% cho dịch vụ {{service}}',
  'Chào {{user_name}},\n\nTháng này Vifixa dành tặng bạn ưu đãi đặc biệt: giảm {{discount}}% cho dịch vụ {{service}}. Áp dụng từ {{start_date}} đến {{end_date}}.\n\nĐặt lịch ngay hôm nay!',
  'Giảm {{discount}}% cho dịch vụ {{service}}. Đặt ngay!',
  '["discount", "service", "start_date", "end_date", "user_name"]', true),
('monthly_newsletter', 'news', '📢 Vifixa {{month}} — Những điều mới nhất',
  'Chào {{user_name}},\n\n{{month}} vừa qua, Vifixa đã đạt được nhiều cột mốc mới:\n{{highlights}}\n\nCảm ơn bạn đã đồng hành cùng chúng tôi!',
  '📢 Tin mới nhất từ Vifixa trong {{month}}',
  '["month", "user_name", "highlights"]', true),
('tech_update', 'technology', '🚀 Tính năng mới: {{feature_name}}',
  'Chào {{user_name}},\n\nChúng tôi vừa ra mắt {{feature_name}}! {{feature_description}}\n\nTrải nghiệm ngay: {{action_url}}',
  '🚀 {{feature_name}} đã có mặt trên Vifixa!',
  '["feature_name", "feature_description", "user_name", "action_url"]', true),
('worker_tip', 'worker_tip', '🔧 Mẹo cho thợ: {{tip_title}}',
  'Chào {{user_name}},\n\n{{tip_body}}\n\nÁp dụng ngay để nâng cao hiệu quả công việc!',
  '🔧 {{tip_title}}',
  '["tip_title", "tip_body", "user_name"]', true),
('maintenance_tip', 'maintenance_tip', '🏠 Mẹo bảo trì {{season}}: {{tip_title}}',
  'Chào {{user_name}},\n\n{{tip_body}}\n\nĐặt lịch bảo trì ngay hôm nay!',
  '🏠 {{tip_title}}',
  '["season", "tip_title", "tip_body", "user_name"]', true)
ON CONFLICT (name) DO NOTHING;
