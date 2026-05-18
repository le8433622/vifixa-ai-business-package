# 🏗️ Vifixa AI — System Architecture

> Event-driven · Agent OS · 3 cores · 3 screens
> Cập nhật: 2026-05-17

---

## 6-Layer Architecture (Updated)

```
┌────────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                           │
│  ┌────────────────────────┐  ┌──────────────────────────┐      │
│  │   Next.js 16 Web       │  │   Expo Mobile SDK 54     │      │
│  │   67 routes            │  │   All screens built      │      │
│  │   Manual + Auto mode   │  │   Manual + Auto mode     │      │
│  └───────────┬────────────┘  └────────────┬─────────────┘      │
│              │                            │                     │
│  ┌───────────▼────────────────────────────▼─────────────┐      │
│  │           SHARED COMPONENTS                          │      │
│  │  CompanionChat  MapView  PaymentModal  ModeToggle    │      │
│  │  ApprovalDialog  GoalCard  TransactionList           │      │
│  └──────────────────────┬──────────────────────────────┘      │
└─────────────────────────┼─────────────────────────────────────┘
                          │
┌─────────────────────────▼─────────────────────────────────────┐
│                    AGENT OS LAYER ★ NEW                        │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │         AI COMPANION ORCHESTRATOR                        │   │
│  │  Perception · Memory · Goal Planner · Plan Executor     │   │
│  └──────────────┬──────────────────────────────────────────┘   │
│                 │                                               │
│  ┌──────────────▼──────────────────────────────────────────┐   │
│  │         ACTION REGISTRY + POLICY ENGINE                   │   │
│  │  agent_actions · agent_policies · agent_approvals        │   │
│  └──────────────┬──────────────────────────────────────────┘   │
│                 │                                               │
│  ┌──────────────▼──────────────────────────────────────────┐   │
│  │         AGENT AUDIT                                       │   │
│  │  agent_goals · agent_runs · agent_steps                  │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────┬─────────────────────────────────────┘
                          │
┌─────────────────────────▼─────────────────────────────────────┐
│                    WORKFLOW LAYER                               │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │           WORKFLOW ENGINE (11-State Machine)             │   │
│  │  created → draft → diagnosed → pending_payment → paid    │   │
│  │  → matching → matched → worker_arrived → in_progress     │   │
│  │  → completed → reviewed → closed                         │   │
│  └────────────────────────┬─────────────────────────────────┘   │
│                           │                                    │
│  ┌────────────────────────▼────────────────────────────────┐   │
│  │      EVENT BUS (Supabase Realtime + DB Webhook)         │   │
│  └────────────────────────┬────────────────────────────────┘   │
│                           │                                    │
│  ┌────────────────────────▼────────────────────────────────┐   │
│  │      NOTIFICATION ENGINE (13 types)                     │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────┬─────────────────────────────────────┘
                          │
┌─────────────────────────▼─────────────────────────────────────┐
│                    3 CORES LAYER                               │
│                                                                 │
│  ┌────────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │   AI CORE      │  │   MAP CORE   │  │  PAYMENT CORE    │   │
│  │                │  │              │  │                  │   │
│  │ companion/chat │  │ Available    │  │ VNPay + Stripe   │   │
│  │ ai-diagnose    │  │ WorkersMap   │  │ Wallet Manager   │   │
│  │ ai-matching    │  │ WorkerTracker│  │ Escrow           │   │
│  │ ai-kyc         │  │ GeoFence     │  │ Multi-Ledger     │   │
│  │ ai-auto-exec   │  │ OSRM Route   │  │ Staking + VFC    │   │
│  │ ai-quality     │  │ Location     │  │ Stripe Connect   │   │
│  │ ai-warranty    │  │ Analytics    │  │ Payment Intents  │   │
│  │ ai-dispute     │  └──────────────┘  └──────────────────┘   │
│  │ ai-fraud-check │                                            │
│  │ ai-predict     │                                            │
│  │ ai-coach       │                                            │
│  │ ai-anomaly     │                                            │
│  │ ai-healthcheck │                                            │
│  │ ai-care-agent  │                                            │
│  └──────┬─────────┘                                            │
│         │                                                      │
│  ┌──────▼──────────────────────────────────────────────────┐   │
│  │  AI CORE ENGINE (ai-core.ts)                            │   │
│  │  • 4 NVIDIA NIM tiers: cheap, balanced, smart, vision   │   │
│  │  • Agent types: 12                                      │   │
│  │  • Reasoning: Chain-of-Thought + ReAct                  │   │
│  │  • Learning: feedback loop + memory consolidation       │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────┬─────────────────────────────────────┘
                          │
┌─────────────────────────▼─────────────────────────────────────┐
│                    DATA LAYER                                   │
│  auth.users · profiles · companion_* · service_definitions     │
│  agent_goals · agent_runs · agent_steps · agent_approvals      │
│  orders · payments · wallets · ledger · escrow · payouts       │
│  workers · notifications · devices · service_areas             │
└─────────────────────────┬─────────────────────────────────────┘
                          │
┌─────────────────────────▼─────────────────────────────────────┐
│                    INFRASTRUCTURE LAYER                         │
│  Supabase Postgres · Auth (RBAC) · Realtime · Storage          │
│  NVIDIA NIM AI · Leaflet OSRM Map · VNPay/Stripe · Twilio     │
│  GitHub Actions CI/CD (3 pipelines) · Vercel Cron              │
└────────────────────────────────────────────────────────────────┘
```

---

## Database Schema (Core Tables)

### Auth & Users
```
auth.users → profiles (id, role, full_name, phone, ...)
  ├── companion_profiles (user_id, persona, preferences)
  ├── companion_memories (user_id, type, content)
  └── customer_devices (user_id, name, type, age)
```

### Agent OS ★ NEW
```
agent_goals (id, user_id, persona, goal_type, status)
agent_runs (id, goal_id, user_id, plan JSONB, status)
agent_steps (id, run_id, action_id, input, output, status)
agent_actions (id, domain, name, input_schema, output_schema, handler, autonomy_level, risk_level)
agent_policies (id, action_id, persona, max_autonomy_level, require_otp, require_confirmation)
agent_approvals (id, step_id, user_id, action_summary, status)
```

### Orders & Workflow
```
orders (id, customer_id, worker_id, status, estimated_price, final_price, ...)
  ├── order_services (order_id, service_name)
  ├── complaints + disputes + reviews
  └── workflow_states (order_id, current_state)
```

### Wallet & Payment
```
wallets (id, user_id, balance, ...)
  ├── ledger (id, wallet_id, account, direction, amount, ref_type, ref_id)
  ├── payment_intents (id, order_id, gateway, amount, status, gateway_txn_id)
  ├── webhook_events + idempotency_keys
  └── escrow (id, order_id, worker_id, amount, worker_payout, status)
payouts (id, worker_id, amount, status)
```

### Service Registry ★ NEW
```
service_definitions (id, name, icon, category, keywords[], required_skills[], typical_pricing_min, typical_pricing_max, diagnosis_fields JSONB)
```

---

## Edge Functions Map

| Function | Method | Layer | Description |
|----------|--------|-------|-------------|
| **Agent OS** ★ | | | |
| `agent-orchestrator` | POST | Agent | Goal creation + plan execution |
| **Companion** | | | |
| `companion/chat` | POST | Agent | Chat + memory + personality + goal → plan |
| `companion/memory` | GET/POST | Agent | CRUD user memory |
| **AI** | | | |
| `ai-diagnose` | POST | AI | Diagnose + price estimate |
| `ai-matching` | POST | AI | Match worker to order |
| `ai-kyc` | POST | AI | Vision identity verification |
| `ai-auto-executor` | POST | Workflow | Auto actions |
| `ai-quality/warranty/dispute` | POST | AI | Quality/G/W checks |
| `ai-fraud-check/predict/coach/anomaly` | POST | AI | Analytics |
| **Workflow** | | | |
| `workflow-engine` | POST | Workflow | 11-state machine |
| **Map** | | | |
| `osm-geocode/map-search` | POST | Map | Geo |
| `osrm-route` | POST | Map | Route + auth + rate limit |
| **Payment** | | | |
| `payment-process` | POST | Payment | Create payment/webhook/status/refund |
| `vnpay-ipn/stripe-webhook` | GET/POST | Payment | Gateway callbacks |
| `wallet-manager` | POST | Payment | Wallet ops + escrow |
| `stripe-connect/create-payout` | POST | Payment | Worker payout |

---

## Key Design Decisions

1. **Agent OS over chatbot** — AI không trả lời, AI lập goal + plan + execute
2. **Action Registry** — mọi thao tác = 1 action, AI gọi qua Policy
3. **Manual = source of truth** — auto mode gọi cùng API của manual
4. **Service Plugin** — mở rộng dịch vụ không sửa core workflow
5. **Ledger double-entry** — mọi financial action traceable
6. **Autonomy Levels L0-L5** — granular AI permission
7. **Persona-specific AI** — khách/thợ/admin khác nhau
8. **MCP-compatible design** — future: expose actions as MCP tools