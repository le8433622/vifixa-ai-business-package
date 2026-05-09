-- Phase 2: Vifixa Memory Graph & Multi-Agent System
-- Migration for vector embeddings, agent states, and predictive maintenance

-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- 1. KNOWLEDGE EMBEDDINGS TABLE (RAG Memory)
-- ============================================
CREATE TABLE IF NOT EXISTS knowledge_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('device', 'issue', 'solution', 'worker', 'customer', 'order')),
  entity_id UUID NOT NULL,
  content TEXT NOT NULL,
  embedding vector(768), -- NVIDIA NV-Embed-QA dimension
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for vector similarity search
CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_vector 
  ON knowledge_embeddings USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Index for entity lookup
CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_entity 
  ON knowledge_embeddings (entity_type, entity_id);

-- Index for metadata filtering
CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_metadata 
  ON knowledge_embeddings USING GIN (metadata);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_knowledge_embeddings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_knowledge_embeddings_updated_at
  BEFORE UPDATE ON knowledge_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION update_knowledge_embeddings_updated_at();

-- RLS Policies for knowledge_embeddings
ALTER TABLE knowledge_embeddings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all embeddings
CREATE POLICY "Allow authenticated read access"
  ON knowledge_embeddings FOR SELECT
  TO authenticated
  USING (true);

-- Allow service role to insert/update
CREATE POLICY "Allow service role full access"
  ON knowledge_embeddings FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 2. AGENT STATES TABLE (Multi-Agent System)
-- ============================================
CREATE TABLE IF NOT EXISTS agent_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  agent_type TEXT NOT NULL CHECK (agent_type IN ('diagnostic', 'pricing', 'matching', 'quality', 'orchestrator')),
  state JSONB NOT NULL DEFAULT '{}',
  confidence_score FLOAT CHECK (confidence_score >= 0 AND confidence_score <= 1),
  input_data JSONB DEFAULT '{}',
  output_data JSONB DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for session lookup
CREATE INDEX IF NOT EXISTS idx_agent_states_session 
  ON agent_states (session_id);

-- Index for agent type filtering
CREATE INDEX IF NOT EXISTS idx_agent_states_type 
  ON agent_states (agent_type);

-- Index for created_at (for cleanup)
CREATE INDEX IF NOT EXISTS idx_agent_states_created 
  ON agent_states (created_at);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_agent_states_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_agent_states_updated_at
  BEFORE UPDATE ON agent_states
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_states_updated_at();

-- RLS Policies for agent_states
ALTER TABLE agent_states ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read their own session states
CREATE POLICY "Allow users to read own session states"
  ON agent_states FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_sessions cs
      WHERE cs.id = agent_states.session_id
      AND cs.user_id = auth.uid()
    )
  );

-- Allow service role full access
CREATE POLICY "Allow service role full access"
  ON agent_states FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 3. MAINTENANCE PREDICTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS maintenance_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL,
  user_id UUID NOT NULL,
  predicted_failure_date DATE,
  failure_probability FLOAT CHECK (failure_probability >= 0 AND failure_probability <= 1),
  failure_type TEXT,
  recommended_action TEXT,
  confidence_score FLOAT CHECK (confidence_score >= 0 AND confidence_score <= 1),
  model_version TEXT DEFAULT 'v1.0',
  features_used JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed')),
  feedback_score FLOAT,
  feedback_comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for device lookup
CREATE INDEX IF NOT EXISTS idx_maintenance_predictions_device 
  ON maintenance_predictions (device_id);

-- Index for user lookup
CREATE INDEX IF NOT EXISTS idx_maintenance_predictions_user 
  ON maintenance_predictions (user_id);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_maintenance_predictions_status 
  ON maintenance_predictions (status);

-- Index for predicted failure date
CREATE INDEX IF NOT EXISTS idx_maintenance_predictions_failure_date 
  ON maintenance_predictions (predicted_failure_date);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_maintenance_predictions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_maintenance_predictions_updated_at
  BEFORE UPDATE ON maintenance_predictions
  FOR EACH ROW
  EXECUTE FUNCTION update_maintenance_predictions_updated_at();

-- RLS Policies for maintenance_predictions
ALTER TABLE maintenance_predictions ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own predictions
CREATE POLICY "Allow users to read own predictions"
  ON maintenance_predictions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Allow users to update their own predictions (for feedback)
CREATE POLICY "Allow users to update own predictions"
  ON maintenance_predictions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Allow service role full access
CREATE POLICY "Allow service role full access"
  ON maintenance_predictions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 4. AGENT COMMUNICATION LOGS
-- ============================================
CREATE TABLE IF NOT EXISTS agent_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  from_agent TEXT NOT NULL,
  to_agent TEXT NOT NULL,
  message_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  response JSONB,
  latency_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for session lookup
CREATE INDEX IF NOT EXISTS idx_agent_communications_session 
  ON agent_communications (session_id);

-- Index for agent filtering
CREATE INDEX IF NOT EXISTS idx_agent_communications_agents 
  ON agent_communications (from_agent, to_agent);

-- RLS Policies for agent_communications
ALTER TABLE agent_communications ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read their own session communications
CREATE POLICY "Allow users to read own session communications"
  ON agent_communications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_sessions cs
      WHERE cs.id = agent_communications.session_id
      AND cs.user_id = auth.uid()
    )
  );

-- Allow service role full access
CREATE POLICY "Allow service role full access"
  ON agent_communications FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 5. VIEWS FOR MONITORING
-- ============================================

-- View: Agent Performance Summary
CREATE OR REPLACE VIEW agent_performance_summary AS
SELECT 
  agent_type,
  COUNT(*) as total_executions,
  AVG(confidence_score) as avg_confidence,
  COUNT(CASE WHEN error_message IS NOT NULL THEN 1 END) as error_count,
  AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) * 1000 as avg_latency_ms
FROM agent_states
GROUP BY agent_type;

-- View: Prediction Accuracy Tracking
CREATE OR REPLACE VIEW prediction_accuracy_tracking AS
SELECT 
  DATE(created_at) as prediction_date,
  COUNT(*) as total_predictions,
  AVG(failure_probability) as avg_failure_probability,
  AVG(confidence_score) as avg_confidence,
  COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted_count,
  COUNT(CASE WHEN feedback_score IS NOT NULL THEN 1 END) as feedback_count,
  AVG(feedback_score) as avg_feedback_score
FROM maintenance_predictions
GROUP BY DATE(created_at)
ORDER BY prediction_date DESC;

-- View: Knowledge Base Statistics
CREATE OR REPLACE VIEW knowledge_base_stats AS
SELECT 
  entity_type,
  COUNT(*) as total_embeddings,
  AVG(LENGTH(content)) as avg_content_length,
  MIN(created_at) as oldest_entry,
  MAX(created_at) as newest_entry
FROM knowledge_embeddings
GROUP BY entity_type;

-- ============================================
-- 6. FUNCTIONS FOR MEMORY OPERATIONS
-- ============================================

-- Function: Search similar embeddings
CREATE OR REPLACE FUNCTION search_similar_embeddings(
  query_embedding vector(768),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10,
  filter_entity_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  entity_type TEXT,
  entity_id UUID,
  content TEXT,
  similarity FLOAT,
  metadata JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ke.id,
    ke.entity_type,
    ke.entity_id,
    ke.content,
    1 - (ke.embedding <=> query_embedding) as similarity,
    ke.metadata
  FROM knowledge_embeddings ke
  WHERE (filter_entity_type IS NULL OR ke.entity_type = filter_entity_type)
    AND 1 - (ke.embedding <=> query_embedding) > match_threshold
  ORDER BY ke.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function: Get agent state by session
CREATE OR REPLACE FUNCTION get_agent_state_by_session(
  p_session_id UUID,
  p_agent_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  agent_type TEXT,
  state JSONB,
  confidence_score FLOAT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ast.id,
    ast.agent_type,
    ast.state,
    ast.confidence_score,
    ast.created_at,
    ast.updated_at
  FROM agent_states ast
  WHERE ast.session_id = p_session_id
    AND (p_agent_type IS NULL OR ast.agent_type = p_agent_type)
  ORDER BY ast.created_at DESC;
END;
$$;

-- Function: Get upcoming maintenance predictions
CREATE OR REPLACE FUNCTION get_upcoming_maintenance(
  p_user_id UUID,
  p_days_ahead INT DEFAULT 30
)
RETURNS TABLE (
  id UUID,
  device_id UUID,
  predicted_failure_date DATE,
  failure_probability FLOAT,
  failure_type TEXT,
  recommended_action TEXT,
  confidence_score FLOAT,
  status TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mp.id,
    mp.device_id,
    mp.predicted_failure_date,
    mp.failure_probability,
    mp.failure_type,
    mp.recommended_action,
    mp.confidence_score,
    mp.status
  FROM maintenance_predictions mp
  WHERE mp.user_id = p_user_id
    AND mp.predicted_failure_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + p_days_ahead)
    AND mp.status = 'pending'
  ORDER BY mp.predicted_failure_date ASC;
END;
$$;

-- ============================================
-- 7. SEED DATA FOR TESTING
-- ============================================

-- Insert sample knowledge embeddings (for testing)
INSERT INTO knowledge_embeddings (entity_type, entity_id, content, metadata)
VALUES 
  ('device', '00000000-0000-0000-0000-000000000001', 'Máy lạnh Panasonic Inverter 1.5 HP', '{"brand": "Panasonic", "type": "air_conditioner"}'),
  ('issue', '00000000-0000-0000-0000-000000000002', 'Máy lạnh không làm lạnh, có tiếng ồn', '{"category": "cooling", "severity": "high"}'),
  ('solution', '00000000-0000-0000-0000-000000000003', 'Vệ sinh dàn lạnh, bơm gas R32, thay thế quạt', '{"cost_range": "500000-800000", "duration": "60"}')
ON CONFLICT DO NOTHING;

-- ============================================
-- 8. COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE knowledge_embeddings IS 'Vector embeddings for RAG-based memory system';
COMMENT ON TABLE agent_states IS 'State tracking for multi-agent orchestration';
COMMENT ON TABLE maintenance_predictions IS 'Predictive maintenance recommendations';
COMMENT ON TABLE agent_communications IS 'Communication logs between AI agents';

COMMENT ON FUNCTION search_similar_embeddings IS 'Search for similar embeddings using cosine similarity';
COMMENT ON FUNCTION get_agent_state_by_session IS 'Retrieve agent states for a given session';
COMMENT ON FUNCTION get_upcoming_maintenance IS 'Get upcoming maintenance predictions for a user';

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
