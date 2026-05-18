# Vifixa AI — Auto Mode Design

> Manual mode là xương sống. Auto mode là AI gọi lại chính manual actions.
> File này định nghĩa cách 2 chế độ hoạt động và cách chuyển đổi.

---

## 1. Nguyên Lý

```
MANUAL MODE                          AUTO MODE
────────────                         ─────────
Người dùng bấm nút, đi form          Người dùng nói/nhập, AI tự làm

Flow thủ công:
[UI] → [User Action] → [API/RPC] → [DB Update] → [Notification]

Flow tự động:
[Chat/Voice] → [AI Intent] → [Goal] → [Plan] → [Policy] → [API/RPC] → ...
                                                  ↑
                                          CÙNG API/RPC
                                          với manual
```

**Không có "auto API" riêng.** Auto mode gọi cùng API/RPC của manual mode.

---

## 2. Hai Chế Độ

### Manual Mode
- User bấm nút, điền form, chọn options
- Mỗi thao tác = 1 UI action
- User kiểm soát 100% flow
- Phù hợp: user mới, thao tác phức tạp, xác nhận thanh toán

### Auto Mode
- User nói mục tiêu với AI Companion
- AI tạo goal → plan → execute
- AI tự động các bước an toàn (L0-L2)
- AI xin xác nhận cho bước rủi ro (L3+)
- Phù hợp: user quen, muốn nhanh, việc lặp lại

---

## 3. Autonomy Levels

| Level | Tên | AI được phép | Ví dụ |
|---|---|---|---|
| **L0** | Chỉ tư vấn | Trả lời, gợi ý, không làm gì | "Máy lạnh kêu to? → Có thể do quạt bẩn" |
| **L1** | Chuẩn bị | Điền form, tạo draft, thu thập info | AI điền sẵn form đặt đơn, user bấm gửi |
| **L2** | Tự làm an toàn | Cập nhật profile, lưu memory, nhắc lịch | "Đổi địa chỉ thành 123 Nguyễn Huệ" → AI làm luôn |
| **L3** | Tự làm có xác nhận | Tạo đơn, match thợ, đổi lịch | AI: "Đặt thợ Nguyễn Văn A, 500K, xác nhận?" |
| **L4** | Tự tối ưu | Đề xuất bảo trì, route optimization, anomaly alerts | AI: "Đã 6 tháng, đề xuất bảo trì máy lạnh" |
| **L5** | Auto-pilot | Full auto, chỉ báo cáo kết quả | AI: "Đã đặt thợ, mai 9h đến, tổng 500K" |

**Default levels:**
- Account actions: L2 (có OTP cho phone/password)
- Service requests: L1 (draft), L3 (tạo đơn)
- Payment: L3 (luôn xác nhận)
- Admin operations: L4 (lock/unlock), L3 (refund)
- Memory/context: L2

---

## 4. Mode Toggle

### UX: Nút chuyển chế độ (góc phải trên)

```
┌─────────────────────────────────────────┐
│  Vifixa AI                     [🤖 Auto]│
│                                          │
│  [Chat với AI Companion]                 │
│  ...                                     │
└─────────────────────────────────────────┘
```

Khi bật Auto:
- Tất cả thao tác thủ công vẫn hoạt động
- Companion chat hiển thị ở bottom sheet/panel
- User có thể chat để yêu cầu AI làm thay
- Kết quả hiển thị real-time qua notification + UI update

### State Management
```typescript
// useAutoMode hook
const useAutoMode = () => {
  const [autoMode, setAutoMode] = useState(false)
  const [activeGoal, setActiveGoal] = useState<Goal | null>(null)
  const [approvals, setApprovals] = useState<Approval[]>([])

  // Khi bật auto mode, subscribe Realtime cho goal updates
  useEffect(() => {
    if (!autoMode) return
    const channel = supabase
      .channel('agent-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_steps', filter: `user_id=eq.${userId}` }, handleStepUpdate)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'agent_approvals', filter: `user_id=eq.${userId}` }, handleNewApproval)
      .subscribe()
    return () => { channel.unsubscribe() }
  }, [autoMode])
}
```

---

## 5. Approval Flow

Khi AI cần xác nhận:

```
AI: "Tôi sẽ [hành động]. [Lý do]. Xác nhận?"

User thấy notification + UI popup:
┌──────────────────────────────────┐
│  🤖 AI muốn:                      │
│                                   │
│  Đặt thợ sửa máy lạnh             │
│  Thợ: Nguyễn Văn A (4.8⭐)       │
│  Giá dự kiến: 350.000đ - 700.000đ│
│                                   │
│  [✅ Đồng ý]  [❌ Từ chối]        │
└──────────────────────────────────┘

→ User bấm Đồng ý → AI tiếp tục plan
→ User bấm Từ chối → AI hỏi lý do, điều chỉnh plan
→ 30 phút không trả lời → approval expires
```

### Các loại approval:
| Loại | Hiển thị |
|---|---|
| Payment | "Thanh toán XXXđ qua VNPay?" |
| Order | "Tạo đơn sửa máy lạnh, giá XXXđ?" |
| Profile change | "Đổi số điện thoại thành 09xxxx?" (cần OTP) |
| Account risk | "Xóa tài khoản vĩnh viễn?" |
| Admin action | "Khóa tài khoản user@email.com?" |

---

## 6. Goal & Plan Generation

### User input → Goal

```typescript
// AI Companion nhận text từ user
async function generateGoal(userInput: string, context: UserContext): Goal {
  // 1. Classify intent
  const intent = await aiCore.classifyIntent(userInput)

  // 2. Detect service
  const services = serviceRegistry.detect(userInput)

  // 3. Build goal
  return {
    user_id: context.userId,
    persona: context.persona,
    goal_type: intent.type,         // "repair", "cleaning", "update_profile"
    goal_description: userInput,    // nguyên văn
    service_id: services[0]?.id,
  }
}
```

### Goal → Plan

```typescript
async function generatePlan(goal: Goal, context: UserContext, memories: Memory[]): Plan {
  // AI dùng NVIDIA NIM để tạo plan
  const prompt = buildPlanPrompt(goal, context, memories)
  const response = await aiCore.chat(prompt)

  // Parse plan từ AI response
  // Plan gồm các step, mỗi step chọn 1 action từ Registry
  const plan = parsePlan(response)

  // Validate plan: mọi action phải tồn tại trong Registry
  for (const step of plan.steps) {
    const action = actionRegistry.get(step.action_id)
    if (!action) throw new Error(`Unknown action: ${step.action_id}`)
    if (!action.persona.includes(context.persona)) throw new Error(`Unauthorized action: ${step.action_id}`)
  }

  return plan
}
```

### Ví dụ Plan cho "Máy lạnh không lạnh"

```json
{
  "goal_type": "repair",
  "steps": [
    { "action_id": "service.detect", "status": "completed", "output": { "service_id": "repair", "service_name": "Sửa chữa thiết bị" } },
    { "action_id": "memory.save_fact", "input": { "key": "last_issue", "value": "ac_not_cooling", "importance": 3 } },
    { "action_id": "service.collect_slots", "status": "completed", "output": { "device_type": "Máy lạnh" } },
    { "action_id": "service.diagnose", "status": "completed", "output": { "diagnosis": "Thiếu gas", "confidence": 0.85 } },
    { "action_id": "service.quote", "status": "completed", "output": { "min": 350000, "max": 900000 } },
    { "action_id": "service.create_order", "status": "waiting_approval", "confirm": "Đặt thợ nạp gas máy lạnh, 350K-900K?" },
    { "action_id": "map.track_worker", "status": "pending" },
    { "action_id": "payment.create_intent", "status": "pending", "confirm": "Thanh toán sau khi hoàn thành" }
  ]
}
```

---

## 7. Audit & Monitoring

Mọi auto action phải log vào:

```sql
-- agent_runs: 1 lần AI chạy
-- agent_steps: từng bước trong run
-- agent_approvals: xác nhận của user

-- Admin có thể xem:
SELECT
  ar.id as run_id,
  ar.persona,
  ar.status as run_status,
  as2.step_index,
  as2.action_id,
  as2.status as step_status,
  as2.action_input,
  as2.action_output,
  as2.error_message,
  aa.status as approval_status
FROM agent_runs ar
JOIN agent_steps as2 ON as2.run_id = ar.id
LEFT JOIN agent_approvals aa ON aa.step_id = as2.id
WHERE ar.user_id = $1
ORDER BY ar.started_at DESC;
```

---

## 8. Safety Limits

| Limit | Giá trị |
|---|---|
| Max concurrent goals/user | 3 |
| Max agent runs/user/minute | 5 |
| Max auto-spend/user/ngày | 10,000,000đ |
| Approval timeout | 30 phút |
| Max plan steps | 20 |
| Auto-mode requires verified account | Yes |
| Auto-mode requires 2FA for financial actions | Recommended |

---

## 9. Transition Strategy

```
Phase 1: Manual flows hoàn hảo
  → Tất cả action có API chuẩn
  → Tất cả action có schema input/output

Phase 2: Action Registry đầy đủ
  → Mọi thao tác thành 1 action
  → Policy engine hoạt động

Phase 3: Auto mode L0-L2
  → Account actions tự động
  → Memory tự động
  → Draft tự động

Phase 4: Auto mode L3
  → Service order tự động có xác nhận
  → Payment tự động có xác nhận

Phase 5: Auto mode L4-L5
  → Admin auto-pilot
  → Customer proactive suggestions
  → Worker job optimization
```

---

## 10. Example Scenarios

### Khách: "Đổi địa chỉ"
```
AI: detect intent → account.update_address
  → Address missing → hỏi: "Địa chỉ mới là gì?"
  → User: "123 Nguyễn Huệ, Quận 1"
  → AI: geocode → account.update_address({ address: "...", lat: ..., lng: ... })
  → AI: "Đã cập nhật địa chỉ mới: 123 Nguyễn Huệ, Quận 1"
  → memory.save_fact({ key: "home_address", value: "123 Nguyễn Huệ, Quận 1" })
```

### Khách: "Đổi số điện thoại thành 0987654321"
```
AI: detect intent → account.update_phone
  → Risk: medium, cần OTP
  → AI: gửi OTP đến 0987654321
  → User: "OTP là 123456"
  → AI: account.verify_otp → account.update_phone
  → AI: "Đã đổi số điện thoại thành 0987654321"
```

### Thợ: "Có đơn nào gần tôi không?"
```
AI: detect intent → map.find_providers (đảo thành find_jobs cho worker)
  → Lấy vị trí hiện tại
  → Query orders gần nhất, phù hợp skill
  → AI: "Có 3 đơn gần bạn:
       1. Sửa máy lạnh - 2.3km - 500K
       2. Sửa ống nước - 3.1km - 300K
       3. Vệ sinh máy lạnh - 4.5km - 250K"
  → User: "Nhận đơn 1"
  → AI: worker.accept_job → "Đã nhận đơn! Lộ trình: ..."
```

### Admin: "Tóm tắt hôm nay"
```
AI: detect intent → admin.daily_brief
  → Query: orders hôm nay, revenue, disputes, new workers, KYC pending
  → AI: "📊 Tóm tắt hôm nay (17/05/2026):
       • 23 đơn mới (+15% vs hôm qua)
       • Doanh thu: 12,450,000đ
       • 2 tranh chấp đang chờ xử lý
       • 5 KYC đang chờ duyệt ⚠️
       • Khu vực Quận 7 thiếu thợ (-3 vs nhu cầu)
       Đề xuất: Duyệt KYC trước, xem 2 tranh chấp"
```