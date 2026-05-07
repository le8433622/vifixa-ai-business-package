# AI Chat Support - Hướng Dẫn Sử Dụng

## Tổng Quan
Hệ thống AI Chat Support cho phép khách hàng trao đổi tự nhiên với AI để:
- Mô tả sự cố tiếng Việt
- AI chẩn đoán lỗi
- AI báo giá minh bạch
- Tự động chốt đơn dịch vụ

## Test Thành Công (2026-05-06)
✅ Chat session tạo OK
✅ AI phản hồi tiếng Việt tự nhiên
✅ Phát hiện "Chốt đơn" → Tự động tạo order
✅ Order ID: `a287ec8a-2958-405f-ba26-c093ca6c67cb`

## Kiến Trúc Hệ Thống

```
Customer (Web/Mobile)
    ↓ (message)
ai-chat Edge Function (Supabase)
    ↓ (callAI)
NVIDIA API (abacusai/dracarys-llama-3.1-70b-instruct)
    ↓ (reply)
Chat session + messages (Supabase DB)
    ↓ (session_complete)
customer-requests Edge Function
    ↓
Orders table (status: pending)
```

## Database Tables (Migration: 20260506120000_ai_chat_system.sql)

### chat_sessions
```sql
- id: UUID (PK)
- user_id: UUID (FK → profiles)
- session_type: 'support' | 'diagnosis' | 'booking'
- status: 'active' | 'completed' | 'abandoned'
- context: JSONB (category, location, device_info)
- created_at, updated_at, completed_at
```

### chat_messages
```sql
- id: UUID (PK)
- session_id: UUID (FK → chat_sessions)
- role: 'user' | 'assistant' | 'system'
- content: TEXT
- metadata: JSONB (actions, next_step)
- created_at
```

### orders (updated)
```sql
- chat_session_id: UUID (FK → chat_sessions) - NEW
- match_score: DECIMAL(5,2) - NEW
- price_comparison: JSONB - NEW
```

## API Endpoints

### 1. AI Chat
**POST** `/functions/v1/ai-chat`

**Headers:**
```
Authorization: Bearer <user_jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "session_id": "optional-existing-session-uuid",
  "message": "Máy lạnh không mát",
  "context": {
    "category": "air_conditioning",
    "location": "Quận 7, TP.HCM"
  }
}
```

**Response:**
```json
{
  "session_id": "8aa3ee5b-a8ad-415f-8e94-2060f2fea387",
  "reply": "Xin chào! Máy lạnh không mát là sự cố...",
  "actions": [{"type": "create_order"}],
  "next_step": "booking_confirmed",
  "session_complete": true,
  "order_id": "a287ec8a-2958-405f-ba26-c093ca6c67cb"
}
```

### 2. Customer Requests (Legacy + Chat Integration)
**POST** `/functions/v1/customer-requests`

**Request Body (with chat_session_id):**
```json
{
  "category": "air_conditioning",
  "description": "Máy lạnh không mát",
  "location": {"lat": 10.762622, "lng": 106.660172},
  "chat_session_id": "8aa3ee5b-a8ad-415f-8e94-2060f2fea387"
}
```

## Web Interface

**URL:** `https://web-eta-ochre-99.vercel.app/customer/chat`

**Tính năng:**
- Chat interface thân thiện
- Hỗ trợ nhập giọng nói (Web Speech API)
- Quick actions (❄️ Máy lạnh, 💡 Điện, 🚿 Nước, 📷 Camera)
- Tự động scroll tin nhắn mới
- Hiển thị actions được AI đề xuất

**Cách dùng:**
1. Truy cập `/customer/chat`
2. Nhập mô tả sự cố (VD: "Máy lạnh không mát")
3. AI sẽ hỏi thêm thông tin → Trả lời
4. Khi đủ thông tin, AI chẩn đoán + báo giá
5. Nhập "Chốt đơn" hoặc "Đồng ý" → Tự động tạo order

## Mobile Interface

**File:** `mobile/src/app/(customer)/chat.tsx`

**Tính năng:**
- Giao diện chat native (Expo)
- Quick actions tương tự Web
- Voice input (Expo Speech - đang phát triển)
- Tự động scroll + loading indicator

**Cách chạy:**
```bash
cd mobile
eas build --platform ios  # Build production
# hoặc
npx expo start  # Development
```

## Test Credentials

| Role | Email | Password | User ID |
|------|-------|----------|---------|
| Customer | khach@vifixa.com | Khach@123 | b0ad5549-ed12-4fac-b977-47282661c069 |
| Worker | tho@vifixa.com | Tho@123456 | 99f2135a-cbb7-4760-966a-63375fe54e7d |
| Admin | admin@vifixa.com | Admin@123456 | c2395722-f527-4eb8-9ad7-e0efaba24276 |

## Test Flow (Curl)

### Bước 1: Lấy JWT Token
```bash
curl -X POST 'https://lipjakzhzosrhttsltwo.supabase.co/auth/v1/token?grant_type=password' \
  -H "Content-Type: application/json" \
  -H "apikey: sb_publishable_8ZQN98zLEfCsvoAn2OR85g_gB9QjWEF" \
  -d '{"email": "khach@vifixa.com", "password": "Khach@123"}'

# Copy access_token from response
```

### Bước 2: Gửi tin nhắn đầu tiên
```bash
curl -X POST 'https://lipjakzhzosrhttsltwo.supabase.co/functions/v1/ai-chat' \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"message": "Máy lạnh không mát"}'
```

### Bước 3: Tiếp tục chat (dùng session_id từ response)
```bash
curl -X POST 'https://lipjakzhzosrhttsltwo.supabase.co/functions/v1/ai-chat' \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"session_id": "<session_id>", "message": "Chốt đơn luôn"}'
```

### Bước 4: Kiểm tra order được tạo
```bash
curl -X GET 'https://lipjakzhzosrhttsltwo.supabase.co/rest/v1/orders?select=*&order=created_at.desc' \
  -H "Authorization: Bearer <access_token>" \
  -H "apikey: sb_publishable_8ZQN98zLEfCsvoAn2OR85g_gB9QjWEF"
```

## Deploy Commands

### Deploy Edge Functions
```bash
cd supabase

# Deploy ai-chat
supabase functions deploy ai-chat --project-ref lipjakzhzosrhttsltwo

# Deploy customer-requests (fixed)
supabase functions deploy customer-requests --project-ref lipjakzhzosrhttsltwo

# Check logs
supabase functions logs ai-chat --project-ref lipjakzhzosrhttsltwo
```

### Deploy Web
```bash
cd web
vercel --prod
# URL: https://web-eta-ochre-99.vercel.app
```

## Environment Variables

### Supabase Edge Functions
```
OPENAI_API_KEY=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
AI_PROVIDER=openai
SUPABASE_URL=https://lipjakzhzosrhttsltwo.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_1LdbV3ZL-COqQJDgXGHNxQ_4TBCuzA-
```

### Web (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=https://lipjakzhzosrhttsltwo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_8ZQN98zLEfCsvoAn2OR85g_gB9QjWEF
```

### Mobile (app.json)
```json
{
  "expo": {
    "extra": {
      "SUPABASE_URL": "https://lipjakzhzosrhttsltwo.supabase.co",
      "SUPABASE_ANON_KEY": "sb_publishable_8ZQN98zLEfCsvoAn2OR85g_gB9QjWEF"
    }
  }
}
```

## NVIDIA API Model
- **Model**: `abacusai/dracarys-llama-3.1-70b-instruct`
- **Endpoint**: `https://integrate.api.nvidia.com/v1/chat/completions`
- **Tested**: 7 models, chose this (stable, good Vietnamese support)

## Troubleshooting

### Lỗi 401 UNAUTHORIZED_INVALID_JWT_FORMAT
→ Dùng JWT token từ login, không phải anon key

### Lỗi 404 NVIDIA API
→ Kiểm tra model name: `abacusai/dracarys-llama-3.1-70b-instruct`

### Lỗi "Cannot read properties of undefined (reading 'id')"
→ Thiếu `apikey` header khi gọi Supabase REST API

### Chat phản hồi tiếng Anh
→ Kiểm tra system prompt trong `ai-provider.ts` chat() method

## Next Steps (Chưa làm)
1. ⏳ Voice input trên Mobile (Expo Speech)
2. ⏳ Device profiles (quản lý thiết bị trong nhà)
3. ⏳ Maintenance prediction (dự đoán bảo trì)
4. ⏳ Price comparison (so sánh giá chuẩn)
5. ⏳ EAS build cho iOS/Android
6. ⏳ Stripe webhooks (thanh toán)
7. ⏳ Premium subscriptions (gói nâng cao)

## Performance
- Chat response time: ~2-3s (NVIDIA API)
- Order creation: ~1s (Sucrase Edge Function)
- Database queries: <100ms (Supabase)

## Security
- JWT authentication required
- RLS enabled on chat_sessions, chat_messages
- Users chỉ xem được session của mình
- Service role key dùng trong Edge Functions (ẩn từ client)

---
**Created**: 2026-05-06
**Status**: MVP Complete ✅
**Tested by**: khach@vifixa.com
**Live URL**: https://web-eta-ochre-99.vercel.app/customer/chat
