# Vifixa AI — Agent Coding Directive

## Purpose
Build the world's best home services platform: **1 AI Companion per person**.
3 cores: AI · Map · Payment — all serving the customer.

## Source of Truth
Read these docs before ANY code:
1. `docs/VISION.md` — the "why" and the dream
2. `docs/COMPANION.md` — AI Companion design (Memory · Personality · Actions)
3. `docs/ARCHITECTURE.md` — 4-layer system design
4. `docs/ROADMAP.md` — 5 phases to global scale

Old docs in `vifixa-ai-v4` repo are backup only. Do NOT reference them.

---

## Mandatory Rules
- Execute steps in strict sequential order
- Complete 100% of a step before moving to next
- No skipping, no reordering
- Every new module starts with: DB schema → Edge Function → Web page → Mobile screen
- Write tests for every Edge Function (Deno test) and every page (Vitest)
- AI calls ONLY through Supabase Edge Functions (no direct OpenAI/NVIDIA from frontend)

---

## STEP 1: Project Foundation

### 1.1 Read all source-of-truth docs
Read `docs/VISION.md`, `docs/COMPANION.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md` completely.

### 1.2 Verify repo state
- Remote points to `github.com/le8433622/vifixa-ai-business-package`
- Old `vifixa-ai-v4` remote = backup, do not push to it
- All existing code is reference-only unless explicitly marked for reuse

### 1.3 Create directory structure
```
supabase/
├── functions/
│   ├── v1/                    ★ API endpoints
│   │   ├── companion/
│   │   ├── ai-diagnose/
│   │   ├── ai-match/
│   │   ├── map-search/
│   │   ├── payment-create/
│   │   ├── wallet/
│   │   └── admin/
│   ├── webhooks/
│   │   ├── vnpay-ipn/
│   │   └── stripe/
│   └── _shared/
│       ├── supabase.ts
│       ├── auth.ts
│       ├── cors.ts
│       ├── ai-core.ts
│       └── gateways/
│           ├── vnpay.ts
│           └── stripe.ts
├── migrations/                ★ 001 → 00X
└── seed.sql

web/src/
├── app/
│   ├── (auth)/                login, register
│   ├── customer/              dashboard, chat, orders, devices
│   ├── worker/                dashboard, jobs, earnings, profile
│   ├── admin/                 dashboard, users, payments, settings
│   ├── api/                   proxy, webhooks
│   └── components/
│       ├── companion/         ★ AI Companion UI
│       ├── map/               Leaflet components
│       ├── payment/           VNPay/Stripe UI
│       └── ui/                shared components

mobile/src/
├── app/
│   ├── (auth)/
│   ├── (customer)/
│   └── (worker)/
└── components/
```

---

## STEP 2: Database Foundation

### 2.1 Create migration 001 — Companion Core
Tables:
- `companion_profiles` — mỗi user có 1 companion
- `companion_memories` — AI ghi nhớ facts
- `companion_interactions` — lịch sử trò chuyện
- `customer_devices` — thiết bị trong nhà
- `worker_skills` — kỹ năng động

### 2.2 Create migration 002 — AI + Map + Payment Core
Tables:
- `service_requests` — yêu cầu dịch vụ (AI diagnosis)
- `orders` — đơn hàng (có location)
- `workers` — thợ (có location real-time)
- `transactions` — giao dịch (VNPay/Stripe)
- `wallets` — ví (worker payouts)
- `ledger` — double-entry accounting

### 2.3 Enable RLS + Create policies
- Customer: thấy đơn hàng của mình
- Worker: thấy job được assigned
- Admin: thấy tất cả
- Companion: đọc/ghi memory của user đó

### 2.4 Create seed.sql
- 2 test customers, 2 test workers, 1 admin
- 3 sample orders
- VNPay gateway config seeded

---

## STEP 3: AI Companion Engine

### 3.1 Build Companion Edge Function
`supabase/functions/v1/companion/chat.ts`
- POST: nhận message user + context → gọi NVIDIA NIM → trả lời
- Tự động: ghi companion_memories, companion_interactions
- Hỗ trợ: streaming response
- Action routing: nếu user muốn đặt dịch vụ → gọi ai-diagnose

### 3.2 Build Companion Web UI
`web/src/components/companion/CompanionChat.tsx`
- Chat bubble UI (reusable trên cả customer/worker/admin)
- Avatar companion (khác nhau cho mỗi persona)
- Quick actions chips
- File/image upload

### 3.3 Build Companion Pages
- `web/src/app/customer/chat/page.tsx` — Chat với companion
- `web/src/app/worker/page.tsx` — Co-pilot dashboard
- `web/src/app/admin/page.tsx` — Analyst dashboard

---

## STEP 4: AI Core — Diagnosis + Matching

### 4.1 Diagnose Function
`supabase/functions/v1/ai-diagnose/index.ts`
- Input: description, media_urls, category
- AI: Llama 3.2 Vision (nếu có ảnh) + Mixtral (text)
- Output: diagnosis, severity, price_range, recommended_skills
- Log: ghi vào ai_logs

### 4.2 Match Function
`supabase/functions/v1/ai-match/index.ts`
- Input: order_id, customer location
- Logic: tìm worker gần nhất + kỹ năng phù hợp + trust_score cao
- Output: matched worker, ETA, route

### 4.3 Price Estimate
`supabase/functions/v1/ai-diagnose/index.ts` (mở rộng)
- Output: estimated_price + platform_fee + worker_payout

---

## STEP 5: Map Core

### 5.1 Map Search Function
`supabase/functions/v1/map-search/index.ts`
- Input: lat, lng, radius, type (workers|orders|heatmap)
- Output: danh sách điểm trên map

### 5.2 Map Route Function
`supabase/functions/v1/map-search/index.ts` (mở rộng)
- Tích hợp OSRM: tính khoảng cách + thời gian thực

### 5.3 Map Web Components
- `web/src/components/map/MapView.tsx` — Leaflet core
- `web/src/components/map/WorkerMarker.tsx` — worker icons
- `web/src/components/map/OrderMarker.tsx` — order icons
- `web/src/app/customer/map/page.tsx` — thợ gần tôi
- `web/src/app/worker/map/page.tsx` — đơn gần tôi

---

## STEP 6: Payment Core — VNPay + Stripe

### 6.1 Payment Create Function
`supabase/functions/v1/payment-create/index.ts`
- POST: order_id, amount, gateway (vnpay|stripe)
- VNPay: tạo payment URL + redirect
- Stripe: tạo Payment Intent
- Ghi: transactions table

### 6.2 VNPay Webhook
`supabase/functions/webhooks/vnpay-ipn/index.ts`
- GET: nhận IPN từ VNPay
- Verify HMAC-SHA512
- Cập nhật transactions.status
- Cập nhật orders.payment_status

### 6.3 VNPay Return Handler
`web/src/app/api/payments/vnpay/return/route.ts`
- GET: nhận redirect từ VNPay
- Verify signature
- Redirect user → order detail page

### 6.4 Payment UI
`web/src/components/payment/PaymentModal.tsx`
- Chọn gateway: VNPay (QR + Bank) / Stripe (Card)
- Hiển thị QR code (cho VNPay)
- Xử lý return callback

### 6.5 Wallet + Ledger
`supabase/functions/v1/wallet/index.ts`
- Tự động tạo wallet khi worker verify
- Ledger double-entry: mỗi giao dịch = 1 debit + 1 credit
- Payout: admin chốt → worker nhận tiền

---

## STEP 7: Mobile Sync (Expo)

### 7.1 Customer Mobile Screens
- `mobile/src/app/(customer)/_layout.tsx` — Tabs: Home, Chat, Orders, Profile
- `mobile/src/app/(customer)/chat.tsx` — Companion chat
- `mobile/src/app/(customer)/map.tsx` — Map (WebView Leaflet)
- `mobile/src/app/(customer)/orders.tsx` — Order list

### 7.2 Worker Mobile Screens
- `mobile/src/app/(worker)/_layout.tsx` — Stack
- `mobile/src/app/(worker)/index.tsx` — Co-pilot dashboard
- `mobile/src/app/(worker)/jobs.tsx` — Job list + map

### 7.3 Shared Utilities
- API client: gọi Supabase Edge Functions
- Auth: Supabase Auth + SecureStore
- Components: CompanionChat, MapView, PaymentModal (viết 1 lần, dùng cả web + mobile)

---

## STEP 8: Verification

- Unit tests pass: Vitest (web) + Deno test (functions)
- E2E tests pass: Playwright (web)
- AI KPIs: diagnosis accuracy ≥80%, price accuracy ≥60%
- No mock data in production
- No secrets in frontend
- VNPay sandbox: create payment → redirect → IPN → confirm
- Mobile: build thành công với EAS

---

## STEP 9: Deploy

- `supabase db push` — migrations
- `supabase functions deploy` — edge functions
- `cd web && vercel --prod` — web
- `cd mobile && eas build --profile production` — iOS + Android
- Verify health check endpoint

---

## STEP 10: Launch

- Tag `v1.0.0`
- Monitor VNPay transactions
- Track AI accuracy via companion_interactions
- OKRs: real users, real orders, real revenue