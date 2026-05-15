# 🗺️ Vifixa AI — Roadmap

> 5 phases từ ý tưởng đến global scale.
> 
> Mỗi phase ra 1 milestone có thể deploy, có thể demo.

---

## PHASE A: 🧠 Companion Birth (3 ngày)

**Mục tiêu**: User register → có AI Companion → chat → diagnosis → tạo đơn

### Tasks
| # | Task | File | Output |
|---|------|------|--------|
| A1 | Migration 001: Companion tables | `supabase/migrations/001_companion_core.sql` | `companion_profiles`, `_memories`, `_interactions`, `customer_devices`, `worker_skills` |
| A2 | Migration 002: 3 Cores tables | `supabase/migrations/002_ai_map_payment.sql` | `service_requests`, `orders`, `workers`, `transactions`, `wallets`, `ledger` |
| A3 | Auth UI | `web/src/app/(auth)/login/page.tsx`, `register/page.tsx` | Login + Register + Redirect theo role |
| A4 | Companion Chat Function | `supabase/functions/v1/companion/chat.ts` | AI chat + memory + actions |
| A5 | AI Diagnose Function | `supabase/functions/v1/ai-diagnose/index.ts` | Diagnosis + price estimate |
| A6 | Companion Chat UI | `web/src/components/companion/CompanionChat.tsx` | Chat widget (reusable) |
| A7 | Customer Chat Page | `web/src/app/customer/chat/page.tsx` | Full chat với companion |
| A8 | AI Match Function | `supabase/functions/v1/ai-match/index.ts` | Match worker → order |
| A9 | Worker Dashboard | `web/src/app/worker/page.tsx` | Co-pilot dashboard |
| A10 | Order Pages | `web/src/app/customer/orders/page.tsx`, `[id]/page.tsx` | List + detail |

### Demo sau Phase A
```
User mở app → Register → Companion chào
→ Chat: "Máy lạnh không lạnh"
→ Companion chẩn đoán + báo giá
→ User confirm → tạo đơn thành công
```

---

## PHASE B: 🗺️ Map & Matching (3 ngày)

**Mục tiêu**: Thợ xuất hiện trên map, matching tự động theo location

### Tasks
| # | Task | File | Output |
|---|------|------|--------|
| B1 | MapView Component | `web/src/components/map/MapView.tsx` | Leaflet core |
| B2 | WorkerMarker Component | `web/src/components/map/WorkerMarker.tsx` | Worker icon trên map |
| B3 | OrderMarker Component | `web/src/components/map/OrderMarker.tsx` | Order icon trên map |
| B4 | map-search Function | `supabase/functions/v1/map-search/index.ts` | Tìm gần + OSRM route |
| B5 | Customer Map Page | `web/src/app/customer/map/page.tsx` | Thấy thợ gần |
| B6 | Worker Map Page | `web/src/app/worker/map/page.tsx` | Thấy đơn gần |
| B7 | AI Match nâng cấp | `supabase/functions/v1/ai-match/index.ts` | Match theo location thực |

### Demo sau Phase B
```
Customer mở map → thấy 3 thợ gần (có khoảng cách, rating)
→ Click vào thợ → xem profile → chat
→ Tạo đơn → AI match thợ gần nhất
→ Worker thấy đơn trên map → nhận → dẫn đường
```

---

## PHASE C: 💳 Payment & Wallet (3 ngày)

**Mục tiêu**: Thanh toán VNPay/Stripe, wallet worker, ledger

### Tasks
| # | Task | File | Output |
|---|------|------|--------|
| C1 | payment-create Function | `supabase/functions/v1/payment-create/index.ts` | Tạo payment VNPay/Stripe |
| C2 | VNPay IPN Webhook | `supabase/functions/webhooks/vnpay-ipn/index.ts` | Xử lý IPN callback |
| C3 | VNPay Return Handler | `web/src/app/api/payments/vnpay/return/route.ts` | Redirect sau payment |
| C4 | Payment UI | `web/src/components/payment/PaymentModal.tsx` | Chọn gateway + QR |
| C5 | Wallet Function | `supabase/functions/v1/wallet/index.ts` | Wallet + ledger |
| C6 | Worker Earnings Page | `web/src/app/worker/earnings/page.tsx` | Xem thu nhập |
| C7 | Admin Payment Settings | `web/src/app/admin/settings/payments/page.tsx` | Config gateway |

### Demo sau Phase C
```
Customer tạo đơn → "Thanh toán qua VNPay"
→ Redirect VNPay sandbox → nhập thẻ test
→ VNPay callback → order chuyển "paid"
→ Worker thấy "đã thanh toán" → làm job
→ Hoàn thành → tiền vào wallet worker
```

---

## PHASE D: 📱 Mobile + Admin (3 ngày)

**Mục tiêu**: App mobile (iOS/Android) + Admin dashboard

### Tasks
| # | Task | File | Output |
|---|------|------|--------|
| D1 | Customer Mobile | `mobile/src/app/(customer)/*.tsx` | Chat, Map, Orders |
| D2 | Worker Mobile | `mobile/src/app/(worker)/*.tsx` | Jobs, Map, Earnings |
| D3 | Shared Components | `mobile/src/components/` | CompanionChat, MapView |
| D4 | Admin Dashboard | `web/src/app/admin/*.tsx` | Users, Orders, Payments |
| D5 | E2E Tests | `web/tests/` | Playwright critical flows |
| D6 | EAS Build | `eas build --profile production` | iOS + Android |

### Demo sau Phase D
```
Mobile App: Customer mở app → chat → đặt → thanh toán
Mobile App: Worker nhận job → map → hoàn thành
Web Admin: Dashboard → users → orders → payments
```

---

## PHASE E: 🌍 Global Scale (∞)

**Mục tiêu**: Vươn ra thế giới

### Tasks
| # | Task | Mô tả |
|---|------|-------|
| E1 | Multi-language | AI companion nói tiếng Anh, Trung, Nhật, Hàn |
| E2 | Multi-currency | USD, EUR, JPY, KRW, SGD |
| E3 | Multi-region | Supabase projects per region |
| E4 | Voice | Speech-to-text + text-to-speech |
| E5 | Vision | AI nhìn ảnh chẩn đoán chính xác |
| E6 | Predictive | AI dự đoán hỏng hóc trước 30 ngày |
| E7 | B2B | Platform cho building management, facility |
| E8 | Marketplace | AI Marketplace cho third-party services |
| E9 | AI SDK | Cho đối tác tích hợp companion |

---

## Timeline

```
Phase A ████████████░░░░░░░░░░░░  3 ngày  ← BẮT ĐẦU
Phase B ░░░░░░░░░░░████████████░░  3 ngày
Phase C ░░░░░░░░░░░░░░░░████████  3 ngày
Phase D ░░░░░░░░░░░░░░░░░░░░████  3 ngày
Phase E ░░░░░░░░░░░░░░░░░░░░░░░░  (ongoing)
        └─────────────────────────
        0    3    6    9    12   ngày
```

> **Mục tiêu**: Phase A → C (9 ngày) = production MVP có thể launch.
> 
> Phase D (3 ngày) = mobile release.
> 
> Phase E (ongoing) = global domination.