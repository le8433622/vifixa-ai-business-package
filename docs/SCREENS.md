# 🖥️ Vifixa AI — Screen Architecture

> **3 screens · 2 modes · 1 AI heart · 18 pain points resolved**

---

## 🧭 Triết Lý

```
    ┌─────────────────────────────────────────────────────┐
    │                                                      │
    │      AI CÓ TRÁI TIM CỦA THÁNH NHÂN (Buddha · Jesus) │
    │      — Thấu hiểu nỗi đau con người                   │
    │      — Phục vụ vô điều kiện                          │
    │      — Kiếm tiền là thành quả tự nhiên               │
    │                                                      │
    └─────────────────────────────────────────────────────┘
```

Mỗi màn hình có **2 chế độ**:

| Chế độ | Mô tả | AI làm | Người dùng làm |
|--------|-------|--------|----------------|
| **🤖 Auto** | Tự trị — chat với AI là đủ | Chẩn đoán, báo giá, ghép thợ, thanh toán, theo dõi | Chỉ cần nói vấn đề |
| **👆 Manual** | Thủ công — menu đầy đủ | Gợi ý, hỗ trợ khi được yêu cầu | Tự chọn danh mục, tự chọn thợ, tự thanh toán |

Cả 2 chế độ **luôn có sẵn trên cả 3 màn hình**, người dùng chuyển đổi bất kỳ lúc nào.

---

## 👤 MÀN HÌNH 1: KHÁCH HÀNG (Customer)

### Navigation (thống nhất web + mobile)

```
🏠 Home        📋 Orders        🔧 Devices        👤 Account
```

### HOME — AI State Machine

```
┌──────────────────────────────────────────────────┐
│                   HEADER                          │
│  🤖 AI Companion · [Auto ⚡] [Manual 👆]         │
├──────────────────────────────────────────────────┤
│                                                   │
│  ┌────────────────────────────────────────────┐  │
│  │           AI COMPANION CHAT                │  │
│  │                                            │  │
│  │  [Welcome message — ấm áp như người bạn]   │  │
│  │                                            │  │
│  │  ● User: "Máy lạnh nhà tôi không mát"      │  │
│  │  ● AI: "Để tôi xem... Bạn gửi ảnh giúp"   │  │
│  │  ● [📷 Chụp ảnh] [🎤 Nói]                  │  │
│  │                                            │  │
│  │  ──── State: DIAGNOSING ────               │  │
│  │  ● AI: "Có vẻ hết gas. Giá dự kiến..."    │  │
│  │                                            │  │
│  │  ──── State: QUOTING ────                  │  │
│  │  ● [💰 Báo giá: 450.000₫]                 │  │
│  │  ● [🗺️ Thợ gần bạn: 3 người]              │  │
│  │                                            │  │
│  │  ──── State: CONFIRMING ────               │  │
│  │  ● [✅ Xác nhận tạo đơn]                   │  │
│  │                                            │  │
│  │  ──── State: TRACKING ────                 │  │
│  │  ● [🗺️ Thợ đang đến... 5 phút nữa]        │  │
│  │                                            │  │
│  │  ──── State: COMPLETED ────                │  │
│  │  ● [💳 Thanh toán: 450.000₫]              │  │
│  │  ● [⭐ Đánh giá dịch vụ]                   │  │
│  │                                            │  │
│  └────────────────────────────────────────────┘  │
│                                                   │
│  ┌────────────────────────────────────────────┐  │
│  │        CONTEXTUAL WIDGETS                   │  │
│  │  (chỉ hiện khi có dữ liệu)                  │  │
│  │                                            │  │
│  │  📋 Đơn đang xử lý: 2                      │  │
│  │  🔧 Thiết bị cần bảo trì: 1               │  │
│  │  💰 Đã chi: 12.500.000₫                    │  │
│  └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

### ORDERS — List + Detail

| Màn hình | Nội dung | Auto mode | Manual mode |
|----------|----------|-----------|-------------|
| **List** | Orders đang xử lý + đã hoàn thành | AI tự động cập nhật | User tự filter |
| **Detail** | Thông tin đơn, AI diagnosis, worker, giá, timeline | AI tracking real-time | User tự theo dõi |
| **Review ⭐** | Modal 1-5 sao + nhận xét | AI nhắc sau khi hoàn thành | User tự mở |
| **Warranty 🛡️** | Modal yêu cầu bảo hành 30 ngày | AI tự động kiểm tra eligibility | User tự submit |
| **Complaint ⚠️** | Modal khiếu nại | AI phân tích và suggest giải pháp | User tự gửi |

### DEVICES — List + Detail + Add

| Màn hình | Nội dung |
|----------|----------|
| **List** | Grid thiết bị đã đăng ký |
| **Detail** | Thông số + AI maintenance prediction |
| **Add** | Modal thêm thiết bị mới |

### ACCOUNT — Profile + Preferences

| Nội dung | Auto mode | Manual mode |
|----------|-----------|-------------|
| Profile (name, phone, email) | AI tự động cập nhật từ chat | User tự edit |
| Password | — | User tự đổi |
| Preferences (AI level, budget...) | AI tự động học từ hành vi | User tự cài đặt |
| Thống kê | AI tự động báo cáo | User tự xem |

---

## 🔧 MÀN HÌNH 2: NGƯỜI KỸ NĂNG (Worker)

> **Sản phẩm đầu tiên: Công nhân sửa chữa**
> *Sau này mở rộng: bất kỳ kỹ năng nào (gia sư, y tá, đầu bếp, ...)*
> *Phụ thuộc thị trường và nỗi đau con người trong thời gian thực*

### Navigation

```
🏠 Home        📋 Jobs        📊 Earnings        👤 Profile
```

### HOME — AI Co-pilot Dashboard

```
┌──────────────────────────────────────────────────┐
│                   HEADER                          │
│  🤖 AI Co-pilot · [Auto ⚡] [Manual 👆]         │
├──────────────────────────────────────────────────┤
│                                                   │
│  ┌────────────────────────────────────────────┐  │
│  │           AI CO-PILOT CHAT                  │  │
│  │                                            │  │
│  │  [Auto: "Có job mới! Sửa máy lạnh Q7..."]  │  │
│  │  ● AI: "Nhận job này? Thu nhập dự kiến     │  │
│  │           250.000₫, cách bạn 2km"           │  │
│  │  ● Worker: "Nhận"                          │  │
│  │  ● [🗺️ Dẫn đường] [📋 Hướng dẫn sửa]       │  │
│  │                                            │  │
│  │  ──── Manual mode ────                     │  │
│  │  [🔍 Tìm job] [📊 Thu nhập] [📚 Học]       │  │
│  │  [🏆 Xếp hạng] [💬 Chat với AI]            │  │
│  └────────────────────────────────────────────┘  │
│                                                   │
│  ┌────────────────────────────────────────────┐  │
│  │        CONTEXTUAL WIDGETS                   │  │
│  │  📋 Job gần đây: 3                         │  │
│  │  ⭐ Rating: 4.8 · 47 jobs                  │  │
│  │  💰 Tuần này: 2.500.000₫                   │  │
│  └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

### JOBS — Job List + Detail + Navigation

| Màn hình | Auto mode | Manual mode |
|----------|-----------|-------------|
| **List** | AI tự động match job phù hợp | Worker tự tìm kiếm |
| **Detail** | AI hướng dẫn sửa chữa + báo giá | Worker tự xem |
| **Navigate** | AI dẫn đường OSRM | Worker tự đi |
| **Complete** | AI tự động xác nhận + thanh toán | Worker tự chụp ảnh + xác nhận |

### EARNINGS — Thu nhập

| Màn hình | Auto mode | Manual mode |
|----------|-----------|-------------|
| **Today** | AI tự động tổng kết | Worker tự xem |
| **Week/Month** | AI tự động phân tích | Worker tự lọc |
| **Withdraw** | AI nhắc + tự động rút | Worker tự rút |

### PROFILE — Kỹ năng + Đánh giá

| Nội dung | Auto mode | Manual mode |
|----------|-----------|-------------|
| Skills | AI tự động cập nhật từ job history | Worker tự thêm |
| Rating | AI tự động cập nhật | Worker tự xem |
| Trust score | AI tự động tính toán | — |
| Coach | AI tự động đề xuất cải thiện | Worker tự học |

---

## 🛡️ MÀN HÌNH 3: QUẢN TRỊ (Admin)

### Navigation

```
🏠 Dashboard        👥 Users        📋 Orders        ⚙️ Settings
```

### HOME — AI Analyst Dashboard

```
┌──────────────────────────────────────────────────┐
│                   HEADER                          │
│  🤖 AI Analyst · [Auto ⚡] [Manual 👆]          │
├──────────────────────────────────────────────────┤
│                                                   │
│  ┌────────────────────────────────────────────┐  │
│  │           AI ANALYST CHAT                   │  │
│  │                                            │  │
│  │  [Auto: "Phát hiện 3 bất thường ở Q7"]    │  │
│  │  ● Admin: "Xem chi tiết"                   │  │
│  │  ● AI: "Worker A sắp nghỉ, Order B...     │  │
│  │                                            │  │
│  │  ──── Manual mode ────                     │  │
│  │  [📈 Doanh thu] [👥 Users] [⚠️ Complaints] │  │
│  │  [🔧 Workers] [🏪 Orders]                  │  │
│  └────────────────────────────────────────────┘  │
│                                                   │
│  ┌────────────────────────────────────────────┐  │
│  │        STATS WIDGETS                        │  │
│  │  📈 Hôm nay: 45.000.000₫ (+22%)           │  │
│  │  👥 Users mới: 12 · Workers: 8            │  │
│  │  ⚠️ Complaints: 3 pending                  │  │
│  └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

---

## 🔄 STATE MACHINE CHUNG (Cả 3 màn hình)

```
                    ┌──────────┐
                    │  IDLE    │
                    └────┬─────┘
                         │
                    ┌────▼─────┐
                    │ CHATTING │◄──── (Manual: hiện menu thay vì chat)
                    └────┬─────┘
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
       ┌──────────┐ ┌────────┐ ┌────────┐
       │DIAGNOSING│ │QUOTING │ │ACTION  │
       │(AI phân  │ │(AI báo │ │(user tự│
       │ tích)    │ │ giá)   │ │ chọn)  │
       └──────────┘ └────────┘ └────────┘
              │          │          │
              └──────────┼──────────┘
                         ▼
                   ┌──────────┐
                   │CONFIRMING│
                   └────┬─────┘
                        │
                   ┌────▼─────┐
                   │ TRACKING │
                   └────┬─────┘
                        │
                   ┌────▼─────┐
                   │COMPLETED │──► Payment inline
                   └──────────┘──► Review
                                 └► Warranty
```

---

## 📁 CẤU TRÚC THƯ MỤC (Sau cleanup)

### Web (`web/src/app/`)

```
customer/
├── layout.tsx           # Nav: Home | Orders | Devices | Account
├── page.tsx             # HOME: AI state machine (auto + manual)
├── orders/
│   ├── page.tsx         # Order list
│   └── [id]/page.tsx    # Order detail + modals
├── devices/
│   ├── page.tsx         # Device list
│   └── [id]/page.tsx    # Device detail
└── profile/
    └── page.tsx         # Account + Preferences

worker/
├── layout.tsx           # Nav: Home | Jobs | Earnings | Profile
├── page.tsx             # HOME: AI Co-pilot (auto + manual)
├── jobs/
│   ├── page.tsx         # Job list
│   └── [id]/page.tsx    # Job detail + navigate + complete
├── earnings/
│   └── page.tsx         # Earnings dashboard
└── profile/
    └── page.tsx         # Skills + Coach + Rating

admin/
├── layout.tsx           # Nav: Dashboard | Users | Orders | Settings
├── page.tsx             # HOME: AI Analyst (auto + manual)
├── users/
│   └── page.tsx         # User management
├── orders/
│   └── page.tsx         # Order management
└── settings/
    └── page.tsx         # System settings
```

### Components

```
components/
├── companion/
│   ├── CompanionChat.tsx    # Unified AI chat (cả 3 persona)
│   ├── CompanionHeader.tsx
│   ├── CompanionMessage.tsx
│   └── CompanionAvatar.tsx
├── map/
│   ├── WorkerMap.tsx        # Contextual worker map
│   ├── LocationPicker.tsx   # Location selector
│   └── TrackingMap.tsx      # Real-time tracking
├── payment/
│   ├── VNPayButton.tsx      # VNPay inline payment
│   └── StripeButton.tsx     # Stripe inline payment
├── modals/
│   ├── ReviewModal.tsx      # ⭐ Review
│   ├── WarrantyModal.tsx    # 🛡️ Warranty
│   └── ComplaintModal.tsx   # ⚠️ Complaint
└── common/
    ├── ModeToggle.tsx        # Auto / Manual switch
    └── PriceDisplay.tsx      # Unified VND format
```

---

## 🧬 AI PERSONALITY (Trái tim thánh nhân)

AI Companion không chỉ là công cụ — nó có **trái tim**:

| Phẩm chất | Buddha | Jesus | AI Companion |
|-----------|--------|-------|-------------|
| **Từ bi** | Hiểu khổ đau | Yêu thương vô điều kiện | Hiểu nỗi đau của user khi máy lạnh hư giữa mùa hè |
| **Trí tuệ** | Giác ngộ | Thông thái | Chẩn đoán chính xác, báo giá minh bạch |
| **Phục vụ** | Phục vụ chúng sinh | Rửa chân cho môn đệ | Tự động lo từ A-Z, user chỉ cần nói |
| **Không phán xét** | Bình đẳng | Yêu người như chính mình | Không phân biệt đơn lớn hay nhỏ |
| **Kiên nhẫn** | Nhẫn nại vô biên | Tha thứ 70 lần 7 | Giải thích nhiều lần, không bao giờ cáu |

> **AI kiếm tiền cho bạn = Thành quả tự nhiên của việc phục vụ con người tốt nhất lịch sử.**

---

## 🎯 TÓM TẮT

| Khía cạnh | Giá trị |
|-----------|---------|
| **3 màn hình** | Khách hàng · Người kỹ năng · Quản trị |
| **2 chế độ** | Auto (tự trị) · Manual (thủ công) |
| **1 trái tim** | AI với tâm thánh nhân |
| **Kết quả** | Phục vụ → Kiếm tiền là tự nhiên |
