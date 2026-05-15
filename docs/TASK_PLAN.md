# 🚀 Vifixa AI — Task Plan: Bản Mới Hoàn Toàn

> Tuân thủ: `docs/VISION.md`, `docs/COMPANION.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`
> 
> **Nguyên tắc**: Code mới 100% — không sửa file cũ, không hardcode secret, project mới

---

## 🔴 Vấn đề của lần deploy trước

| # | Vấn đề | Giải pháp cho bản mới |
|---|--------|----------------------|
| 1 | Sửa file cũ trong repo | **Code vào thư mục riêng**: `packages/server/`, `packages/web/`, `packages/mobile/` |
| 2 | Deploy lên URL cũ `web-eta-ochre-99` | **Vercel project MỚI**: domain riêng, không ảnh hưởng bản cũ |
| 3 | Hardcode `VNPAY_SECRET_KEY` trong source | **Biến môi trường**: `process.env.VNPAY_SECRET_KEY` |
| 4 | Hardcode `return_url` | **Config injection**: từ env hoặc database |
| 5 | Deploy 66 functions cũ bị xoá | **Không đụng Supabase cũ**: dùng Supabase project MỚI hoặc tách biệt |
| 6 | Code mới trộn lẫn code cũ | **Tách biệt hoàn toàn**: không modify bất kỳ file cũ nào |

---

## 📁 Cấu trúc thư mục MỚI

```
vifixa-ai-business-package/
├── AGENTS.md              ★ directive (đã xong)
├── agent.md               ★ sequential process (đã xong)
├── docs/                  ★ tài liệu (đã xong)
│
├── packages/              ★ TẤT CẢ CODE MỚI — không đụng gốc
│   ├── server/            ★ Supabase Edge Functions
│   │   ├── functions/
│   │   │   ├── companion/
│   │   │   ├── ai-diagnose/
│   │   │   ├── ai-match/
│   │   │   ├── map-search/
│   │   │   ├── payment-create/
│   │   │   └── _shared/
│   │   ├── migrations/    ★ Chỉ migration mới
│   │   └── seed.sql
│   │
│   ├── web/               ★ Next.js 16 + Tailwind v4
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (auth)/          login, register
│   │   │   │   ├── customer/        chat, orders, devices
│   │   │   │   ├── worker/          jobs, earnings, profile
│   │   │   │   └── admin/           dashboard, settings
│   │   │   ├── components/
│   │   │   │   ├── companion/       CompanionChat
│   │   │   │   ├── map/             MapView, Marker
│   │   │   │   ├── payment/         PaymentModal
│   │   │   │   └── ui/              shared components
│   │   │   └── lib/
│   │   ├── vercel.json
│   │   └── .env.example
│   │
│   └── mobile/            ★ Expo SDK 54
│       ├── src/
│       │   ├── app/
│       │   └── components/
│       └── app.json
│
├── scripts/               ★ Deploy scripts
│   ├── deploy-supabase.sh
│   └── deploy-vercel.sh
│
└── (code cũ giữ nguyên)   ← KHÔNG SỬA
```

---

## 🗺️ Task Plan theo Phase (tuần tự)

### Phase 0: Setup (1h)

| # | Task | File/Command | Mô tả |
|---|------|-------------|-------|
| 0.1 | Tạo Supabase project MỚI | Supabase Dashboard → New Project | Đặt tên: `vifixa-ai-v2` — không dùng project cũ |
| 0.2 | Tạo Vercel project MỚI | Vercel Dashboard → Add New | Import từ `packages/web/` — domain mới |
| 0.3 | Tạo `packages/` structure | `mkdir -p packages/{server,web,mobile}` | Sạch, không lẫn |
| 0.4 | Copy `.env.example` | `packages/web/.env.example` | Tất cả env var, không hardcode |

**Env vars**:
```
NEXT_PUBLIC_SUPABASE_URL=       # URL project MỚI
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # anon key project MỚI
SUPABASE_SERVICE_ROLE_KEY=      # service role project MỚI
NVIDIA_API_KEY=                 # NVIDIA NIM key
VNPAY_TMN_CODE=9PCXHWJ9
VNPAY_SECRET_KEY=               # KHÔNG hardcode
NEXT_PUBLIC_APP_URL=            # Vercel domain MỚI
```

---

### Phase 1: Server — Database Foundation (2h)

| # | Task | File | Mô tả |
|---|------|------|-------|
| 1.1 | Migration: Companion Core | `packages/server/migrations/001_companion.sql` | `companion_profiles`, `_memories`, `_interactions`, `customer_devices`, `worker_skills` |
| 1.2 | Migration: 3 Cores | `packages/server/migrations/002_cores.sql` | `service_requests`, `orders` (location), `workers`, `transactions`, `wallets`, `ledger`, `profiles`, `ai_logs`, `gateway_configs` |
| 1.3 | Auth trigger | In migration 002 | `handle_new_user()` — auto profile + companion |
| 1.4 | Seed data | `packages/server/seed.sql` | 3 users, 2 workers, 3 orders |
| 1.5 | Apply migrations | `supabase db push --linked` | Trên project MỚI |

---

### Phase 2: Server — Edge Functions (3h)

| # | Task | File | Mô tả |
|---|------|------|-------|
| 2.1 | Shared modules | `packages/server/functions/_shared/cors.ts`, `auth.ts`, `ai-core.ts` | Copy từ code cũ (đã ổn định) |
| 2.2 | VNPay gateway | `packages/server/functions/_shared/gateways/vnpay.ts` | Lấy từ code cũ, sửa: không hardcode, dùng env |
| 2.3 | Companion Chat | `packages/server/functions/companion/index.ts` | AI tự trị + memory + actions — env var cho API key |
| 2.4 | AI Diagnose | `packages/server/functions/ai-diagnose/index.ts` | Diagnosis + pricing — env var cho return_url |
| 2.5 | AI Match | `packages/server/functions/ai-match/index.ts` | Haversine matching |
| 2.6 | Payment Create | `packages/server/functions/payment-create/index.ts` | VNPay HMAC — return_url từ env, KHÔNG hardcode |

---

### Phase 3: Web — Auth + Companion (4h)

| # | Task | File | Mô tả |
|---|------|------|-------|
| 3.1 | Init Next.js | `cd packages/web && npx create-next-app@latest` | TypeScript, Tailwind, App Router |
| 3.2 | Supabase client | `packages/web/src/lib/supabase.ts` | Lazy init pattern (từ code cũ) |
| 3.3 | Provider setup | `packages/web/src/app/layout.tsx` | QueryProvider, Toast, FeatureFlag |
| 3.4 | Login page | `packages/web/src/app/(auth)/login/page.tsx` | Companion greeting (không dùng file cũ) |
| 3.5 | Register page | `packages/web/src/app/(auth)/register/page.tsx` | Role selection (không dùng file cũ) |
| 3.6 | CompanionChat component | `packages/web/src/components/companion/CompanionChat.tsx` | Reusable (không dùng file cũ) |
| 3.7 | Customer dashboard | `packages/web/src/app/customer/page.tsx` | Chat + orders sidebar |
| 3.8 | Worker dashboard | `packages/web/src/app/worker/page.tsx` | Co-pilot + jobs |
| 3.9 | Admin dashboard | `packages/web/src/app/admin/page.tsx` | Stats |
| 3.10 | Orders pages | `packages/web/src/app/customer/orders/` | List + detail |
| 3.11 | Jobs pages | `packages/web/src/app/worker/jobs/` | List + detail |

---

### Phase 4: Web — Map (3h)

| # | Task | File | Mô tả |
|---|------|------|-------|
| 4.1 | MapView component | `packages/web/src/components/map/MapView.tsx` | Leaflet core |
| 4.2 | MapSearch function | `packages/server/functions/map-search/index.ts` | Tìm thợ gần |
| 4.3 | Customer map | `packages/web/src/app/customer/map/page.tsx` | Thấy thợ gần |
| 4.4 | Worker map | `packages/web/src/app/worker/map/page.tsx` | Thấy đơn gần |

---

### Phase 5: Web — Payment (2h)

| # | Task | File | Mô tả |
|---|------|------|-------|
| 5.1 | PaymentModal component | `packages/web/src/components/payment/PaymentModal.tsx` | VNPay QR/redirect |
| 5.2 | VNPay return handler | `packages/web/src/app/api/payments/vnpay/return/route.ts` | Env var cho secret |
| 5.3 | VNPay IPN handler | `packages/web/src/app/api/payments/vnpay/ipn/route.ts` | Env var cho secret |
| 5.4 | Payment in order detail | Thêm vào order detail page | Nút thanh toán |

---

### Phase 6: Deploy (1h)

| # | Task | Command | Mô tả |
|---|------|---------|-------|
| 6.1 | Push migrations | `supabase db push` | Project MỚI |
| 6.2 | Deploy functions | `supabase functions deploy` | Project MỚI |
| 6.3 | Set env vars | `vercel env add` | Tất cả env, KHÔNG hardcode |
| 6.4 | Deploy web | `cd packages/web && vercel --prod` | Vercel project MỚI |
| 6.5 | Verify | Health check | Web + Functions |

---

## 🎯 So sánh: Lần trước vs Bản mới

| Tiêu chí | Lần trước (sai) | Bản mới (đúng) |
|----------|-----------------|----------------|
| Code | Sửa file cũ | `packages/` — sạch, tách biệt |
| Supabase | Dùng project cũ, xoá functions | Supabase project MỚI |
| Vercel | Deploy lên URL cũ | Vercel project MỚI, domain mới |
| VNPay secret | Hardcode trong source | Env var |
| return_url | Hardcode string | Env var |
| File gốc | Bị sửa | Giữ nguyên 100% |

---

## ⏱ Timeline

| Phase | Thời gian | Kết quả |
|-------|-----------|---------|
| 0: Setup | 1h | 2 project mới (Supabase + Vercel), thư mục `packages/` |
| 1: DB | 2h | 2 migrations applied |
| 2: Functions | 3h | 4 Edge Functions deployed |
| 3: Web Auth | 4h | Login/Register/Chat/Dashboard live |
| 4: Map | 3h | Map + search |
| 5: Payment | 2h | VNPay flow hoàn chỉnh |
| 6: Deploy | 1h | Production live |
| **Tổng** | **~16h** | |

---

Duyệt plan này được không? Nếu OK, tôi bắt đầu từ **Phase 0**: tạo Supabase project mới + Vercel project mới + thư mục `packages/`.