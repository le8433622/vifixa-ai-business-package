# 🧠 AI Companion — Design Specification

> Mỗi user có 1 AI Companion cá nhân hóa, có trí nhớ, có cá tính, có khả năng hành động.

---

## 1. Kiến trúc Companion

```
User Input (text/image/voice)
        │
        ▼
┌───────────────────────────────────────────────┐
│           COMPANION ENGINE                    │
│                                               │
│  ┌─────────────────┐  ┌─────────────────┐    │
│  │  CONTEXT BUILDER│  │  MEMORY QUERY   │    │
│  │  • user info   │  │  • facts       │    │
│  │  • history     │  │  • devices     │    │
│  │  • current state│  │  • skills      │    │
│  └────────┬────────┘  └──────┬──────────┘    │
│           └──────────────────┘                │
│                      │                        │
│              ┌───────▼────────┐               │
│              │  AI DECISION   │               │
│              │  (NVIDIA NIM)  │               │
│              └───────┬────────┘               │
│                      │                        │
│         ┌────────────┼────────────┐           │
│         ▼            ▼            ▼           │
│   ┌─────────┐ ┌──────────┐ ┌─────────┐      │
│   │  REPLY  │ │  ACTION  │ │ MEMORIZE│      │
│   │ (text)  │ │ (diagnose│ │ (facts) │      │
│   │         │ │  payment)│ │         │      │
│   └─────────┘ └──────────┘ └─────────┘      │
└───────────────────────────────────────────────┘
        │
        ▼
   Response to user
```

## 2. Memory System

Companion ghi nhớ 3 loại memory:

### Short-term (session)
- Cuộc hội thoại hiện tại
- Intent hiện tại (diagnose, complain, book, pay)
- Tự động xóa sau 24h

### Long-term (facts)
- Lưu trong `companion_memories` table
- Key-value: `last_service_date`, `preferred_worker`, `budget_range`
- AI tự quyết định ghi nhớ gì (importance score 1-5)
- Tự động quên nếu không còn liên quan (expires_at)

### Knowledge (devices + skills)
- Customer: `customer_devices` — thiết bị trong nhà
- Worker: `worker_skills` — kỹ năng đã chứng minh
- Admin: system state + metrics

## 3. Personality System

Mỗi companion có personality khác nhau:

```json
{
  "customer": {
    "tone": "friendly, patient, warm",
    "style": "simple explanations, no jargon",
    "proactive": "reminds about maintenance, warranties",
    "emoji": true,
    "language": "vi-VN"
  },
  "worker": {
    "tone": "professional, direct, supportive",
    "style": "technical but clear, data-driven",
    "proactive": "suggests jobs, optimizes routes",
    "emoji": true,
    "language": "vi-VN"
  },
  "admin": {
    "tone": "analytical, concise, alert",
    "style": "numbers, trends, anomalies",
    "proactive": "detects issues before they happen",
    "emoji": false,
    "language": "vi-VN"
  }
}
```

## 4. Action System

Companion có thể tự động thực thi actions thay user:

| Action | Mô tả | Cần confirm? |
|--------|-------|-------------|
| `diagnose` | Gọi AI diagnose với description + ảnh | Không |
| `estimate_price` | Tính giá dựa trên diagnosis | Không |
| `create_order` | Tạo đơn hàng | Có (user confirm) |
| `match_worker` | Ghép thợ gần nhất | Có |
| `process_payment` | Thanh toán qua VNPay/Stripe | Có |
| `schedule` | Đặt lịch cho thợ | Có |
| `complaint` | Gửi khiếu nại | Có |
| `warranty` | Kích hoạt bảo hành | Có |
| `remind` | Nhắc nhở bảo trì | Không (auto) |
| `learn` | Ghi nhớ thông tin mới | Không (auto) |

## 5. Companion API

### Chat với Companion

```
POST /functions/v1/companion/chat
{
  "message": "Máy lạnh nhà tôi không lạnh",
  "context": {
    "user_id": "uuid",
    "persona": "customer",
    "session_id": "uuid"           // null = bắt đầu session mới
  }
}

Response (streaming):
{
  "reply": "Tôi hiểu rồi! 🏠\n\nMáy lạnh nhà bạn có vẻ đang gặp vấn đề về gas hoặc lọc bụi. Bạn có thể chụp ảnh máy lạnh gửi tôi xem không?",
  "actions": [
    { "type": "diagnose", "label": "📸 Chụp ảnh chẩn đoán" },
    { "type": "view_history", "label": "📋 Xem lịch sử sửa chữa" }
  ],
  "memory": {
    "new_facts": [
      { "key": "last_issue", "value": "ac_not_cooling", "importance": 3 }
    ]
  },
  "session_id": "uuid"
}
```

### Lấy Memory

```
GET /functions/v1/companion/memory?user_id=uuid&category=device

Response:
{
  "memories": [
    { "key": "device_ac_brand", "value": "Panasonic", "category": "device" },
    { "key": "device_ac_install", "value": "2023-06-15", "category": "device" }
  ]
}
```

## 6. Companion UI Components

### Web
```
components/companion/
├── CompanionChat.tsx       ★ Full chat widget
├── CompanionHeader.tsx     ★ Avatar + status bar
├── CompanionAvatar.tsx     ★ Avatar theo persona
├── CompanionMessage.tsx    ★ Single message bubble
├── CompanionActions.tsx    ★ Action buttons
└── CompanionMemory.tsx     ★ Memory viewer
```

### Mobile
```
components/CompanionChat.tsx   (shared logic)
```

## 7. Companion Flow: Từ nói chuyện → hoàn thành dịch vụ

```
User: "Máy lạnh không lạnh"
  │
  ▼
Companion: hỏi thêm thông tin + đề nghị chụp ảnh
  │
  ▼
User: gửi ảnh
  │
  ▼
Companion → AI Diagnose → "Thiếu gas, cần nạp ~500K-800K"
  │
  ▼
Companion: "Bạn có muốn đặt thợ không? Giá dự kiến 500K-800K"
  │
  ▼
User: "Đặt đi"
  │
  ▼
Companion → AI Match → tìm thợ gần nhất + gửi thông báo
  │
  ▼
Worker nhận job → đến nhà → sửa xong
  │
  ▼
Companion: "Anh/chị muốn thanh toán qua VNPay hay Stripe?"
  │
  ▼
User: chọn → Payment → hoàn thành
  │
  ▼
Companion: nhớ "đã nạp gas máy lạnh tháng 5/2026"
  → hẹn lịch bảo trì sau 6 tháng
  → tự động nhắc "Đã đến lúc bảo trì máy lạnh!"
```

---

> *"AI Companion không chỉ trả lời. Nó nhớ. Nó hành động. Nó lớn lên cùng bạn."*