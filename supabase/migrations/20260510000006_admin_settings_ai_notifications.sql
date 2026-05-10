-- Migration: Add AI + Notifications app_settings entries
-- Date: 2026-05-10

INSERT INTO app_settings (key, value, value_type, category, label, description, is_public) VALUES

-- AI Configuration
('ai_provider', 'nvidia', 'text', 'ai', 'AI Provider', 'LLM provider: nvidia, openai, anthropic', false),
('ai_model', 'meta/llama3-8b-instruct', 'text', 'ai', 'AI Model', 'Model identifier from the provider', false),
('ai_temperature', '0.7', 'number', 'ai', 'Temperature', 'Controls randomness (0.0 - 2.0)', false),
('ai_max_tokens', '4096', 'number', 'ai', 'Max Tokens', 'Maximum tokens per response', false),
('ai_api_key_status', 'configured', 'text', 'ai', 'API Key Status', 'Whether the API key is configured', false),
('ai_diagnosis_prompt', NULL, 'json', 'ai', 'Diagnosis Prompt', 'System prompt for diagnosis AI agent', false),
('ai_warranty_prompt', NULL, 'json', 'ai', 'Warranty Prompt', 'System prompt for warranty AI agent', false),
('ai_quality_prompt', NULL, 'json', 'ai', 'Quality Monitor Prompt', 'System prompt for quality monitoring agent', false),

-- Notifications Configuration
('notif_email_enabled', 'false', 'boolean', 'notification', 'Email Enabled', 'Whether email notifications are active', false),
('notif_smtp_host', NULL, 'text', 'notification', 'SMTP Host', 'SMTP server hostname', false),
('notif_smtp_port', '587', 'number', 'notification', 'SMTP Port', 'SMTP server port', false),
('notif_smtp_user', NULL, 'text', 'notification', 'SMTP Username', 'SMTP authentication username', false),
('notif_smtp_password', NULL, 'text', 'notification', 'SMTP Password', 'SMTP authentication password', false),
('notif_from_address', NULL, 'text', 'notification', 'From Address', 'From email address for outgoing emails', false),
('notif_from_name', 'Vifixa AI', 'text', 'notification', 'From Name', 'Display name for outgoing emails', true),
('notif_sms_enabled', 'false', 'boolean', 'notification', 'SMS Enabled', 'Whether SMS notifications are active', false),
('notif_sms_provider', NULL, 'text', 'notification', 'SMS Provider', 'Provider: twilio, vonage, infobip', false),
('notif_sms_api_key', NULL, 'text', 'notification', 'SMS API Key', 'API key for SMS provider', false),
('notif_sms_sender_id', NULL, 'text', 'notification', 'SMS Sender ID', 'Sender ID / phone number for SMS', false),
('notif_push_enabled', 'false', 'boolean', 'notification', 'Push Enabled', 'Whether push notifications are active', false),
('notif_expo_push_token', NULL, 'text', 'notification', 'Expo Push Token', 'Expo push notification token', false),
('notif_order_confirmation', 'true', 'boolean', 'notification', 'Order Confirmations', 'Send notification on order creation', false),
('notif_payment_receipt', 'true', 'boolean', 'notification', 'Payment Receipts', 'Send notification on payment success', false),
('notif_worker_assigned', 'true', 'boolean', 'notification', 'Worker Assigned', 'Notify customer when worker assigned', false),
('notif_job_reminder', 'true', 'boolean', 'notification', 'Job Reminders', 'Remind worker before scheduled job', false)

ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  value_type = EXCLUDED.value_type,
  category = EXCLUDED.category,
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  is_public = EXCLUDED.is_public;