# Product Architecture Decision — Vifixa AI

## 1. Problem

Repo đang có nhiều chức năng chồng chéo:

- Nhiều AI functions nhỏ cùng gọi AI core.
- Nhiều payment functions cùng xử lý payment lifecycle.
- Customer / worker / admin vừa có web API, vừa có Supabase functions, vừa có orchestrator.
- Map/location/service-area tách nhiều điểm vào.
- Companion, orchestrator, auto-executor, workflow-engine có ranh giới chưa rõ.
- Income Commerce OS mới đang là lõi đúng nhưng còn song song với mô hình worker/order cũ.

Nếu tiếp tục thêm module theo từng ý tưởng, repo sẽ thành một hệ thống lớn nhưng khó bảo trì.

## 2. North Star

Vifixa không phải app gọi thợ đơn thuần.

Vifixa là:

```txt
AI Income & Life Commerce Operating System
```

Câu lõi:

```txt
Người dân có tài sản/kỹ năng/thời gian -> AI tạo offer kiếm tiền.
Khách có nhu cầu thật -> AI chuẩn hóa demand.
Hệ thống ghép -> giao dịch -> payment -> profit -> correction -> learning.
```

## 3. Product domains cuối cùng

Chỉ giữ 9 domain cấp cao:

1. Identity & Account
2. Income & Partner
3. Demand & Customer
4. Offer & Service
5. Order & Workflow
6. Payment & Ledger
7. Trust & Safety
8. AI Orchestration
9. Admin & Operations

Map, notification, analytics, KYC là capabilities phụ bên trong các domain này; không phải core domain riêng.

## 4. Backend shape mới

Không tạo thêm Edge Function nhỏ rời rạc nếu không cần.

Chuẩn mới:

```txt
supabase/functions/
├── identity/
├── commerce/
├── order-workflow/
├── payment-ledger/
├── trust-safety/
├── ai-orchestrator/
├── admin-ops/
├── notification/
└── income-commerce/
```

Các function cũ được xếp lại:

| Current | Target |
|---|---|
| auth-login, auth-register | identity |
| customer, worker, worker-jobs | commerce / order-workflow |
| payment-process, stripe-*, vnpay-* | payment-ledger |
| wallet-manager, invoice-generator | payment-ledger |
| ai-* functions | ai-orchestrator tools |
| companion, companion/chat | ai-orchestrator |
| agent-orchestrator, ai-auto-executor, workflow-engine | ai-orchestrator + order-workflow |
| admin | admin-ops |
| osm-geocode, osrm-route, service-area | commerce capability: geo |
| notify, register-device | notification |
| income-commerce | commerce + profit/correction core |

## 5. Database shape mới

### Keep legacy tables during migration

- profiles
- workers
- orders
- transactions
- wallets

### Add canonical commerce tables

- income_sources
- commerce_offers
- commerce_demands
- commerce_matches
- commerce_experiments
- profit_records
- correction_cycles
- learning_records
- commerce_decisions

### Future canonical names

| Legacy | Future |
|---|---|
| workers | partners |
| orders | commerce_orders |
| transactions | ledger_entries/payment_events |
| wallets | wallet_accounts |

Không rename production ngay. Dùng compatibility layer trước.

## 6. AI boundary

AI không được trực tiếp update DB quan trọng.

AI chỉ được:

```txt
understand -> propose -> call approved action -> write audit -> wait for verification
```

AI không được tự động:

- xác nhận payment thành công
- hoàn tiền
- khóa tài khoản
- đổi ledger
- xử lý tranh chấp cuối cùng
- tăng ngân sách lớn

## 7. Product MVP hoàn thiện

MVP không nên ôm tất cả dịch vụ. MVP hoàn thiện là một vòng tiền đầy đủ:

```txt
Partner tạo income source
-> AI tạo offer
-> Customer tạo demand
-> Match offer
-> Tạo order draft
-> Payment/cọc
-> Ghi profit
-> Nếu âm: correction
-> Nếu dương: scale/test tiếp
-> Admin quan sát
```

Đây là sản phẩm hoàn thiện hơn một app nhiều chức năng nhưng rời rạc.

## 8. What to keep

Giữ:

- Agent OS constitution.
- Service registry/plugin idea.
- AI core/model routing.
- Payment/webhook/idempotency logic.
- Admin dashboard.
- RLS/audit/security posture.
- Income Commerce OS.

## 9. What to freeze

Freeze, không mở rộng thêm cho đến khi gom xong domain:

- Thêm AI function mới kiểu `ai-something`.
- Thêm payment function mới nếu chưa qua payment-ledger.
- Thêm màn hình worker/customer mới nếu chưa map vào flow income/demand/order.
- Thêm docs chiến lược mới mà không cập nhật architecture decision.

## 10. What to remove/archive later

Không xóa ngay. Đưa vào `archive/legacy` hoặc mark deprecated sau khi có replacement:

- AI functions nhỏ trùng `ai-core`.
- Payment endpoints trùng nhau.
- Docs cũ nói Vifixa chỉ là app sửa chữa nếu không còn phù hợp.
- Seed/backup cũ không dùng trong hạ tầng mới.

## 11. Release plan

### Phase 1 — Stabilize

- Product package docs.
- Clean build.
- Vercel pass.
- Supabase staging pass.
- Income-commerce smoke pass.

### Phase 2 — Consolidate

- Tạo commerce gateway function.
- Tạo payment-ledger gateway function.
- Tạo ai-orchestrator gateway function.
- Mark legacy functions deprecated.

### Phase 3 — Productize

- UI cho partner tạo income source.
- UI cho AI tạo offer.
- UI cho demand/customer.
- Admin quan sát profit/correction.

### Phase 4 — Migrate

- Legacy worker/order flows chuyển dần sang partner/offer/order workflow.
- Không big-bang rewrite production.

## 12. Rule for future AI coding agents

Trước khi tạo file/function mới, agent phải trả lời:

1. Domain nào sở hữu chức năng này?
2. Có function cũ làm việc tương tự chưa?
3. Có thể thêm action vào gateway hiện có không?
4. Rủi ro payment/auth/admin là gì?
5. Có audit/log/rollback không?

Nếu không trả lời được, không được code thêm.
