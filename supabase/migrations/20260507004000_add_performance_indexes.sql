-- DB Indexes for AI Functions Performance
-- Deploy: supabase db push --linked

-- ai_logs indexes (monitoring views depend on these)
CREATE INDEX IF NOT EXISTS idx_ai_logs_created_at
  ON ai_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_logs_agent_type
  ON ai_logs (agent_type);

CREATE INDEX IF NOT EXISTS idx_ai_logs_user_id
  ON ai_logs (user_id);

CREATE INDEX IF NOT EXISTS idx_ai_logs_agent_created
  ON ai_logs (agent_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_logs_user_created
  ON ai_logs (user_id, created_at DESC);

-- chat_sessions indexes
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id
  ON chat_sessions (user_id);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_status
  ON chat_sessions (status);

-- chat_messages indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id
  ON chat_messages (session_id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at
  ON chat_messages (session_id, created_at ASC);

-- knowledge_base indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_base_category
  ON knowledge_base (category);

-- admin_review_queue indexes
CREATE INDEX IF NOT EXISTS idx_review_queue_status
  ON admin_review_queue (review_status);
