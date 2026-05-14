# Vifixa AI — API Reference

## Base URL
```
https://lipjakzhzosrhttsltwo.supabase.co/functions/v1/{function-name}
```

## Authentication
All endpoints require `Authorization: Bearer {supabase-access-token}` header.
Admin-only endpoints additionally verify `profiles.role = 'admin'`.

---

## 🧠 Core AI Agents

### `ai-diagnose`
**POST** — Chẩn đoán sự cố từ mô tả + ảnh
```json
{"category": "string", "description": "string", "media_urls?": ["url"], "location?": {"lat": number, "lng": number}}
```
→ `{diagnosis, severity, recommended_skills, confidence, estimated_price_range?}`

### `ai-estimate-price`
**POST** — Định giá dịch vụ (AI + historical + surge)
```json
{"category": "string", "diagnosis": "string", "location": {"lat","lng"}, "urgency": "string"}
```
→ `{estimated_price, base_price, surge_multiplier, price_breakdown, confidence}`

### `ai-matching`
**POST** — Ghép thợ phù hợp nhất
```json
{"order_id": "uuid", "skills_required": ["string"], "location": {"lat","lng"}, "urgency": "string"}
```
→ `{matched_worker_id, worker_name, eta_minutes, confidence, match_reasons?, alternative_workers?}`

### `ai-quality`
**POST** — Kiểm tra chất lượng (text + vision)
```json
{"order_id": "uuid", "worker_id": "uuid", "before_media?": ["url"], "after_media?": ["url"], "checklist?": {}}
```
→ `{quality_score, passed, issues, recommendations, vision_analysis?}`

### `ai-dispute`
**POST** — Xử lý tranh chấp
```json
{"order_id": "uuid", "complainant_id": "uuid", "complaint_type": "string", "description": "string", "evidence_urls?": ["url"]}
```
→ `{summary, severity, recommended_action, confidence, explanation, needs_human_review?}`

### `ai-coach`
**POST** — Huấn luyện viên cho thợ (v2: job_support + smart_schedule + performance)
```json
{"action": "job_support|smart_schedule|performance|general", "worker_id": "uuid", "job_id?": "uuid", "message?": "string"}
```
→ `{advice, materials_needed?, optimal_hours?, performance_score?, ...}`

### `ai-fraud-check`
**POST** — Phát hiện gian lận (rule-based + AI)
```json
{"check_type": "price_change|dispute_rate|suspicious_activity|...", "user_id?": "uuid", "order_id?": "uuid"}
```
→ `{success, alerts: [{alert_type, severity, description}], risk_score}`

### `ai-predict`
**POST** — Dự đoán bảo trì thiết bị
```json
{"device_type": "string", "brand?": "string", "purchase_date?": "date", "usage_frequency?": "low|medium|high"}
```
→ `{next_maintenance_date, maintenance_type, urgency, recommendations, device_lifespan_years?}`

### `ai-care-agent`
**POST** — Chăm sóc khách hàng chủ động
```json
{"devices": [...], "orders": [...], "total_spent": number, ...}
```
→ `{summary, next_best_action, device_insights, maintenance_reminders, reorder_suggestions, loyalty_status}`

### `ai-warranty`
**POST** — Kiểm tra bảo hành
```json
{"order_id": "uuid", "customer_id": "uuid", "claim_reason": "string"}
```
→ `{eligible, days_remaining, auto_approved, recommendation, message}`

---

## 💰 Monetization

### `ai-upsell`
**POST** — AI gợi ý upsell cá nhân hóa
```json
{"trigger_type": "after_diagnosis|after_quote|...", "category": "string", "user_id?": "uuid"}
```
→ `{suggestion, product_type, discount_percent, confidence, reason, show_upsell}`

### `ai-materials`
**POST** — Tự động tạo danh sách vật tư
```json
{"diagnosis": "string", "category": "string", "description?": "string"}
```
→ `{materials: [{name, quantity, estimated_cost}], total_estimate, affiliate_links?}`

### `ai-b2b`
**POST** — AI doanh nghiệp (fleet health, renewal prediction, SLA)
```json
{"action": "fleet_health|predict_renewal|sla_monitoring", "enterprise_id?": "uuid", "data?": {}}
```
→ Response tùy action

### `ai-negotiate`
**POST** — AI thương lượng giá
```json
{"category": "string", "description": "string", "estimated_price?": number, "customer_offer?": number, "worker_counter?": number}
```
→ `{fair_price, min_acceptable, max_suggested, reasoning, compromise_suggestion, confidence}`

---

## 💬 Chat

### `ai-chat`
**POST** — Conversational AI (hỗ trợ streaming)
```json
{"session_id?": "uuid", "message": "string", "context?": {}, "stream?": true}
```
→ `{reply, session_id, state, actions: [{type, label, data}], upsell?, session_complete, order_id?}`

---

## 📊 Analytics & Monitor

### `ai-analytics`
**GET** — Phân tích dữ liệu
- `?action=overview` → `{today_ai_cost, total_revenue, avg_accuracy, ai_roi}`
- `?action=churn` → `{churn_rate, at_risk_users, ai_insights: {recommendations, retention_strategies}}`
- `?action=revenue-attribution` → `{total_revenue, ai_attributed_revenue, ai_attribution_pct, top_categories}`

### `ai-monitor`
**POST** — Kiểm tra hệ thống AI định kỳ (cron)
→ `{checked_at, alerts: [{type, severity, title, body}], metrics: {today_cost, budget_exceeded, latency_violations}}`

### `ai-weekly-report`
**POST** — Tạo báo cáo tuần AI
→ `{generated_at, period, metrics, agents: [{name, accuracy}], ai_commentary}`

---

## 🎯 Retention & Growth

### `ai-retention`
**POST** — Quét churn risk → gửi retention campaign
→ `{customers_analyzed, campaigns_launched}`

### `ai-referral`
**POST** — Smart referral với LTV optimization
```json
{"user_id": "uuid"}
```
→ `{referral_code, your_reward, friend_discount, message, ltv_tier}`

### `ai-reengage`
**POST** — Tái tương tác cá nhân hóa
```json
{"user_id": "uuid", "trigger": "string", "category?": "string"}
```
→ `{title, offer, discount, recommended_service, push_message}`

---

## 🔍 Vector Search

### `ai-search`
**GET** — Tìm kiếm ngữ nghĩa
- `?action=search&q=máy+lạnh+quận+7&type=worker` → `{results: [{id, text, similarity}], ai: {summary, alternative_suggestions}}`
- `?action=index` — Index workers vào vector DB (admin)

---

## 🚀 Auto-Pilot

### `ai-autopilot`
**POST** — Tự động hóa toàn bộ order flow
```json
{"category": "string", "description": "string", "user_id": "uuid", "media_urls?": ["url"], "location?": {}, "action?": "process|dry-run"}
```
→ `{diagnose, price, match, order_created?, upsell?, completed_at, errors?}`

---

## 🏭 Revenue Optimization

### `ai-pricing-optimizer`
**POST/GET** — Tối ưu giá
- `?action=analyze` → `{analysis: [{category, completion_rate, avg_final}], ai_recommendations}`
- `?action=simulate` (với body `{category, new_price}`) → `{current_price, simulated_price, simulation}`

### `ai-order-funnel`
**POST** — Phục hồi đơn bị bỏ
- `?action=scan` → `{scanned, recovered, total_discount_offered}`
- `?action=recover-one` (với body `{order_id, user_id}`) → `{recovered, discount_pct}`

### `ai-worker-revenue`
**POST** — Tối ưu thu nhập worker
```json
{"worker_id": "uuid"}
```
→ `{revenue: {total, avg_per_job}, insights: {best_hour, best_category}, ai_recommendations: {best_strategy, quick_wins, monthly_projection}}`

### `ai-auto-upsell`
**POST** — Upsell tự động tại 6 touchpoints
```json
{"user_id": "uuid", "touchpoint": "after_diagnosis|after_quote|after_order|after_completion|after_review|repeat_customer", "category?": "string"}
```
→ `{touchpoint, suggestions: [{suggestion, product_type, discount_percent, confidence}], has_membership}`

---

## 🔌 Utilities

### `ai-feedback`
**POST** — Gửi feedback về AI decision
```json
{"agent_type": "string", "rating?": 1-5, "is_correct?": bool, "correction?": {}, "comment?": "string", "request_id?": "string"}
```
→ `{success, feedback_id}`

### `ai-report`
**GET** — Báo cáo accuracy theo period
- `?period=7` → `{summary: {ai_calls, cost, accuracy}, agents, recommendations}`

### `ai-healthcheck`
**GET** — Kiểm tra hệ thống → `{ok, model, latency}`