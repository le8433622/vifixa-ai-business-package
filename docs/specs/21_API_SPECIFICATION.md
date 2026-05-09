# API Specification
## Base URL
- Production: https://<project-ref>.supabase.co
- Web: https://vifixa.com, https://admin.vifixa.com

## Authentication
All requests use Supabase Auth:
- Client: Supabase JS client with session management
- Edge Functions: `Authorization: Bearer <supabase_token>`
- Web Server-side: Service role key for admin operations

## Supabase Edge Functions
### POST /functions/v1/ai-diagnose
- Body: `{ category, description, media_urls (array) }`
- Response: `{ diagnosis, severity, recommended_skills, estimated_price_range }`

### POST /functions/v1/ai-estimate-price
- Body: `{ category, diagnosis, location, urgency }`
- Response: `{ estimated_price, price_breakdown, confidence }`

### POST /functions/v1/worker-jobs/:job_id/accept
- Headers: `Authorization: Bearer <token>`
- Response: `{ success, order_status }`

### POST /functions/v1/customer-requests
- Body: `{ category, description, media_urls, location }`
- Response: `{ request_id, ai_diagnosis, matched_worker }`

## Next.js API Routes (Web)
### POST /api/ai/[...path]
- Proxy to Supabase Edge Functions with server-side auth
- Protects service role key

### POST /api/webhooks
- Handles Supabase webhooks, payment callbacks
- Validates signature

## Supabase JS Client (Mobile/Web)
### Auth
- `supabase.auth.signUp()`, `supabase.auth.signInWithPassword()`
- Session managed automatically

### Customer Operations
- `supabase.from('orders').select()` - List own orders
- `supabase.from('orders').insert()` - Create service request
- `supabase.storage.from('service-media').upload()` - Upload media

### Worker Operations
- `supabase.from('workers').update()` - Update profile
- `supabase.from('orders').select()` - View assigned jobs
- `supabase.storage.from('order-evidence').upload()` - Upload before/after

### Admin Operations (Server-side with service role)
- `supabase.from('profiles').select()` - List all users
- `supabase.from('orders').select()` - List all orders
- `supabase.from('ai_logs').select()` - View AI usage

## References
- 15_CODEX_BUSINESS_CONTEXT.md
- SUPABASE_SPEC.md
- VERCEL_SPEC.md
- 20_DATABASE_SCHEMA.md
- 05_PRODUCT_SOLUTION.md
