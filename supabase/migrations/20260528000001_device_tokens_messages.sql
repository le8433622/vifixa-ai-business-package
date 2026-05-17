-- Push Notifications + Real-time Chat (Phase cuối)

-- ========== 1. DEVICE TOKENS ==========
CREATE TABLE IF NOT EXISTS device_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('expo', 'fcm', 'apns', 'web')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, token)
);

CREATE INDEX IF NOT EXISTS idx_device_tokens_user ON device_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_device_tokens_active ON device_tokens(is_active) WHERE is_active = true;

ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own device tokens" ON device_tokens;
CREATE POLICY "Users manage own device tokens" ON device_tokens
  FOR ALL USING (auth.uid() = user_id);

GRANT ALL ON device_tokens TO service_role;
GRANT ALL ON device_tokens TO authenticated;

-- ========== 2. REAL-TIME CHAT MESSAGES ==========
CREATE TABLE IF NOT EXISTS conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES auth.users(id) NOT NULL,
  worker_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_order ON conversations(order_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participants ON conversations(customer_id, worker_id);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants view conversations" ON conversations;
CREATE POLICY "Participants view conversations" ON conversations
  FOR SELECT USING (auth.uid() = customer_id OR auth.uid() = worker_id);

DROP POLICY IF EXISTS "Participants insert conversations" ON conversations;
CREATE POLICY "Participants insert conversations" ON conversations
  FOR INSERT WITH CHECK (auth.uid() = customer_id OR auth.uid() = worker_id);

GRANT ALL ON conversations TO service_role;
GRANT SELECT, INSERT ON conversations TO authenticated;

CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'system')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants view messages" ON messages;
CREATE POLICY "Participants view messages" ON messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id
      AND (c.customer_id = auth.uid() OR c.worker_id = auth.uid()))
  );

DROP POLICY IF EXISTS "Participants send messages" ON messages;
CREATE POLICY "Participants send messages" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id
      AND (c.customer_id = auth.uid() OR c.worker_id = auth.uid()))
  );

GRANT ALL ON messages TO service_role;
GRANT SELECT, INSERT ON messages TO authenticated;

-- Enable Realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE messages;