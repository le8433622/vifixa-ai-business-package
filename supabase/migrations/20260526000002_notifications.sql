-- 🔔 Notifications — in-app + SMS events

CREATE TABLE IF NOT EXISTS in_app_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  broadcast_id UUID,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  action_url TEXT,
  action_label TEXT,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inapp_user ON in_app_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_inapp_unread ON in_app_notifications(user_id, is_read) WHERE NOT is_read;
CREATE INDEX IF NOT EXISTS idx_inapp_created ON in_app_notifications(created_at DESC);

ALTER TABLE in_app_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications" ON in_app_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications" ON in_app_notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role manages notifications" ON in_app_notifications
  FOR ALL USING (auth.role() = 'service_role');

GRANT SELECT, UPDATE ON in_app_notifications TO authenticated;
GRANT ALL ON in_app_notifications TO service_role;
