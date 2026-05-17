# 🔍 Vifixa AI — Phân Tích Thiếu Sót Liên Luồng (Cross-Flow Gap Analysis)

> Phân tích toàn bộ hệ thống dựa trên tư duy end-to-end: **Khách → Thợ → Admin → AI → Map → Payment**

---

## Luồng Tổng Thể Hiện Tại

```
KHÁCH                     THỢ                       ADMIN
  │                         │                          │
  ├─ Chat với AI            ├─ Dashboard Co-pilot      ├─ Dashboard Analyst
  ├─ AI Diagnose            ├─ Job list + detail        ├─ Quản lý KYC
  ├─ AI Báo giá             ├─ Geo-fence Check-in      ├─ Quản lý Lock
  ├─ Xem thợ trên map       ├─ Worker Map (đơn gần)    ├─ Quản lý Users
  ├─ Book thợ               ├─ Nhận/Từ chối job        ├─ Quản lý Orders
  ├─ Theo dõi thợ (basic)   ├─ Hoàn thành job          ├─ Quản lý Disputes
  ├─ Thanh toán             ├─ Xem thu nhập            ├─ Analytics
  └─ Xem lịch sử            └─ AI gợi ý stake          └─ AI KYC

AI CORE                   MAP CORE                   PAYMENT CORE
  │                         │                          │
  ├─ ai-chat                ├─ AvailableWorkersMap      ├─ VNPay (IPN + return)
  ├─ ai-diagnose            ├─ WorkerLocationTracker    ├─ Stripe (webhook)
  ├─ ai-matching            ├─ WorkerTracker            ├─ Wallet Manager
  ├─ ai-kyc (Vision)        ├─ Geo-matching RPC         ├─ Escrow
  ├─ ai-auto-executor       ├─ Geo-fence Check-in       ├─ Staking
  ├─ ai-predict             ├─ Location Analytics       ├─ VFC Points
  ├─ ai-fraud-check         ├─ Map Infrastructure       └─ Multi-ledger
  ├─ ai-coach               └─ Service Areas (table)
  ├─ ai-dispute
  └─ ai-quality
```

---

## GAP #1: Luồng Customer → Worker → Hoàn thành

### Thiếu Sót Lớn Nhất: End-to-end event chain không liền mạch

| Bước | Hiện Trạng | Vấn Đề |
|------|-----------|--------|
| Customer đặt đơn | ✅ OK | — |
| Payment thành công | ✅ OK (VNPay/Stripe) | — |
| **Payment → trigger worker notification** | ❌ **KHÔNG** | Không có webhook trigger khi payment success gọi auto-executor |
| Worker nhận job | ✅ OK | — |
| Worker check-in GPS | ✅ OK (Geo-fence) | — |
| Worker hoàn thành job | ✅ OK | — |
| **Hoàn thành → trigger auto-quality check** | ❌ **KHÔNG** | `ai-quality` tồn tại nhưng không được gọi tự động |
| **Quality OK → auto-release escrow** | ❌ **KHÔNG** | Escrow chỉ release khi worker manual click |
| **Hoàn thành → trigger warranty activation** | ❌ **KHÔNG** | `ai-warranty` tồn tại nhưng không auto-kích hoạt |
| **Hoàn thành → trigger review request cho customer** | ❌ **KHÔNG** | `ReviewModal` có nhưng không popup tự động |
| **Hoàn thành → cập nhật trust score** | ❌ **KHÔNG** | RPC `calculate_trust_score` có nhưng không auto-trigger |

### Root Cause
`ai-auto-executor` có 6 actions (`auto_diagnose | auto_estimate | auto_match | auto_verify_kyc | auto_resolve_dispute | auto_complete`) nhưng **không có trigger chain**. Không action nào tự động gọi action tiếp theo. Hệ thống không có **workflow state machine** ở backend.

### Giải Pháp
Xây dựng **Event-Driven Workflow Engine**:
```
Payment Success → trigger: workflow.process(order_id)
    → step 1: notify worker
    → step 2: update order status
    → step 3: wait for worker accept (Realtime)
    → step 4: wait for job complete (Realtime)
    → step 5: auto-run quality check
    → step 6: auto-release escrow
    → step 7: activate warranty
    → step 8: request review
    → step 9: calculate trust score
```

---

## GAP #2: Luồng Real-time Tracking (Customer ↔ Worker)

| Chức Năng | Hiện Trạng | Vấn Đề |
|-----------|-----------|--------|
| Worker GPS auto-update | ✅ OK | `WorkerLocationTracker` gửi location periodic |
| Worker online/offline | ✅ OK | — |
| **Customer thấy worker real-time trên map** | ❌ **KHÔNG** | `WorkerTracker` hiển thị nhưng không auto-refresh khi worker di chuyển |
| **Push notification khi worker đến nơi** | ❌ **KHÔNG** | Không có notification khi worker arrive |
| **Push notification khi worker sắp đến** | ❌ **KHÔNG** | Không có ETA notification |
| **Worker thấy đường đi tối ưu** | ❌ **KHÔNG** | OSRM route engine có nhưng không tích hợp vào worker map |

### Giải Pháp
- `WorkerTracker` subscribe Realtime channel `worker_location` để cập nhật marker liên tục
- Server-side trigger: khi worker check-in (geo-fence) → push notification "Thợ đã đến nơi"
- Tích hợp OSRM route vào worker map job detail → hiển thị đường đi từ vị trí hiện tại → địa chỉ job

---

## GAP #3: Luồng Notification (Thiếu Hoàn Toàn)

| Loại Notification | Hiện Trạng | Cần Cho |
|------------------|-----------|---------|
| **SMS OTP** | ✅ OK (Twilio) | — |
| **SMS/Xác nhận đơn hàng** | ❌ KHÔNG | Khi order created |
| **SMS/Thợ đã nhận job** | ❌ KHÔNG | Khi worker accepted |
| **SMS/Thợ sắp đến** | ❌ KHÔNG | Khi worker gần đến nơi |
| **SMS/Hoàn thành + đánh giá** | ❌ KHÔNG | Khi job done |
| **In-app notification** | ❌ KHÔNG | Table `notifications` có nhưng UI không hiển thị |
| **Email** | ❌ KHÔNG | Chưa có email integration |
| **Push notification (mobile)** | ❌ KHÔNG | Chưa có mobile app |

### Giải Pháp
Xây dựng **Notification Engine**: Một Edge Function `notify` nhận event → route đến SMS (Twilio) / Email (Resend/SendGrid) / In-app (`notifications` table). Các trigger point:
- `order.created` → SMS customer + in-app
- `order.matched` → SMS "Thợ đã nhận"
- `worker.arrived` → SMS "Thợ đã đến"
- `order.completed` → SMS "Đánh giá ngay"
- `payment.received` → hóa đơn điện tử

---

## GAP #4: Luồng AI Proactive (Thiếu Predictive Care)

| Chức Năng | Hiện Trạng | Vấn Đề |
|-----------|-----------|--------|
| AI diagnose theo yêu cầu | ✅ OK | — |
| AI predict maintenance | ✅ OK (theo device) | — |
| **AI tự động nhắc bảo trì** | ❌ **KHÔNG** | AI predict có nhưng không chủ động gửi reminder |
| **AI tự động đề xuất đặt lịch** | ❌ **KHÔNG** | Không auto-suggest booking dựa trên device age |
| **AI học từ behavior** | ⚠️ Partial | `learning-engine.ts` có nhưng không wired vào luồng quyết định |

### Giải Pháp
**AI Scheduler**: Cron job (pg_cron hoặc Vercel Cron) chạy hàng ngày:
1. Query `device_profiles` sắp đến hạn bảo trì
2. Gọi `ai-predict` để kiểm tra urgency
3. Nếu medium/high → tạo `notifications` record → SMS reminder
4. Nếu user có history trust cao → tự động suggest booking

---

## GAP #5: Luồng Payment → Refund/Dispute

| Chức Năng | Hiện Trạng | Vấn Đề |
|-----------|-----------|--------|
| Tạo payment (VNPay/Stripe) | ✅ OK | — |
| Wallet escrow hold | ✅ OK | — |
| Wallet escrow release | ✅ OK | — |
| **Customer request refund** | ❌ **KHÔNG** | Không có UI "Yêu cầu hoàn tiền" |
| **Admin dispute → auto-refund** | ❌ **KHÔNG** | Admin có thể resolve dispute nhưng không auto-trigger refund |
| **Partial refund** | ❌ **KHÔNG** | Escrow chỉ full release hoặc full refund |
| **Refund transaction history** | ❌ **KHÔNG** | Ledger có refund entries nhưng không hiển thị cho user |

### Giải Pháp
Tích hợp dispute resolution flow:
```
Customer khiếu nại → tạo complaint
    → AI dispute analysis (`ai-dispute`)
    → Admin review
    → Nếu refund → wallet-manager: escrow:refund
    → Nếu rework → tạo lại order với cùng worker
    → Notification: "Kết quả khiếu nại"
```

---

## GAP #6: Luồng Admin Oversight (Thiếu AI Decision Support)

| Chức Năng | Hiện Trạng | Vấn Đề |
|-----------|-----------|--------|
| Xem danh sách users | ✅ OK | — |
| Xem danh sách orders | ✅ OK | — |
| Xem KYC pending | ✅ OK | — |
| AI KYC verify | ✅ OK | — |
| **AI phát hiện anomaly tự động** | ❌ **KHÔNG** | Không có alert khi có bất thường (price spike, fraud cluster) |
| **AI dự báo doanh thu** | ❌ **KHÔNG** | Chỉ show historical, không forecast |
| **AI gợi ý tuyển thợ theo khu vực** | ❌ **KHÔNG** | Location analytics có nhưng AI không đưa ra hành động |
| **Admin lock → auto-check** | ❌ **KHÔNG** | Khi lock user, không có auto-check orders pending của user đó |

### Giải Pháp
- **Anomaly Detection Engine**: Chạy cron phân tích orders gần đây → detect bất thường → push notification cho admin
- **Revenue Forecast**: Dùng historical data + seasonality → AI predict next month revenue
- **Workforce Optimization**: Location analytics + order density → AI suggest "Cần tuyển thêm 2 thợ ở Quận 7"

---

## GAP #7: Luồng Map + AI (Thiếu Spatial Intelligence)

| Chức Năng | Hiện Trạng | Vấn Đề |
|-----------|-----------|--------|
| Worker GPS tracking | ✅ OK | — |
| Customer thấy thợ trên map | ✅ OK | — |
| Geo-matching RPC | ✅ OK | — |
| **AI matching dùng real-time location** | ❌ **KHÔNG** | `ai-matching` dùng static data, không query location thực tế |
| **Route optimization cho worker** | ❌ **KHÔNG** | Worker thấy đơn gần nhưng AI không suggest thứ tự tối ưu |
| **Heatmap động cho admin** | ❌ **KHÔNG** | `get_location_analytics` là static, không real-time |
| **Service area visualization** | ❌ **KHÔNG** | `service_areas` table có nhưng worker không thể vẽ/vùng phục vụ |

### Giải Pháp
- `ai-matching` cần query `workers.location_lat/lng` real-time thay vì static profile
- Tích hợp OSRM `trip` API → worker map hiển thị route tối ưu qua nhiều điểm
- Service Area UI: worker có thể vẽ polygon trên Leaflet → lưu vào `service_areas`

---

## GAP #8: Luồng Mobile (Thiếu Hoàn Toàn)

| Chức Năng | Hiện Trạng | Vấn Đề |
|-----------|-----------|--------|
| Web app | ✅ OK | — |
| **Mobile app** | ❌ **KHÔNG** | `mobile/` directory tồn tại nhưng chưa có code nào |
| Push notification | ❌ KHÔNG | Phụ thuộc vào mobile app |
| Camera diagnosis | ❌ KHÔNG | Vision feature cần mobile camera |
| GPS background tracking | ❌ KHÔNG | Chỉ web GPS, không có background tracking |

### Giải Pháp
Phase riêng: Mobile app development (Expo SDK 54) với các tính năng tối thiểu:
- Auth + Companion Chat
- Camera upload cho diagnosis
- GPS background tracking cho worker
- Push notification (Expo Push)

---

## GAP #9: Luồng Kiến Trúc Hệ Thống

| Vấn Đề | Mô Tả | Mức Độ |
|--------|-------|--------|
| **Không có workflow state machine ở backend** | `ai-auto-executor` là stateless function, không biết trạng thái hiện tại của workflow | 🔴 CRITICAL |
| **Duplicate function patterns** | Một số dùng `fetch()` REST, số khác dùng `createClient()` Supabase JS | 🟡 MEDIUM |
| **Thiếu idempotency keys** | API routes không có idempotency guard → duplicate payments có thể xảy ra | 🔴 CRITICAL |
| **Không có event bus** | Các thành phần giao tiếp qua DB polling (Realtime), không có event-driven architecture | 🟡 MEDIUM |
| **Thiếu monitoring/alerting** | `ai-audit.ts` log nhưng không có cảnh báo khi function fail | 🟡 MEDIUM |
| **Không có rate limiting ở Edge Functions** | `auth-helper.ts` có `checkRateLimit` nhưng không được dùng ở hầu hết functions | 🟡 MEDIUM |

---

## Ưu Tiên Khắc Phục

| Ưu Tiên | Gap | Tác Động | Effort | Trạng Thái |
|---------|-----|----------|--------|------------|
| 🔴 P0 | #1 Event-driven workflow engine | Block end-to-end auto mode | 3 ngày | ✅ Có (11-state, wired) |
| 🔴 P0 | #9 Idempotency cho payments | Ngăn duplicate transactions | 1 ngày | ✅ stripe-pi + stripe-webhook fixed |
| 🟡 P1 | #3 Notification engine | Không thể giao tiếp với user | 2 ngày | ✅ Có (notify, 13 types) |
| 🟡 P1 | #2 Real-time tracking sharing | UX tracking chưa hoàn chỉnh | 2 ngày | ⏳ Partial (watchPosition done) |
| 🟡 P1 | #5 Refund/dispute integration | Không xử lý được dispute | 2 ngày | ✅ Có (RefundRequestModal + admin) |
| 🟢 P2 | #4 AI Proactive | Predictive care chưa tự động | 2 ngày | ✅ Có (ai-scheduler cron) |
| 🟢 P2 | #6 Admin AI decision support | Admin chưa có AI hỗ trợ | 2 ngày | ⏳ Partial (analytics + AI Analyst) |
| 🟢 P2 | #7 Spatial intelligence | Map chưa thông minh | 2 ngày | ⏳ Partial (geo-fence, analytics) |
| 🔵 P3 | #8 Mobile app | Mở rộng platform | 2 tuần | ✅ Có (Expo project, screens)

---

## Luồng Đề Xuất (Target Architecture)

```
                    ┌─────────────────────────────────────┐
                    │         EVENT BUS (Supabase Realtime) │
                    │  order.* │ payment.* │ worker.*      │
                    └──────────┬──────────────────────────┘
                               │
              ┌────────────────┼────────────────┬────────────────┐
              │                │                │                │
        ┌─────▼─────┐   ┌─────▼─────┐   ┌─────▼─────┐   ┌─────▼─────┐
        │ WORKFLOW   │   │   NOTIFY   │   │ AI EXEC   │   │  AUDIT    │
        │ ENGINE     │   │  ENGINE    │   │  UTOR     │   │  LOG     │
        │ (state     │   │ (SMS/In-   │   │ (auto-    │   │ (ai-audit)│
        │  machine)  │   │  app/Email)│   │  execute) │   │           │
        └─────┬─────┘   └─────┬─────┘   └─────┬─────┘   └───────────┘
              │                │                │
              ▼                ▼                ▼
     ┌──────────────────────────────────────────────────────┐
     │              3 CORES (AI · Map · Payment)            │
     │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
     │  │ AI CORE  │  │ MAP CORE │  │  PAYMENT CORE    │   │
     │  │ - chat   │  │ - search │  │  - VNPay        │   │
     │  │ - diagnose│  │ - route  │  │  - Stripe       │   │
     │  │ - match  │  │ - track  │  │  - Wallet/Ledger │   │
     │  │ - fraud  │  │ - heatmap│  │  - Escrow        │   │
     │  │ - predict│  │ - geofence│  │  - Staking/VFC  │   │
     │  └──────────┘  └──────────┘  └──────────────────┘   │
     └──────────────────────────────────────────────────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
        ┌─────▼─────┐   ┌─────▼─────┐   ┌─────▼─────┐
        │  WEB      │   │  MOBILE   │   │  SUPABASE  │
        │ (Next.js) │   │  (Expo)   │   │ (DB + Auth)│
        └───────────┘   └───────────┘   └───────────┘
```

## Workflow Engine State Machine Đề Xuất

```
order:created
    │
    ▼
[draft] ──customer cancels──→ [cancelled]
    │                            │
    ▼                            ▼
[diagnosed] ──AI auto────→ [cancelled] (refund)
    │
    ▼
[pending_payment] ←── manual: retry ──┐
    │                                  │
    ├── VNPay/Stripe success ──────────┤
    │                                  │
    ▼                                  │
[paid] ────────────────────────────────┘
    │
    ├── auto: notify worker
    ▼
[matching] ──AI auto-match────→ [cancelled] (no worker)
    │
    ▼
[matched] ──worker declines──→ [matching]
    │
    ▼
[worker_arrived] ←── geo-fence check-in
    │
    ▼
[in_progress]
    │
    ├── auto: quality check
    ▼
[completed]
    │
    ├── auto: release escrow
    ├── auto: activate warranty
    ├── auto: request review
    ├── auto: calculate trust score
    ├── auto: send receipt
    ▼
[reviewed] ←── customer review
    │
    ▼
[closed]
```

---

---

## GAP #10: Admin Mobile Route Paths Sai ✅

| Vấn Đề | Mô Tả | Mức Độ | Trạng Thái |
|--------|-------|--------|------------|
| Admin menu navigate sai | `router.push('/admin/users')` nhưng Expo Router route là `/(admin)/users` | 🟡 P1 | ✅ Đã fix |
| Tab labels tiếng Anh | Dashboard, Users, Orders, Disputes, Integrations — vi phạm Language Standardization | 🟢 P2 | ✅ Đã fix |

**Fix**: Đổi router.push path + VI labels ✅
- All 13 admin navigation paths fixed: `/admin/*` → `/(admin)/*`
- All 6 worker navigation paths fixed: `/worker/*` → `/(worker)/*`
- Tab labels: Dashboard→Bảng điều khiển, Users→Người dùng, etc.

---

## GAP #11: Worker Payout Onboarding Status ✅

| Vấn Đề | Mô Tả | Mức Độ | Trạng Thái |
|--------|-------|--------|------------|
| Không hiển thị Stripe status | Worker không biết Stripe account đã active chưa | 🟡 P1 | ✅ Đã fix |
| Không notification cho payout mới | Worker không được thông báo khi có tiền về | 🟡 P1 | ✅ Đã fix |

**Fix**: Thêm Stripe account status badge + push notification khi payout created ✅
- stripe-webhook: handler `account.updated` → update `stripe_onboarding_complete`
- stripe-webhook: handler `payout.paid` → tạo in-app notification cho worker
- Web earnings page: hiển thị trạng thái (sẵn sàng / chờ hoàn tất)
- Mobile earnings page: select `stripe_onboarding_complete`

---

## GAP #12: AI Settings Migration ✅

| Vấn Đề | Mô Tả | Mức Độ | Trạng Thái |
|--------|-------|--------|------------|
| `app_settings` table chưa tồn tại | Migration cần apply production | 🟡 P1 | ✅ Production verified |
| Seed data missing | Default prompts, quality thresholds cần đảm bảo đã insert | 🟢 P2 | ✅ Seed data exists |

**Fix**: Apply migration + verify seed data ✅
- `app_settings` table đã tồn tại ở production (different schema, data present)
- Seed data (`ai_prompts`, `ai_quality`, `ai_api_keys`) verified in production

---

## GAP #13: Cron Jobs Không Có Dashboard ✅

| Vấn Đề | Mô Tả | Mức Độ | Trạng Thái |
|--------|-------|--------|------------|
| ai-scheduler cron | Admin không có UI xem cron đã chạy chưa, kết quả thế nào | 🟢 P2 | ✅ Đã fix |
| cleanup-idempotency cron | Không có log hoặc dashboard cho cron jobs | 🟢 P2 | ✅ Đã fix |

**Fix**: Thêm admin cron dashboard page ✅
- Migration `20260530000001_cron_job_log.sql` — tạo table `cron_job_log`
- 2 Vercel cron routes (`ai-scheduler`, `cleanup-idempotency`) — insert log khi chạy
- Admin mobile page `(admin)/cron.tsx` — xem lịch sử, filter theo job, status
- Menu `index.tsx` — thêm mục "Cron Jobs"

---

## GAP #14: stripe-connect thiếu input validation ✅

| Vấn Đề | Mô Tả | Mức Độ | Trạng Thái |
|--------|-------|--------|------------|
| Không validate worker_id | Function có thể nhận worker_id rỗng → tạo Stripe account sai | 🟡 P1 | ✅ Đã fix |
| Không verifyAuth() | Function dùng manual auth thay vì verifyAuth() từ auth-helper.ts | 🔴 P0 | ✅ Đã fix |

**Fix**: Thêm Zod validation + verifyAuth() ✅
- `Deno.serve` rewritten with `verifyAuth()` from `_shared/auth-helper.ts`
- Zod schema validates `worker_id` (uuid), `email` (optional email), `country` (2 chars, default VN)
- Authenticated user must match `worker_id` (403 if mismatch)
- `email` required when creating new Stripe account (400 if missing)
- 5 Deno tests passing (valid input, default country, invalid uuid, invalid email, response structure)
- Web page bug fixed: `(link as any)?.url` → `(link as any)?.onboarding_url`
- Return URLs point to `/worker/earnings` (not non-existent `/worker/onboarding`)

---

## GAP #9: Payment Idempotency ✅

| Vấn Đề | Mô Tả | Mức Độ | Trạng Thái |
|--------|-------|--------|------------|
| `stripe-payment-intent` không idempotent | Retry → duplicate Stripe Payment Intents + DB records | 🔴 P0 | ✅ Đã fix |
| `stripe-webhook` không check duplicate | Stripe retry → xử lý lại event nhiều lần | 🟡 P1 | ✅ Đã fix |
| `payment-process` gateway key dùng Date.now() | `Date.now()` trong key làm mất tác dụng idempotency | 🟡 P1 | ⏳ Pending — cần tách khỏi scope |

**Fix**: stripe-payment-intent ✅ thêm `idempotency_keys` check + cached response.
stripe-webhook ✅ thêm duplicate event check qua `webhook_events` table.

---

## GAP #15: P0 Bugs Tái Phát (Lesson Learned)

| Vấn Đề | Mô Tả | Mức Độ |
|--------|-------|--------|
| admin disputes route sai | Bug tương tự Bug #1 (admin routes trong user code) — lẽ ra không được phép tái phát | 🔴 P0 |
| ai-fraud-check thiếu verifyAuth() | Bug tương tự Bug đã biết — lỗi tái phát vì không có Pre-Code Protocol | 🔴 P0 |

**Root Cause**: Không có cơ chế kiểm tra "bug tương tự đã xảy ra chưa" trước khi code
**Fix**: Pre-Code Protocol Step 2 (Check Gaps) + Step 3 (Verify Existing) — đã thêm vào agent.md v1.23
**Rule mới**: Trước mỗi task, grep ERROR_ANALYSIS.md + GAP_ANALYSIS.md cho bugs tương tự

---

> **Kết Luận**: Hệ thống có đầy đủ building blocks (43 Edge Functions, 61 routes, 16 migrations) nhưng **thiếu keo dính (glue)** giữa các thành phần. Quan trọng nhất là **Workflow Engine** để kết nối AI → Payment → Map → Notification thành 1 luồng tự động hoàn chỉnh.  
> **Cập nhật 2026-05-17**: Phát hiện thêm 6 gaps mới (#10-#15) từ session P0+P1 fixes — chủ yếu về routing, visibility, và validation. Pre-Code Protocol (agent.md v1.23) được thêm để ngăn tái phát.
