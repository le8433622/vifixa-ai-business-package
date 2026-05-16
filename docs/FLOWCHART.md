# Vifixa AI — Flowchart Tổng Thể

## 1. Luồng Khách Hàng (Customer Flow)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        KHÁCH HÀNG                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Đăng nhập                                                          │
│      │                                                              │
│      ├──[Manual]──→ Chọn danh mục dịch vụ                           │
│      │                 │                                            │
│      │                 ├── Điền mô tả + ảnh                         │
│      │                 ├── Chọn địa chỉ (map)                       │
│      │                 ├── Chọn thời gian                           │
│      │                 └── Gửi đơn                                   │
│      │                      │                                       │
│      └──[Auto]───→ Chat với AI Companion                            │
│                        │                                            │
│                        ├── "Máy lạnh không lạnh"                    │
│                        ├── AI Diagnose → báo giá                   │
│                        ├── User confirm                             │
│                        └── Tạo đơn (order:created)                   │
│                             │                                       │
│   ╔═════════════════════════╪══════════════════════════════════╗    │
│   ║          WORKFLOW ENGINE (đề xuất)                        ║    │
│   ║                                                           ║    │
│   ║  order:created                                            ║    │
│   ║      ├── GAP ❌: SMS "Đơn đã được tạo"                    ║    │
│   ║      ├── GAP ❌: Payment request (nếu chưa thanh toán)    ║    │
│   ║      └── GAP ❌: Bắt đầu matching                         ║    │
│   ║                                                           ║    │
│   ╚═══════════════════════════════════════════════════════════╝    │
│                                                                      │
│  Thanh toán (nếu chưa)                                              │
│      │                                                              │
│      ├── VNPay (VND)                                                │
│      ├── Stripe (USD)                                               │
│      └── Wallet (internal)                                          │
│           │                                                         │
│           ▼                                                         │
│  Payment Success                                                    │
│      │                                                              │
│   ╔═══╪═════════════════════════════════════════════════════════╗   │
│   ║   └── GAP ❌: payment:success → trigger workflow step 2    ║   │
│   ╚═════════════════════════════════════════════════════════════╝   │
│                                                                      │
│  Chờ thợ                                                           │
│      │                                                              │
│      ├── GAP ❌: Xem thợ real-time trên map (live tracking)        │
│      ├── GAP ❌: Nhận SMS khi thợ nhận đơn                          │
│      ├── GAP ❌: Nhận SMS khi thợ sắp đến                           │
│      └── Tracking hiện tại: WorkerTracker (chỉ khi ở trang detail)  │
│                                                                      │
│  Thợ đến + hoàn thành                                               │
│      │                                                              │
│      ├── GAP ❌: Auto nhận SMS "Dịch vụ hoàn thành"                 │
│      ├── GAP ❌: Auto popup đánh giá                                 │
│      ├── GAP ❌: Auto nhận hóa đơn điện tử                           │
│      └── AI nhớ: "đã sửa máy lạnh ngày 14/05"                      │
│                                                                      │
│  Khiếu nại (nếu có)                                                │
│      │                                                              │
│      └── GAP ❌: Yêu cầu hoàn tiền → dispute flow                  │
│                                                                      │
│  AI Proactive (đề xuất)                                            │
│      │                                                              │
│      └── GAP ❌: "Đã 6 tháng, đến lúc bảo trì máy lạnh!"           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Luồng Thợ (Worker Flow)

```
┌─────────────────────────────────────────────────────────────────────┐
│                           THỢ                                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Online (GPS auto-track)                                            │
│      │                                                              │
│      ├── Đang rảnh → nhận đơn gần (map hoặc job list)              │
│      │                                                                │
│      ├──[Manual]──→ Xem danh sách job → chọn → nhận                 │
│      │                                                                │
│      └──[Auto]───→ AI gợi ý: "Job phù hợp nhất: Quận 7, 500K"     │
│                        │                                            │
│                        └── GAP ❌: AI suggest job priority          │
│                                                                      │
│  Nhận đơn                                                          │
│      │                                                              │
│      ├── GAP ❌: Nhận SMS "Bạn có job mới"                         │
│      ├── GAP ❌: OSRM route từ vị trí → địa chỉ job                │
│      └── Xem chi tiết job                                           │
│                                                                      │
│  Đến nơi                                                           │
│      │                                                              │
│      ├── Geo-fence Check-in ✅                                      │
│      ├── GAP ❌: Auto gửi SMS cho khách "Thợ đã đến"               │
│      └── GAP ❌: Auto cập nhật worker location cho customer thấy    │
│                                                                      │
│  Làm việc                                                          │
│      │                                                              │
│      ├── Chụp ảnh trước/sau                                          │
│      ├── Điền checklist                                               │
│      └── GAP ❌: AI Coach suggest tips trong lúc làm                │
│                                                                      │
│  Hoàn thành                                                        │
│      │                                                              │
│      ├── GAP ❌: AI Quality Check tự động (ai-quality)              │
│      ├── GAP ❌: Auto release escrow                                │
│      ├── GAP ❌: Cập nhật trust score                               │
│      └── GAP ❌: Gửi SMS hóa đơn + yêu cầu đánh giá cho khách      │
│                                                                      │
│  Thu nhập                                                          │
│      │                                                              │
│      ├── Xem earnings dashboard                                      │
│      ├── AI suggest staking ✅                                       │
│      ├── GAP ❌: Xem transaction history chi tiết                    │
│      └── GAP ❌: Quản lý payout method (Stripe Connect)              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Luồng Admin (Admin Flow)

```
┌─────────────────────────────────────────────────────────────────────┐
│                           ADMIN                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Dashboard                                                         │
│      │                                                              │
│      ├── KPI cards (users, workers, orders, revenue, disputes)      │
│      ├── AI Companion Chat (AI Analyst)                             │
│      └── Wallet Dashboard                                           │
│                                                                      │
│  KYC Management                                                    │
│      │                                                              │
│      ├── Xem pending KYC workers                                    │
│      ├── AI Vision Verify ✅                                         │
│      │      └── AI xem ảnh CMND/CCCD + Selfie                      │
│      ├── Admin duyệt (approve/reject)                               │
│      └── GAP ❌: Auto approve nếu confidence > 0.9                  │
│                                                                      │
│  Lock Management                                                   │
│      │                                                              │
│      ├── Tạo lock (Warning/Temporary/Permanent)                     │
│      ├── Unlock                                                     │
│      └── GAP ❌: Auto-check pending orders khi lock                 │
│                                                                      │
│  Dispute Resolution                                                │
│      │                                                              │
│      ├── Xem dispute detail                                         │
│      ├── AI phân tích dispute                                        │
│      └── GAP ❌: Refund → auto-trigger wallet-manager:escrow:refund │
│                                                                      │
│  Analytics                                                         │
│      │                                                              │
│      ├── Location analytics (biểu đồ quận)                          │
│      ├── GAP ❌: AI detect anomaly (price spike, fraud cluster)     │
│      ├── GAP ❌: AI revenue forecast                                │
│      └── GAP ❌: AI workforce suggestion "Cần thêm 2 thợ Quận 7"    │
│                                                                      │
│  AI Settings                                                       │
│      │                                                              │
│      └── Model config, agent prompts, feature flags                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Luồng AI Core

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AI CORE                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  43 Edge Functions tồn tại. Cốt lõi:                               │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  _shared/ai-core.ts (Engine trung tâm)                      │   │
│  │  - 4 NVIDIA model tiers: cheap, balanced, smart, vision     │   │
│  │  - Agent types: 12 (chat, diagnose, pricing, match, ...)    │   │
│  │  - Hỗ trợ: reasoning, learning, personalization, web search │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  Widget tích hợp AI:                                                │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  useAutoMode hook (state machine)                           │   │
│  │  - Customer: chat → quoting → payment → tracking → completed│   │
│  │  - Worker: idle → on_job                                    │   │
│  │  - Admin: idle → alert                                      │   │
│  │  - Realtime subscription → tự động cập nhật state           │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ❌ THIẾU: Backend workflow engine                                   │
│  Hiện tại: useAutoMode chạy ở frontend,                             │
│  chỉ biết trạng thái order, không điều khiển được luồng.            │
│  Cần: Backend state machine để tự động chạy các bước tiếp theo      │
│  (notify → match → quality → escrow → warranty → review)            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. Luồng Map

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MAP CORE                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ✅ Đã có:                                                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Web: Leaflet + OpenStreetMap                                │   │
│  │  - AvailableWorkersMap: xem thợ gần quanh khách              │   │
│  │  - WorkerMapPopup: click thợ → xem profile nhanh            │   │
│  │  - BookWorkerModal: book thợ từ map                          │   │
│  │  - WorkerLocationTracker: GPS tracking cho thợ               │   │
│  │  - WorkerTracker: theo dõi thợ trên map (order detail)      │   │
│  │  - Worker Map (worker/map): xem đơn gần                      │   │
│  │  - Geo-fence Check-in: GPS validation                        │   │
│  │  - Location Analytics: biểu đồ order theo quận                │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ❌ THIẾU:                                                         │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  1. Real-time worker tracking cho customer                   │   │
│  │     (WorkerTracker chỉ cập nhật khi load, không real-time)   │   │
│  │  2. OSRM route cho worker (từ vị trí → địa chỉ job)         │   │
│  │  3. Worker draw service area (vẽ vùng phục vụ trên map)     │   │
│  │  4. Heatmap động theo real-time order density                │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 6. Luồng Payment

```
┌─────────────────────────────────────────────────────────────────────┐
│                      PAYMENT CORE                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ✅ Đã có:                                                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  - VNPay (IPN + return) + Stripe (webhook)                   │   │
│  │  - Wallet Manager: deposit, withdraw, transfer, escrow       │   │
│  │  - Auto-split: Worker payout + Platform fee + Reward + Treasury│  │
│  │  - Staking: 4 plans (30-365 ngày, 3-12% APR)                │   │
│  │  - VFC Points: loyalty tiers (4 tiers)                       │   │
│  │  - Multi-ledger: double-entry bookkeeping                     │   │
│  │  - Payment Intents table                                     │   │
│  │  - Gateway abstraction (mock, momo, stripe, vnpay, zalopay)  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ❌ THIẾU:                                                         │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  1. Payment → workflow trigger (payment success → auto step) │   │
│  │  2. Customer refund request UI + flow                        │   │
│  │  3. Partial refund (admin dispute resolution)                │   │
│  │  4. Hóa đơn điện tử (invoice generation)                     │   │
│  │  5. Payout method management cho worker (Stripe Connect)     │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Tổng Quan Kết Nối

```
                    ┌──────────────────────────┐
                    │       KHÁCH HÀNG         │
                    │                          │
                    │  Chat → Diagnose →       │
                    │  Book → Pay → Track      │
                    └──────────┬───────────────┘
                               │
          ╔════════════════════╪══════════════════════╗
          ║    GAP: Luồng event giữa các bước        ║
          ║    • Payment success → không trigger step ║
          ║    • Worker check-in → SMS không gửi     ║
          ║    • Hoàn thành → review không popup     ║
          ╚════════════════════╪══════════════════════╝
                               │
                    ┌──────────▼───────────────┐
                    │         THỢ              │
                    │                          │
                    │  Nhận → GPS → Check-in → │
                    │  Làm → Hoàn thành        │
                    └──────────┬───────────────┘
                               │
          ╔════════════════════╪══════════════════════╗
          ║    GAP: Thiếu AI quality check +         ║
          ║    auto escrow release                   ║
          ╚════════════════════╪══════════════════════╝
                               │
                    ┌──────────▼───────────────┐
                    │         ADMIN            │
                    │                          │
                    │  KYC → Locks → Disputes  │
                    │  → Analytics → Settings  │
                    └──────────┬───────────────┘
                               │
          ╔════════════════════╪══════════════════════╗
          ║    GAP: Thiếu AI anomaly detection +     ║
          ║    auto workforce optimization           ║
          ╚════════════════════╪══════════════════════╝
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
    ┌─────▼─────┐      ┌──────▼──────┐      ┌──────▼──────┐
    │  AI CORE  │      │  MAP CORE   │      │ PAYMENT CORE│
    │           │      │             │      │             │
    │ 43 funcs  │      │ Leaflet +   │      │ VNPay +     │
    │ NVIDIA NIM│      │ OSRM +      │      │ Stripe +    │
    │ 4 tiers   │      │ Geo-fence   │      │ Wallet +    │
    │           │      │             │      │ Ledger      │
    └─────┬─────┘      └──────┬──────┘      └──────┬──────┘
          │                    │                    │
          └────────────────────┼────────────────────┘
                               │
          ╔════════════════════╪══════════════════════╗
          ║  GAP CRITICAL: Không có                  ║
          ║  Event-Driven Workflow Engine            ║
          ║  để kết nối 3 core + 3 persona           ║
          ╚════════════════════╪══════════════════════╝
                               │
                    ┌──────────▼───────────────┐
                    │     INFRASTRUCTURE       │
                    │                          │
                    │ Supabase (DB + Auth +    │
                    │ Realtime) · Vercel ·     │
                    │ Expo (chưa code)         │
                    └──────────────────────────┘
```

## Kết Luận Tổng Quan

| Khía Cạnh | Đánh Giá | Gap Chính |
|-----------|----------|-----------|
| **Building Blocks** | 🟢 Đầy đủ | 43 Edge Functions, 61 routes, 16 migrations |
| **UX Flow** | 🟡 Thiếu glue | Các bước không tự động nối tiếp nhau |
| **Notifications** | 🔴 Thiếu | Chỉ có SMS OTP, không có notification cho order events |
| **Real-time** | 🟡 Partial | Worker tracker load, không real-time stream |
| **Payment Flow** | 🟡 Thiếu edge cases | Không refund/dispute tự động |
| **AI Proactive** | 🔴 Chưa có | AI chỉ phản ứng, không chủ động |
| **Admin Intelligence** | 🟡 Thiếu AI | Không anomaly detection, không forecast |
| **Mobile** | 🔴 Chưa có | 0 code mobile |
| **Workflow Engine** | 🔴 **CRITICAL** | Không có backend state machine |
