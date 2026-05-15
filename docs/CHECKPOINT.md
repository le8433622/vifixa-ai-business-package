# 📋 Vifixa AI — System Checkpoint

> **Quy định**: Sau mỗi phiên làm việc (session), bắt buộc cập nhật file này.
> 
> Mục tiêu: **Chỉ cần đọc file này là hiểu toàn bộ dự án** — đã làm gì, chưa làm gì, sắp làm gì.

---

## 1. TỔNG QUAN DỰ ÁN

| Mục | Chi tiết |
|-----|----------|
| **Tên** | Vifixa AI |
| **Slogan** | Smart services for real life |
| **Mission** | 1 AI Companion cho mỗi người dùng |
| **North Star** | App dịch vụ gia đình tốt nhất lịch sử loài người |
| **3 Trụ cột** | AI · Map · Payment → phục vụ khách hàng |
| **Stack** | Supabase (Postgres + Edge Functions) · Vercel (Next.js 16) · Expo (SDK 54) |
| **AI** | NVIDIA NIM (Llama 3.1 · Mixtral · Llama 3.2 Vision) |
| **Payment** | VNPay (VND) + Stripe (USD) |
| **Map** | OpenStreetMap + Leaflet + OSRM |
| **Repo chính** | `github.com/le8433622/vifixa-ai-business-package` |
| **Repo backup** | `github.com/le8433622/vifixa-ai-v4` (archive, không modify) |

---

## 2. TÌNH TRẠNG HIỆN TẠI

| Hạng mục | Trạng thái | Ghi chú |
|----------|-----------|---------|
| **Tài liệu nền tảng** | ✅ Hoàn thành | VISION, COMPANION, ARCHITECTURE, ROADMAP, AGENTS, agent |
| **Kiến trúc** | ✅ Đã thiết kế | 4-layer: Presentation → Companion → 3 Cores → Infrastructure |
| **Database schema** | ✅ Đã thiết kế | 7 bảng core + 5 bảng memory |
| **API design** | ✅ Đã thiết kế | 9 Edge Functions + 2 Webhooks |
| **VNPay credentials** | ✅ Đã có | Terminal ID: 9PCXHWJ9, Secret Key: đã lưu |
| **Code hiện tại** | ⏸️ Giữ nguyên | Code cũ trong repo giữ làm reference, không xoá |
| **Phase A (Companion Birth)** | ❌ Chưa bắt đầu | Sẽ bắt đầu sau khi duyệt plan |
| **Supabase Production** | ⏸️ Đang chạy | Project ref: `lipjakzhzosrhttsltwo` |
| **Vercel Production** | ⏸️ Đang chạy | URL: `https://web-eta-ochre-99.vercel.app` |
| **Git remote** | ⚠️ Cần fix | Đang trỏ vào v4 backup, cần đổi về main repo |

---

## 3. KIẾN TRÚC (tóm tắt)

```
┌──────────────────────────────────────────────────┐
│           AI COMPANION LAYER ★ MỚI               │
│  Mỗi user có 1 AI: nhớ, học, hành động thay bạn  │
├──────────────────┬───────────────┬───────────────┤
│    AI CORE       │   MAP CORE    │  PAYMENT CORE │
│  Diagnose, Match │  Tìm gần,     │  VNPay, Stripe │
│  Price, Fraud    │  Route, Theo  │  Wallet, Sổ   │
│  Predict         │  dõi, Nhiệt   │  cái (Ledger) │
│                  │  độ          │               │
├──────────────────┴───────────────┴───────────────┤
│              SUPABASE + VERCEL + EXPO            │
└──────────────────────────────────────────────────┘
```

---

## 4. CHỨC NĂNG ĐÃ LÀM ĐƯỢC

| # | Chức năng | File/Mô tả | Trạng thái |
|---|-----------|-----------|-----------|
| 1 | **Tài liệu VISION** | `docs/VISION.md` — tầm nhìn, 3 personas, global scale | ✅ Done |
| 2 | **Tài liệu COMPANION** | `docs/COMPANION.md` — memory, personality, actions, UI | ✅ Done |
| 3 | **Tài liệu ARCHITECTURE** | `docs/ARCHITECTURE.md` — 4-layer, DB schema, API, stack | ✅ Done |
| 4 | **Tài liệu ROADMAP** | `docs/ROADMAP.md` — 5 phases A→E | ✅ Done |
| 5 | **AGENTS.md** | Directive mới: 3 cores, source of truth, rules | ✅ Done |
| 6 | **agent.md** | Sequential process: Step 1→10, chi tiết đến từng file | ✅ Done |
| 7 | **CHECKPOINT.md** | File này — nhật ký phiên bắt buộc | ✅ Done |

---

## 5. CHỨC NĂNG CHƯA LÀM / ĐANG LÀM

| # | Chức năng | Phase | Ưu tiên | Ghi chú |
|---|-----------|-------|---------|---------|
| 1 | Fix git remote về main repo | 0 | ✅ Xong | `git remote set-url origin https://github.com/le8433622/vifixa-ai-business-package.git` |
| 2 | Migration 001: companion tables | A | ✅ Xong | `companion_profiles`, `_memories`, `_interactions`, `customer_devices`, `worker_skills` |
| 3 | Migration 002: core tables | A | ✅ Xong | `service_requests`, `orders`, `workers`, `transactions`, `wallets`, `ledger` |
| 4 | Migration 003: seed VNPay | A | ✅ Xong | Insert VNPay credentials vào `gateway_configs` |
| 5 | Companion Chat Edge Function | A | ✅ Xong | `supabase/functions/v1/companion/chat.ts` |
| 6 | AI Diagnose Function | A | ✅ Xong | `supabase/functions/v1/ai-diagnose/index.ts` |
| 7 | Auth UI (login/register) | A | ✅ Xong | `web/src/app/(auth)/` — Companion greeting, role selection |
| 8 | Companion Chat UI | A | ✅ Xong | `web/src/components/companion/CompanionChat.tsx` |
| 9 | Customer chat page | A | ✅ Xong | `web/src/app/customer/page.tsx` — Dashboard + Chat |
| 10 | Worker dashboard | A | ✅ Xong | `web/src/app/worker/page.tsx` |
| 11 | VNPay IPN webhook | C | 🟡 Trung bình | `supabase/functions/webhooks/vnpay-ipn/` |
| 12 | Payment UI | C | 🟡 Trung bình | `web/src/components/payment/PaymentModal.tsx` |
| 13 | Map components | B | 🟢 Thấp | `web/src/components/map/` |
| 14 | Mobile screens | D | 🟢 Thấp | `mobile/src/app/` |
| 15 | E2E tests | D | 🟢 Thấp | Playwright |
| 16 | Deploy production | D | 🟢 Thấp | Vercel + EAS Build |

---

## 6. LỖI / VẤN ĐỀ ĐÃ BIẾT

| # | Vấn đề | Mức độ | Giải pháp |
|---|--------|--------|-----------|
| 1 | **Git remote sai** | 🔴 Cao | `git remote set-url origin https://github.com/le8433622/vifixa-ai-business-package.git` |
| 2 | **Code cũ trong repo** | 🟡 Trung | Không xoá, giữ làm reference. Code mới viết chồng/ song song |
| 3 | **supabase/functions/ có ~38 functions cũ** | 🟡 Trung | Deploy chồng lên, hoặc xoá function cũ trước khi deploy mới |
| 4 | **VNPay code có sẵn** | ✅ Không lỗi | `_shared/gateways/vnpay.ts` có sẵn, cần kiểm tra logic HMAC |
| 5 | **Tài liệu cũ trong docs/** | 🟢 Thấp | Giữ nguyên, không xoá. Tài liệu mới đã tạo thêm |

---

## 7. LỘ TRÌNH TIẾP THEO

### Phase 0 (✅ Xong)
```
[x] Fix git remote → main repo
[x] User duyệt plan
```

### Phase A: Companion Birth (✅ Cơ bản xong, còn 3 tasks nhỏ)
```
[x] DB migration 001 + 002 + 003
[x] Auth UI (login/register)
[x] Companion Chat Edge Function
[x] AI Diagnose Function
[x] Companion Chat UI component
[x] Customer chat page (dashboard)
[x] AI Match Function
[x] Worker dashboard
[x] Order list + Admin dashboard

⬜ Order detail với payment buttons
⬜ Worker job detail page
⬜ Deploy lên Vercel kiểm tra
```

### Phase B: Map (3 ngày)
```
  [ ] Map components (Leaflet)
  [ ] map-search function
  [ ] Customer map (thấy thợ gần)
  [ ] Worker map (thấy đơn gần)
  [ ] AI match với location
```

### Phase C: Payment (3 ngày)
```
  [ ] payment-create function
  [ ] VNPay IPN + return handlers
  [ ] Payment UI
  [ ] Wallet + Ledger
```

### Phase D: Mobile + Admin (3 ngày)
```
  [ ] Mobile screens
  [ ] Admin dashboard
  [ ] E2E tests
  [ ] Deploy production
```

---

## 8. ĐỀ XUẤT

| # | Đề xuất | Lý do |
|---|---------|-------|
| 1 | **Code theo kiểu "file-based"**: mỗi chức năng = 1 file riêng, không lộn xộn | Dễ maintain, dễ test |
| 2 | **Tất cả AI qua 1 Edge Function duy nhất** (`companion/chat`) thay vì nhiều function riêng lẻ | Giảm latency, tận dụng context |
| 3 | **VNPay sandbox trước, live sau**: test với sandbox cho đến khi flow hoàn chỉnh | Tránh rủi ro mất tiền thật |
| 4 | **Web trước, mobile sau**: build web production trước, mobile là phase D | Web deploy nhanh hơn, dễ iterate |
| 5 | **Không xoá code cũ**: code cũ trong repo giữ nguyên, code mới viết mới | Tránh mất reference, có thể tham khảo cách implement |

---

## 9. NHẬT KÝ PHIÊN (CHANGELOG)

### Session 1 — 2026-05-14
**Nội dung**: Thiết lập tầm nhìn + kiến trúc + tài liệu nền tảng

| Việc đã làm | Kết quả |
|-------------|---------|
| Phân tích repo hiện tại | Phát hiện: repo đang trỏ vào v4, code V4 có sẵn |
| Xác định "kiểu mới" | 3 cores (AI·Map·Payment) + Companion Layer |
| Tạo AGENTS.md | Directive mới, source of truth mới |
| Tạo agent.md | Sequential process Step 1→10 |
| Tạo docs/VISION.md | Tầm nhìn: 1 AI Companion per person |
| Tạo docs/COMPANION.md | Memory, Personality, Actions, UI |
| Cập nhật docs/ARCHITECTURE.md | 4-layer, DB schema, 9 functions |
| Tạo docs/ROADMAP.md | 5 phases (A→E), timeline |
| Tạo docs/CHECKPOINT.md | File nhật ký phiên bắt buộc |

**Quyết định quan trọng**:
- ✅ 3 trụ cột: AI · Map · Payment
- ✅ 1 AI Companion cho mỗi user
- ✅ Production ngay từ đầu, không MVP
- ✅ VNPay + Stripe song song
- ✅ V4 code giữ nguyên làm reference

---

### Session 2 — 2026-05-14
**Nội dung**: Build Phase A — Companion Birth (Database + Edge Functions + UI)

| Việc đã làm | Kết quả |
|-------------|---------|
| Fix git remote về main repo | `git remote set-url origin https://github.com/le8433622/vifixa-ai-business-package.git` |
| Migration 001: Companion Core | `companion_profiles`, `companion_memories`, `_interactions`, `customer_devices`, `worker_skills` |
| Migration 002: 3 Cores | `service_requests`, `orders` (có location), `workers`, `transactions`, `wallets`, `ledger`, `ai_logs`, `profiles` |
| Migration 003: VNPay Seed | Seed VNPay sandbox credentials + Stripe enabled |
| Auth trigger | `handle_new_user()` — auto tạo profile + companion khi signup |
| Auth UI | Login + Register mới (Companion greeting, role selection, tiếng Việt) |
| Companion Chat Function | `supabase/functions/companion/index.ts` — AI tự trị, memory, actions |
| AI Diagnose Function | `supabase/functions/ai-diagnose/index.ts` — Diagnosis + pricing |
| AI Match Function | `supabase/functions/ai-match/index.ts` — Haversine + skill matching |
| Payment Create Function | `supabase/functions/payment-create/index.ts` — VNPay HMAC-SHA512 |
| CompanionChat UI | `web/src/components/companion/CompanionChat.tsx` — reusable chat widget |
| Customer Dashboard | `web/src/app/customer/page.tsx` — Chat + sidebar orders |
| Worker Dashboard | `web/src/app/worker/page.tsx` — Co-pilot + jobs |
| Customer Orders Page | `web/src/app/customer/orders/page.tsx` — List + trạng thái |
| Worker Jobs Page | `web/src/app/worker/jobs/page.tsx` + `[id]/` | Available jobs + detail + accept |
| Admin Dashboard | `web/src/app/admin/page.tsx` — Stats + recent orders |
| VNPay Return Handler | `web/src/app/api/payments/vnpay/return/route.ts` |
| VNPay IPN Handler | `web/src/app/api/payments/vnpay/ipn/route.ts` |
| Web build | ✅ Pass — 57 routes, 0 errors |
| Supabase GRANTs | ✅ Fixed for all tables |
| **📦 DEPLOYMENT** | |
| Xoá 66 Edge Functions cũ | ✅ Supabase functions cleaned |
| Push 4 migrations mới | ✅ Companion + Core + VNPay applied |
| Deploy 4 new Edge Functions | ✅ companion, ai-diagnose, ai-match, payment-create |
| Deploy Vercel | ✅ 57 routes live at https://web-eta-ochre-99.vercel.app |
| Verify | ✅ Web 200 OK, Edge Functions 401 (reachable) |

### Session 2 — (next session)
**Nội dung**: ...

---

> *"Đây không chỉ là code. Đây là sự sáng tạo phục vụ cho con người."*