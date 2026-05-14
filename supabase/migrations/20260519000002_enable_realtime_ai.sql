-- Enable Realtime for AI monitoring tables
ALTER PUBLICATION supabase_realtime ADD TABLE ai_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE ai_cost_log;
ALTER PUBLICATION supabase_realtime ADD TABLE ai_feedback;
ALTER PUBLICATION supabase_realtime ADD TABLE in_app_notifications;