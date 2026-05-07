# Vifixa AI Functions API

Base URL: `https://lipjakzhzosrhttsltwo.supabase.co/functions/v1`

Auth: `Authorization: Bearer <user_jwt>`

## ai-diagnose
`POST /ai-diagnose`
```json
{
  "category": "engine",
  "description": "Xe không khởi động được, có tiếng kêu tạch tạch",
  "media_urls": ["https://...jpg"],
  "location": {"lat": 10.7769, "lng": 106.7009}
}
```
→ `{ diagnosis, severity, recommended_skills[], estimated_price_range{min,max}, confidence }`

## ai-estimate-price
`POST /ai-estimate-price`
```json
{
  "category": "engine",
  "diagnosis": "Hỏng bộ khởi động",
  "location": {"lat": 10.7769, "lng": 106.7009},
  "urgency": "medium"
}
```
→ `{ estimated_price, price_breakdown[{item,cost}], confidence }`

## ai-matching
`POST /ai-matching`
```json
{
  "order_id": "...",
  "skills_required": ["electrical", "plumbing"],
  "location": {"lat": 10.7769, "lng": 106.7009},
  "urgency": "medium"
}
```
→ `{ matched_worker_id, worker_name, eta_minutes, confidence }`

## ai-quality
`POST /ai-quality`
```json
{
  "order_id": "...",
  "worker_id": "...",
  "before_media": ["img1.jpg"],
  "after_media": ["img2.jpg"],
  "checklist": {"engine_start": true}
}
```
→ `{ quality_score, passed, issues[], recommendations[] }`

## ai-dispute
`POST /ai-dispute`
```json
{
  "order_id": "...",
  "complainant_id": "...",
  "complaint_type": "quality|pricing|timeliness|damage",
  "description": "...",
  "evidence_urls": ["video.mp4"]
}
```
→ `{ summary, severity, recommended_action, confidence, explanation, needs_human_review, review_reason }`

## ai-coach
`POST /ai-coach`
```json
{
  "worker_id": "...",
  "job_type": "engine repair",
  "issue_description": "...",
  "performance_history": {}
}
```
→ `{ suggestions[], safety_tips[], skill_recommendations[], earnings_tips[] }`

## ai-predict
`POST /ai-predict`
```json
{
  "device_type": "Máy giặt",
  "brand": "Samsung",
  "model": "WA80M",
  "purchase_date": "2021-01-15",
  "last_maintenance": "2024-06-01",
  "usage_frequency": "high",
  "issues_reported": ["rung lắc"]
}
```
→ `{ next_maintenance_date, maintenance_type, urgency, estimated_cost?, recommendations[], device_lifespan_years? }`

## ai-chat
`POST /ai-chat`
```json
{
  "session_id": "optional-existing-session-id",
  "message": "Xe của tôi không khởi động được",
  "context": {"category": "engine", "location": "HCM"}
}
```
→ `{ session_id, reply, actions[], next_step, session_complete, order_id? }`

## Errors
All functions return uniform error format:
```json
{
  "error": "...",
  "code": "UNAUTHORIZED | VALIDATION_ERROR | AI_ERROR | INTERNAL_ERROR"
}
```

## Env Vars Required
- `NVIDIA_API_KEY` - NVIDIA NIM API key
- `NVIDIA_MODEL` - model name (default: `meta/llama-3.1-8b-instruct`)
- `SUPABASE_URL` - project URL
- `SUPABASE_SERVICE_ROLE_KEY` - service role key
- `SUPABASE_ANON_KEY` - anon/publishable key
