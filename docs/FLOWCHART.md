# Vifixa AI — Flowchart (Manual + Auto)

> Cross-flow cho Khách · Thợ · Admin × Manual · Auto
> Cập nhật: 2026-05-17 — Agent OS version

---

## 1. Customer Flow — Manual Mode

```
┌─────────────────────────────────────────────────────────────────┐
│                    KHÁCH HÀNG — THỦ CÔNG                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Login → Home                                                    │
│    │                                                             │
│    ├── Service Request                                           │
│    │    ├── Chọn dịch vụ (repair/cleaning/delivery...)           │
│    │    ├── Điền form (device, problem, location)                │
│    │    ├── ✅ AI estimate price (bắt buộc)                      │
│    │    └── Tạo đơn → workflow engine                            │
│    │                                                             │
│    ├── Chat với AI Companion                                     │
│    │    ├── Nhắn tin mô tả vấn đề                                │
│    │    ├── Gửi ảnh → Vision diagnose                            │
│    │    └── Bấm nút "Tạo đơn" / "Tìm thợ" / "Thanh toán"       │
│    │                                                             │
│    ├── Map                                                        │
│    │    ├── Xem AvailableWorkersMap                              │
│    │    └── Bấm vào thợ → BookWorkerModal                       │
│    │                                                             │
│    └── Profile                                                   │
│         ├── Đổi địa chỉ / số điện thoại / mật khẩu               │
│         ├── Thêm thiết bị                                        │
│         └── Xem lịch sử đơn hàng                                 │
│                                                                  │
│  Order Detail                                                    │
│    ├── Xem thợ trên map (WorkerTracker)                          │
│    ├── Chat với thợ                                              │
│    └── Theo dõi real-time GPS                                    │
│                                                                  │
│  Thanh toán                                                      │
│    ├── VNPay → QR code                                           │
│    ├── Stripe → Card                                              │
│    └── Wallet → Số dư                                            │
│                                                                  │
│  Hoàn thành                                                      │
│    ├── Đánh giá (ReviewModal)                                    │
│    ├── Yêu cầu hoàn tiền (RefundRequestModal)                    │
│    └── Kích hoạt bảo hành                                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 2. Customer Flow — Auto Mode

```
┌─────────────────────────────────────────────────────────────────┐
│                    KHÁCH HÀNG — TỰ ĐỘNG                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User nói 1 câu → AI Companion xử lý toàn bộ                     │
│                                                                  │
│  Ví dụ: "Máy lạnh không lạnh, xử lý giúp tôi"                    │
│    │                                                             │
│    ▼                                                             │
│  PERCEPTION: intent = repair_device, service = repair            │
│    │                                                             │
│    ▼                                                             │
│  GOAL PLANNER: tạo goal + plan                                   │
│    │                                                             │
│    ▼                                                             │
│  PLAN STEPS:                                                     │
│    Step 1: service.detect (L2 auto) → ✓ "Sửa chữa thiết bị"    │
│    Step 2: service.collect_slots (L2 auto)                       │
│    Step 3: service.diagnose (L2 auto) → "Thiếu gas R32"         │
│    Step 4: service.quote (L1 draft) → 500K-900K                 │
│    Step 5: service.create_order (L3 cần confirm)                 │
│    │      → AI: "Đặt thợ Nguyễn Văn A? Giá 500K-900K?"          │
│    │      → User: "Ok" ✓                                        │
│    Step 6: map.track_worker (L2 auto)                            │
│    Step 7: payment.create_intent (L3 cần confirm)                │
│           → AI: "Thanh toán 650K qua VNPay?"                     │
│           → User: "Ok" ✓                                        │
│                                                                  │
│  OBSERVE + UPDATE:                                               │
│    ├── memory.save_fact: ac_last_service = 2026-05-17            │
│    ├── memory.save_fact: ac_gas_type = R32                       │
│    ├── customer.schedule_maintenance: +6 tháng                   │
│    └── suggest: "Đề xuất vệ sinh máy lạnh sau 3 tháng"          │
│                                                                  │
│  Ví dụ: "Đổi địa chỉ thành 123 Nguyễn Huệ, Quận 1"              │
│    │                                                             │
│    ▼                                                             │
│  L2 auto → geocode → account.update_address → done               │
│    AI: "Đã cập nhật địa chỉ mới: 123 Nguyễn Huệ, Quận 1 ✅"    │
│                                                                  │
│  Ví dụ: "Đổi số điện thoại thành 0987654321"                     │
│    │                                                             │
│    ▼                                                             │
│  L2 auto + OTP → gửi OTP → user nhập → verify → update → done   │
│    AI: "Đã đổi số điện thoại thành 0987654321 ✅"               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Worker Flow — Manual Mode

```
┌─────────────────────────────────────────────────────────────────┐
│                      THỢ — THỦ CÔNG                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Online → GPS auto-track                                        │
│    │                                                             │
│    ├── Dashboard                                                 │
│    │    ├── Xem KPI: đơn hôm nay, thu nhập, rating               │
│    │    └── AI Co-pilot gợi ý (nếu có)                          │
│    │                                                             │
│    ├── Map (WorkerMap)                                            │
│    │    ├── Xem đơn gần nhất                                     │
│    │    ├── Bấm vào đơn → detail                                │
│    │    └── Bấm "Nhận đơn"                                      │
│    │                                                             │
│    ├── Jobs                                                      │
│    │    ├── Danh sách đơn + detail                               │
│    │    ├── Bấm "Bắt đầu" sau check-in                          │
│    │    ├── Bấm "Hoàn thành" + upload ảnh                       │
│    │    └── Xem lịch sử                                          │
│    │                                                             │
│    ├── Earnings                                                  │
│    │    ├── Thu nhập pending (escrow.held)                       │
│    │    ├── Thu nhập completed (escrow.released)                 │
│    │    └── Payout history + Stripe Connect                      │
│    │                                                             │
│    └── Profile                                                   │
│         ├── KYC + Portfolio                                      │
│         ├── Staking + VFC Points                                 │
│         └── Settings                                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 4. Worker Flow — Auto Mode

```
┌─────────────────────────────────────────────────────────────────┐
│                      THỢ — TỰ ĐỘNG                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Mỗi sáng AI chủ động:                                           │
│    "Chào anh! Hôm nay có 5 đơn gần khu vực của anh.              │
│     Đơn tốt nhất: sửa máy lạnh - 2.3km - 500K"                  │
│                                                                  │
│  User: "Có đơn nào không?"                                       │
│    │                                                             │
│    ▼                                                             │
│  AI: map.find_providers (đảo: find jobs)                         │
│    → Rank jobs theo: skill match × income/km × rating            │
│    → AI: "3 đơn phù hợp nhất:                                    │
│       1. 🔧 Sửa máy lạnh - 2.3km - 500K                         │
│       2. 🔧 Sửa ống nước - 3.1km - 300K                         │
│       3. 🧹 Vệ sinh máy lạnh - 4.5km - 250K"                    │
│                                                                  │
│  User: "Nhận đơn 1"                                              │
│    │                                                             │
│    ▼                                                             │
│  L3 (cần confirm) → worker.accept_job                            │
│    AI: "Đã nhận đơn! Lộ trình: 2.3km, ~8 phút. Bắt đầu đi?"     │
│                                                                  │
│  AI chủ động sau job:                                            │
│    "Hoàn thành! Tổng hôm nay: 1.2M.                              │
│     Còn 1 đơn cách 800m: sửa ống nước 300K. Nhận không?"        │
│                                                                  │
│  User: "Thu nhập tuần này?"                                      │
│    │                                                             │
│    ▼                                                             │
│  AI: query ledger → aggregate                                    │
│    "📊 Tuần này: 12 đơn, 6.2M. Tăng 12% so với tuần trước.      │
│     Đơn trung bình: 517K. Tỉ lệ nhận đơn: 85%.                  │
│     Gợi ý: thêm skill 'vệ sinh máy lạnh' → +20% đơn"            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Admin Flow — Manual Mode

```
┌─────────────────────────────────────────────────────────────────┐
│                     ADMIN — THỦ CÔNG                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Dashboard                                                       │
│    ├── KPI cards: users, orders, revenue, disputes               │
│    └── Recent activity feed                                      │
│                                                                  │
│  Users / Workers                                                 │
│    ├── Danh sách + search                                        │
│    ├── Detail: lock/unlock, KYC status, history                  │
│    └── Lock management (3 levels)                                │
│                                                                  │
│  Orders / KYC / Disputes                                         │
│    ├── Order cockpit: detail + timeline + actions                │
│    ├── KYC review: Vision AI assist + approve/reject             │
│    └── Dispute: AI analysis + resolve + refund                   │
│                                                                  │
│  Analytics / Payments / Settings                                 │
│    ├── Revenue forecast (ai-predict)                             │
│    ├── Location analytics (heatmap)                              │
│    ├── Payment failure center                                    │
│    └── AI model config + cron jobs                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 6. Admin Flow — Auto Mode

```
┌─────────────────────────────────────────────────────────────────┐
│                     ADMIN — TỰ ĐỘNG                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Mỗi sáng 7h: AI daily brief                                     │
│    "📊 Tóm tắt 17/05/2026:                                       │
│     • 45 đơn mới (+8%)                                           │
│     • Doanh thu: 23.4M                                           │
│     • ⚠️ 2 thanh toán thất bại                                   │
│     • 5 KYC đang chờ (3 auto-approve)                            │
│     • 2 tranh chấp mới                                            │
│     • Khu vực thiếu thợ: Quận 7 (-3)                             │
│     Đề xuất:                                                      │
│     1. Duyệt 3 KYC auto                                           │
│     2. Xem 2 tranh chấp #123, #124                               │
│     3. Mở chiến dịch tuyển thợ Quận 7"                            │
│                                                                  │
│  Admin: "Duyệt KYC auto"                                         │
│    │                                                             │
│    ▼                                                             │
│  AI: 3 KYC risk thấp → admin.review_kyc (L4 auto)                │
│    → Approved: Nguyễn Văn A, Trần Thị B, Lê Văn C                │
│    → 2 risk cao: để lại admin xem                                │
│                                                                  │
│  AI chủ động phát hiện:                                          │
│    "🚨 Order #789 fraud score 92%                                 │
│     Pattern: 4 đơn/1h, IP thay đổi, cùng service                 │
│     Đề xuất: khóa TK + hoàn tiền"                                 │
│                                                                  │
│  AI workforce planning:                                          │
│    "⚠️ Quận 7: nhu cầu sửa máy lạnh tăng 40%                    │
│     Hiện chỉ có 2 thợ → thiếu 3                                 │
│     Đề xuất: mở campaign tuyển dụng, tăng boost phí"             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Agent OS Core Loop

```
                          ┌──────────────┐
                          │ USER REQUEST │
                          └──────┬───────┘
                                 │
                    ┌────────────▼────────────┐
                    │ PERCEPTION               │
                    │ Intent + Service + Memory│
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │ GOAL PLANNER             │
                    │ Tạo goal + plan          │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │ POLICY ENGINE            │
                    │ Check autonomy level     │
                    └──────┬──────────┬───────┘
                           │          │
                    ┌──────▼──┐  ┌───▼──────────┐
                    │ AUTO    │  │ NEED APPROVAL │
                    │ execute │  │ → ask user    │
                    └──────┬──┘  └───┬─────┬─────┘
                           │         │     │
                           │    ┌────▼──┐  │
                           │    │APPROVE│  │
                           │    └────┬──┘  │
                           │         │      │
                    ┌──────▼─────────▼──────▼──┐
                    │ ACTION EXECUTOR          │
                    │ Call Edge Function / RPC │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │ OBSERVE + UPDATE         │
                    │ Workflow · Notify ·      │
                    │ Memory · Audit · Suggest │
                    └──────────────────────────┘
```

---

## 8. Cross-Cutting: Audit Trail

```
Mọi AI action ghi vào:

agent_goals     — user X tạo goal Y lúc Z
  └── agent_runs    — goal Y chạy lần thứ K
       └── agent_steps   — step 1: service.detect → output {...}
            └── agent_approvals — step 5 cần confirm → user approved

AI không thể:
- Ghi DB trực tiếp từ UI
- Tạo đơn không qua workflow engine
- Thanh toán không qua payment-process
- Khóa/mở TK không qua admin review
```

---

## Ký Hiệu

| Ký hiệu | Ý nghĩa |
|---|---|
| L0-L2 | Auto execute |
| L3 | Auto execute + confirm |
| L4 | Auto suggest (hiển thị, admin duyệt) |
| L5 | Full auto-pilot (cần user bật) |
| ★ | Agent OS layer mới |