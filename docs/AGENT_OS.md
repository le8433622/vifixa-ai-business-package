# Vifixa Agent Operating System

> Mọi AI agent làm việc trên Vifixa phải hiểu file này trước khi code.
> Đây là thiết kế runtime cho Agent OS — cách AI tự trị vận hành hệ thống.

---

## 1. Core Concept

```
Vifixa không phải app gọi thợ.
Vifixa là Agent Operating System cho dịch vụ đời sống.

Manual flow là UI cho người.
Auto mode là AI dùng chính manual actions đó với memory + policy + audit.
```

---

## 2. Agent Runtime Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     AI COMPANION ORCHESTRATOR                     │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ PERCEPTION   │  │ MEMORY       │  │ PERSONALITY          │   │
│  │ • Intent     │  │ • Episodic   │  │ • Tone (per persona) │   │
│  │ • Service    │  │ • Semantic   │  │ • Proactivity level  │   │
│  │ • Context    │  │ • Procedural │  │ • Language (vi-VN)   │   │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘   │
│         └─────────────────┼─────────────────────┘                │
│                           ▼                                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    GOAL PLANNER                            │   │
│  │  • Nhận intent + context + memory                         │   │
│  │  • Tạo goal: "khach muon sua may lanh"                    │   │
│  │  • Tạo plan: [detect_service, ask_info, diagnose, ...]    │   │
│  │  • Chọn action từ Action Registry                         │   │
│  └────────────────────────┬─────────────────────────────────┘   │
│                           ▼                                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    POLICY ENGINE                           │   │
│  │  • Kiểm tra autonomy_level cho từng action                │   │
│  │  • Nếu L3+ → tạo approval request                         │   │
│  │  • Nếu admin-only → reject + gợi ý                        │   │
│  │  • Nếu L0-L2 → auto execute                               │   │
│  └────────────────────────┬─────────────────────────────────┘   │
│                           ▼                                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    ACTION EXECUTOR                         │   │
│  │  • Gọi Edge Function / Supabase RPC                       │   │
│  │  • Log: agent_runs + agent_steps                          │   │
│  │  • Retry + error handling                                 │   │
│  └────────────────────────┬─────────────────────────────────┘   │
│                           ▼                                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    OBSERVER                                │   │
│  │  • Cập nhật workflow state                                │   │
│  │  • Gửi notification (push/SMS/in-app)                     │   │
│  │  • Lưu memory mới                                         │   │
│  │  • Đề xuất next best action                               │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
         │                │                │
         ▼                ▼                ▼
   ┌──────────┐   ┌──────────┐   ┌──────────────┐
   │ AI CORE  │   │ MAP CORE │   │ PAYMENT CORE │
   └──────────┘   └──────────┘   └──────────────┘
```

---

## 3. Data Model

### `agent_goals`
```sql
CREATE TABLE agent_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  persona TEXT NOT NULL CHECK (persona IN ('customer','worker','admin')),
  goal_type TEXT NOT NULL,            -- "repair_ac", "update_profile", "find_best_jobs"
  goal_description TEXT NOT NULL,     -- mô tả mục tiêu bằng tiếng Việt
  status TEXT DEFAULT 'active' CHECK (status IN ('active','in_progress','completed','failed','cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
```

### `agent_runs`
```sql
CREATE TABLE agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID REFERENCES agent_goals(id),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  persona TEXT NOT NULL,
  plan JSONB NOT NULL,               -- các bước của plan [{step, action_id, input, output, status}]
  current_step INTEGER DEFAULT 0,
  status TEXT DEFAULT 'running' CHECK (status IN ('running','completed','failed','cancelled')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
```

### `agent_steps`
```sql
CREATE TABLE agent_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES agent_runs(id) NOT NULL,
  step_index INTEGER NOT NULL,
  action_id TEXT NOT NULL,
  action_input JSONB,
  action_output JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed','skipped','waiting_approval')),
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);
```

### `agent_actions`
```sql
CREATE TABLE agent_actions (
  id TEXT PRIMARY KEY,               -- "account.update_phone"
  domain TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  input_schema JSONB NOT NULL,
  output_schema JSONB NOT NULL,
  handler TEXT NOT NULL,             -- "functions/v1/agent-orchestrator" hoặc RPC name
  autonomy_level INTEGER DEFAULT 2,
  risk_level TEXT DEFAULT 'safe' CHECK (risk_level IN ('safe','medium','high','critical')),
  confirm_message TEXT,              -- message hiển thị khi cần xác nhận
  persona TEXT[] NOT NULL,           -- ['customer','worker','admin']
  rollback_action TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `agent_policies`
```sql
CREATE TABLE agent_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id TEXT REFERENCES agent_actions(id),
  persona TEXT NOT NULL,
  max_autonomy_level INTEGER DEFAULT 2,
  require_otp BOOLEAN DEFAULT false,
  require_confirmation BOOLEAN DEFAULT false,
  max_amount NUMERIC,                -- giới hạn tiền cho auto
  cooldown_seconds INTEGER DEFAULT 0 -- thời gian chờ giữa các lần auto
);
```

### `agent_approvals`
```sql
CREATE TABLE agent_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID REFERENCES agent_steps(id) NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  action_id TEXT NOT NULL,
  action_summary TEXT NOT NULL,      -- tóm tắt TIẾNG VIỆT cho user hiểu
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','expired')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejected_reason TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 4. Agent Orchestrator Edge Function

```typescript
// POST /functions/v1/agent-orchestrator

// Request
interface OrchestratorRequest {
  user_id: string;
  persona: 'customer' | 'worker' | 'admin';
  message: string;                   // "Máy lạnh không lạnh, xử lý giúp tôi"
  media_urls?: string[];
  session_id?: string;
}

// Internal flow
async function handleRequest(req: OrchestratorRequest) {
  // 1. Load persona context + memory
  const context = await loadContext(req.user_id, req.persona);
  const memories = await loadMemories(req.user_id, req.message);

  // 2. Detect intent + service
  const intent = await detectIntent(req.message, context, memories);
  const service = serviceRegistry.detect(req.message);

  // 3. Create goal
  const goal = await createGoal(req.user_id, req.persona, intent, service);

  // 4. Generate plan from intent using AI
  const plan = await generatePlan(intent, service, context, memories);

  // 5. Start agent run
  const run = await startRun(goal.id, req.user_id, req.persona, plan);

  // 6. Execute steps sequentially
  for (let i = 0; i < plan.steps.length; i++) {
    const step = plan.steps[i];
    const action = getAction(step.action_id);

    // Apply policy
    const policy = getPolicy(action.id, req.persona);
    const autonomy = Math.min(action.autonomy_level, policy.max_autonomy_level);

    if (autonomy >= action.autonomy_level) {
      // Auto execute
      const result = await executeAction(action, step.input);
      await logStep(run.id, i, action.id, step.input, result, 'completed');
    } else {
      // Need approval
      await createApproval(run.id, i, action, step);
      await updateStep(run.id, i, 'waiting_approval');
      break; // Pause until approval
    }
  }

  // 7. Observe + update + suggest
  await observeAndUpdate(run);
  return buildResponse(run);
}
```

---

## 5. Action Execution Contract

Mọi action được gọi qua cùng 1 interface:

```typescript
// Gọi action từ Agent Orchestrator
interface ActionCall {
  action_id: string;
  input: Record<string, unknown>;
  user_id: string;
  persona: string;
  run_id: string;
  step_index: number;
}

interface ActionResult {
  success: boolean;
  output: Record<string, unknown>;
  error?: string;
  next_action_suggestion?: string;
}

// Handler dispatch
async function executeAction(call: ActionCall): Promise<ActionResult> {
  const action = getAction(call.action_id);

  // Map action_id → handler
  // account.*, customer.*, service.* → Edge Function
  // map.*, payment.*, worker.* → Edge Function / RPC
  // admin.* → Edge Function (admin-only)

  const result = await fetch(`${SUPABASE_URL}/functions/v1/agent-orchestrator/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SERVICE_KEY}` },
    body: JSON.stringify(call),
  });

  const data = await result.json();

  // Audit
  await supabase.from('agent_steps').update({
    status: data.success ? 'completed' : 'failed',
    action_output: data,
    completed_at: new Date().toISOString(),
  }).eq('run_id', call.run_id).eq('step_index', call.step_index);

  return data;
}
```

---

## 6. Manual vs Auto Mode Bridge

```
MANUAL MODE                          AUTO MODE
────────────                         ─────────
User bấm nút "Đổi địa chỉ"          User nói "Đổi địa chỉ"
  → Mở form                          → AI detect intent: account.update_address
  → User nhập địa chỉ                → AI hỏi địa chỉ mới (nếu thiếu)
  → Bấm Lưu                          → AI gọi account.update_address
  → Gọi RPC update_address           → Cùng RPC update_address
  → Toast "Đã lưu"                   → AI báo "Đã lưu địa chỉ mới"

CÙNG action: account.update_address
CÙNG schema input/output
CÙNG audit log
KHÁC: giao diện (form vs chat)
```

---

## 7. Policy Matrix

| Action domain | Customer L | Worker L | Admin L | Confirm? |
|---|---|---|---|---|
| account.read | 2 | 2 | 2 | No |
| account.update_profile | 2 | 2 | 2 | No |
| account.update_phone | 2 | 2 | 2 | OTP |
| account.update_password | 2 | 2 | 2 | OTP |
| memory.* | 2 | 2 | 2 | No |
| customer.add_device | 2 | — | — | No |
| customer.create_goal | 2 | — | — | No |
| service.diagnose | 2 | — | 4 | No |
| service.quote | 1 | — | 4 | No |
| service.create_order | 1 | — | — | Yes |
| map.find_providers | 2 | 2 | 4 | No |
| payment.create_intent | 1 | — | — | Yes |
| payment.request_refund | 1 | 0 | 3 | Yes |
| worker.accept_job | — | 1 | — | Yes |
| worker.complete_job | — | 2 | — | No |
| worker.request_payout | — | 1 | — | Yes |
| admin.review_kyc | — | — | 4 | Low-risk only |
| admin.lock_user | — | — | 3 | Yes |
| admin.refund_approve | — | — | 3 | Yes |

---

## 8. Safety Guardrails

| Guardrail | Mô tả |
|---|---|
| **Rate limit** | Max 20 agent runs/user/min |
| **Budget limit** | Không auto-spend > 10M VND/ngày/user |
| **Concurrency limit** | Max 3 concurrent goals/user |
| **Approval timeout** | Approval expires sau 30 phút |
| **Rollback support** | Mọi financial action có rollback |
| **Prompt injection guard** | Sanitize user input trước khi vào AI |
| **PII redaction** | Log không chứa phone/email/CMND |
| **Idempotency** | Mọi action có idempotency key từ agent_run |

---

## 9. Integration Points

```
Agent Orchestrator
  ├──→ companion/chat (AI decision)
  ├──→ Action Registry (chọn action)
  ├──→ Policy Engine (kiểm tra quyền)
  ├──→ payment-process (thanh toán)
  ├──→ wallet-manager (ví)
  ├──→ workflow-engine (cập nhật trạng thái)
  ├──→ notify (thông báo)
  ├──→ ai-core.ts (NVIDIA NIM)
  ├──→ companion/memory (ghi nhớ)
  └──→ Supabase Realtime (real-time update)
```

---

## 10. Success Metrics

| Metric | Target |
|---|---|
| Goal completion rate | >90% |
| Auto actions without error | >99% |
| Approval response time | <30s |
| User satisfaction with auto mode | >4.5/5 |
| Admin manual actions replaced by AI | >50% |