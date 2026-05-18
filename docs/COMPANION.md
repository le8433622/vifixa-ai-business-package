# 🧠 AI Companion — Design Specification

> Mỗi user có 1 AI Companion cá nhân hóa, có trí nhớ, có cá tính, có khả năng hành động.
> **Companion is the Agent OS interface for users.**

---

## 1. Kiến trúc Companion (Updated: Agent OS)

```
User Input (text/image/voice)
        │
        ▼
┌───────────────────────────────────────────────────────────────┐
│           COMPANION ENGINE (= Agent Orchestrator)              │
│                                                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐  │
│  │  CONTEXT BUILDER│  │  MEMORY QUERY   │  │ PERSONALITY  │  │
│  │  • user info   │  │  • facts       │  │ • Tone       │  │
│  │  • history     │  │  • devices     │  │ • Proactivity│  │
│  │  • current state│  │  • skills      │  │ • Language   │  │
│  └────────┬────────┘  └──────┬──────────┘  └──────┬───────┘  │
│           └──────────────────┼────────────────────┘           │
│                      ┌───────▼────────┐                       │
│                      │  AI DECISION   │                       │
│                      │  Goal → Plan   │                       │
│                      │  (NVIDIA NIM)  │                       │
│                      └───────┬────────┘                       │
│                              │                                │
│         ┌────────────────────┼────────────────────┐           │
│         ▼                    ▼                    ▼           │
│   ┌─────────┐         ┌──────────┐         ┌─────────┐      │
│   │  REPLY  │         │  ACTION  │         │ MEMORIZE│      │
│   │ (text)  │         │ (execute │         │ (facts) │      │
│   │         │         │  plan)   │         │         │      │
│   └─────────┘         └────┬─────┘         └─────────┘      │
│                            │                                  │
│                    ┌───────▼────────┐                        │
│                    │ POLICY ENGINE  │                        │
│                    │ auto / confirm │                        │
│                    │ / admin-only   │                        │
│                    └───────┬────────┘                        │
│                            │                                  │
│                    ┌───────▼────────┐                        │
│                    │  WORKFLOW +    │                        │
│                    │  MAP + PAYMENT │                        │
│                    └───────┬────────┘                        │
└────────────────────────────┼─────────────────────────────────┘
                             ▼
                      Response to user
                      + Next action suggestion
```

---

## 2. Memory System

Companion ghi nhớ 3 loại memory:

### Short-term (session)
- Cuộc hội thoại hiện tại
- Goal đang active
- Context: vị trí, thời gian, trạng thái
- Tự động xóa sau 24h

### Long-term (facts)
- Lưu trong `companion_memories` table
- Key-value: `last_service_date`, `preferred_worker`, `budget_range`, `device_ac_brand`, `home_address`
- AI tự quyết định ghi nhớ gì (importance score 1-5)
- Tự động quên nếu không còn liên quan (expires_at)

### Knowledge (devices + skills)
- Customer: `customer_devices` — thiết bị trong nhà
- Worker: `worker_skills` — kỹ năng đã chứng minh
- Admin: system state + metrics

---

## 3. Goal → Plan → Execute

Companion không chỉ trả lời. **Companion tạo Goal và lập Plan.**

```typescript
// Companion flow mới
async function handleCompanionMessage(message: string, context: UserContext) {
  // 1. Hiểu intent + context
  const intent = await classifyIntent(message)
  const service = serviceRegistry.detect(message)
  const memories = await loadMemories(context.userId)

  // 2. Tạo Goal
  const goal = await createGoal({
    userId: context.userId,
    persona: context.persona,
    goalType: intent.type,
    goalDescription: message,
    serviceId: service[0]?.id,
  })

  // 3. Tạo Plan từ Action Registry
  const plan = await generatePlan(goal, context, memories)
  // Plan = các step, mỗi step chọn 1 action từ Registry

  // 4. Bắt đầu thực thi
  const run = await startAgentRun(goal, plan)

  // 5. Reply với thông báo + plan preview
  return {
    reply: buildReply(goal, plan),
    actions: plan.steps.map(s => actionToCard(s)),
    session_id: run.id,
  }
}
```

### Ví dụ Goal + Plan

User nói: "Máy lạnh không lạnh, xử lý giúp tôi"

```json
{
  "goal": {
    "type": "repair_device",
    "description": "Sửa máy lạnh không lạnh",
    "service": "repair"
  },
  "plan": {
    "steps": [
      { "step": 1, "action": "service.detect", "description": "Nhận diện dịch vụ" },
      { "step": 2, "action": "service.collect_slots", "description": "Hỏi thêm thông tin" },
      { "step": 3, "action": "service.diagnose", "description": "Chẩn đoán sự cố" },
      { "step": 4, "action": "service.quote", "description": "Báo giá" },
      { "step": 5, "action": "service.create_order", "description": "Tạo đơn (cần xác nhận)" },
      { "step": 6, "action": "map.track_worker", "description": "Theo dõi thợ" }
    ]
  }
}
```

---

## 4. Personality System

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

---

## 5. Action System (Updated)

Companion có thể tự động thực thi actions thay user, qua Policy Engine:

| Action | Mô tả | Autonomy | Cần confirm? |
|---|---|---|---|
| `memory.save_fact` | Ghi nhớ thông tin | L2 | Không |
| `service.detect` | Nhận diện dịch vụ | L2 | Không |
| `service.collect_slots` | Hỏi thông tin thiếu | L2 | Không |
| `service.diagnose` | Gọi AI diagnose | L2 | Không |
| `service.quote` | Tính giá dựa trên diagnosis | L1 | Không (draft) |
| `service.create_order` | Tạo đơn hàng | L1 | Có |
| `payment.create_intent` | Tạo thanh toán | L1 | Có |
| `payment.request_refund` | Yêu cầu hoàn tiền | L1 | Có |
| `account.update_address` | Đổi địa chỉ | L2 | Không |
| `account.update_phone` | Đổi số ĐT | L2 | Có (OTP) |
| `worker.accept_job` | Nhận việc | L1 | Có |
| `customer.schedule_maintenance` | Đặt lịch bảo trì | L4 | Không (auto) |
| `admin.daily_brief` | Tóm tắt admin | L4 | Không (auto) |

Danh sách đầy đủ: `docs/ACTION_REGISTRY.md`

---

## 6. Companion API

### Chat với Companion

```
POST /functions/v1/companion/chat
{
  "message": "Máy lạnh nhà tôi không lạnh",
  "context": {
    "user_id": "uuid",
    "persona": "customer",
    "session_id": null
  }
}

Response:
{
  "reply": "Tôi hiểu rồi! Để tôi giúp anh/chị:\n1. Nhận diện thiết bị\n2. Chẩn đoán sự cố\n3. Báo giá\n4. Tìm thợ\n\nCho tôi hỏi thêm: Máy lạnh loại gì ạ?",
  "goal": { "id": "uuid", "type": "repair_device", ... },
  "plan": { "steps": [...] },
  "actions": [
    { "type": "diagnose", "label": "🔍 Chẩn đoán" },
    { "type": "quote", "label": "💰 Báo giá" }
  ]
}
```

### Tạo Goal

```
POST /functions/v1/companion/create-goal
{
  "user_id": "uuid",
  "persona": "customer",
  "message": "Dọn nhà 50m², cuối tuần này"
}

Response:
{
  "goal_id": "uuid",
  "plan": {
    "steps": [
      { "action_id": "service.detect", "status": "completed", "output": { "service_id": "cleaning" } },
      { "action_id": "service.collect_slots", "status": "pending" },
      { "action_id": "service.quote", "status": "pending" },
      { "action_id": "service.create_order", "status": "pending", "confirm_required": true }
    ]
  }
}
```

---

## 7. Companion UI

```
components/companion/
├── CompanionChat.tsx        ★ Full chat widget (3 persona variants)
├── CompanionGoal.tsx         ★ Goal + Plan display
├── CompanionApproval.tsx     ★ Approval request dialog
├── CompanionHeader.tsx       ★ Avatar + status bar
├── CompanionMessage.tsx      ★ Single message bubble
├── CompanionActions.tsx      ★ Action buttons
└── CompanionMemory.tsx       ★ Memory viewer (user)
```

---

## 8. Companion Flow: Từ nói chuyện → hoàn thành dịch vụ

```
User: "Máy lạnh không lạnh, xử lý giúp tôi"
  │
  ▼
Companion: nhận diện service "repair" + tạo goal "repair_device"
  │
  ▼
Companion: "Máy lạnh loại gì? Dùng bao lâu? Có thể chụp ảnh không?"
  │
  ▼
User: gửi ảnh + "Panasonic, mua 2023"
  │
  ▼
Companion → AI Diagnose → "Thiếu gas R32, cần nạp ~500K-900K"
  │
  ▼
Companion: "Tôi tìm được 3 thợ gần nhất. Giá dự kiến 500K-900K. Đặt thợ?"
  │
  ▼
User: "Ok đặt đi"
  │
  ▼
Companion → service.create_order → workflow engine → match worker
  │
  ▼
Worker nhận job → đến nhà → sửa xong → chụp ảnh → complete
  │
  ▼
Companion: "Hoàn thành! Tổng: 650.000đ. Thanh toán qua VNPay?"
  │
  ▼
User: thanh toán → Done
  │
  ▼
Companion: nhớ "đã nạp gas máy lạnh Panasonic tháng 5/2026"
  → hẹn lịch bảo trì sau 6 tháng
  → tự động nhắc "Đã đến lúc bảo trì máy lạnh!"
  → gợi ý vệ sinh máy lạnh định kỳ
```

---

> *"AI Companion không chỉ trả lời. Nó hiểu. Nó lập kế hoạch. Nó hành động. Nó nhớ. Nó lớn lên cùng bạn."*