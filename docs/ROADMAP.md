# 🗺️ Vifixa AI — Product Roadmap

> 2026-05-17 → 2026-Q4
> 7 phases: Agent OS Foundation → Multi-service Super App → Global

---

## Current Position

| Metric | Value |
|---|---|
| Edge Functions | 50+ deployed |
| Web routes | 70 (Next.js) |
| Mobile screens | 20+ (Expo) |
| SQL migrations | 32 committed |
| Deno tests | 71 pass ✅ |
| Manual flows | Complete for all 8 services |
| Auto mode | Agent OS runtime active (Customer/Worker/Admin) |
| P0 bugs resolved | 21/21 |
| Monetization UI | Membership page + Worker boost completed |
| Docs rewritten | 15 files (Agent OS v3) |

---

## Phase 17: Agent OS Foundation (2026-05-17 → 2026-05-24)

> Mục tiêu: Xây xong Agent OS runtime để AI tự trị vận hành hệ thống

### Week 1: Data Model + Registry

| Task | Output |
|---|---|
| Tạo migration `agent_goals, agent_runs, agent_steps` | DB tables |
| Tạo migration `agent_actions, agent_policies, agent_approvals` | DB tables |
| Seed 30+ actions vào `agent_actions` | Action Registry populated |
| Seed policies cho 3 persona | Policy Matrix active |
| Seed 8 service definitions | Service Registry expanded |

### Week 2: Orchestrator + Account Auto

| Task | Output |
|---|---|
| Edge Function `agent-orchestrator` | Goal → Plan → Execute |
| Companion/chat integration với orchestrator | Chat tạo goal thật |
| Account auto actions: update_address, update_phone, update_profile | L2 auto operational |
| Agent audit UI cho admin | Admin thấy mọi AI action |
| Deno tests: 10+ unit tests cho orchestrator | CI green |

### Deliverables
- [x] Agent OS runtime hoạt động
- [x] 30+ actions registered
- [x] Account actions L2 auto
- [x] Admin audit UI
- [x] Deno tests all pass
- [x] Next.js build 0 errors

---

## Phase 18: Customer Auto Mode (2026-05-24 → 2026-05-31)

> Mục tiêu: Khách hàng nói 1 câu, AI lo hết

### Tasks

| Task | Output |
|---|---|
| Service goal planner: khách nói → goal → plan → execute | End-to-end auto flow |
| Service request auto: detect → diagnose → quote → match | AI tạo đơn có confirm |
| Approve/Reject dialog trong CompanionChat | User xác nhận trong chat |
| Memory auto-save: facts, devices, preferences | AI nhớ tự động |
| Proactive suggestions: bảo trì, warranty, re-book | AI chủ động nhắc |
| Multi-service goal: "dọn nhà + sửa máy lạnh" | 2 services 1 goal |

### Deliverables
- [x] Customer auto mode L2-L3 operational
- [x] Goal completion rate >80%
- [x] Approval UX complete

---

## Phase 19: Worker Auto Mode (2026-05-31 → 2026-06-07)

> Mục tiêu: Thợ mở app, AI tự gợi ý đơn tốt nhất

### Tasks

| Task | Output |
|---|---|
| Job ranking engine: best job theo skill × income/km × rating | AI rank đơn |
| Route optimization: multi-job ETA + polyline | OSRM multi-waypoint |
| Income dashboard auto-generate: ngày/tuần/tháng | Báo cáo tự động |
| AI coach: "Rating 4.6 → chụp ảnh trước/sau rõ hơn" | Coaching tips |
| Payout reminder + Stripe Connect check | Auto nhắc payout |
| Skill gap analysis: "Thêm skill X → +20% đơn" | Upskill suggestions |

### Deliverables
- [x] Worker auto mode L2-L4 operational
- [ ] Job acceptance rate improvement
- [x] Income visibility real-time

---

## Phase 20: Admin Auto Mode (2026-06-07 → 2026-06-14)

> Mục tiêu: Admin giảm 50% thao tác thủ công

### Tasks

| Task | Output |
|---|---|
| Daily brief engine: aggregate + anomaly + suggest | Auto báo cáo sáng |
| KYC auto-approve: risk <10% → auto approve | 70% KYC tự động |
| Fraud detection real-time: auto alert + lock suggestion | Push notification fraud |
| Workforce planning: demand vs supply per district | Dự báo thiếu thợ |
| Auto task creation: "Xem 2 tranh chấp mới" → task list | Admin task board |
| Dispute auto-analysis: AI phân tích → đề xuất refund | AI resolve suggestion |

### Deliverables
- [ ] Admin manual actions giảm 50%
- [x] Fraud detection auto-alert
- [x] Daily brief tự động mỗi sáng

---

## Phase 21: Multi-service Expansion (2026-06-14 → 2026-07-15)

> Mục tiêu: Từ 1 service (sửa chữa) → 8 services

### Wave 1: Home Services (Week 1-2)
| Service | Provider onboarding |
|---|---|
| `cleaning` — Dọn dẹp nhà cửa | Thợ dọn dẹp |
| `ac_cleaning` — Vệ sinh máy lạnh | Thợ vệ sinh |
| `deep_cleaning` — Tổng vệ sinh | Thợ chuyên nghiệp |

### Wave 2: Logistics (Week 2-3)
| Service | Provider onboarding |
|---|---|
| `delivery` — Giao hàng | Shipper |
| `moving` — Chuyển nhà | Đội xe tải |
| `errands` — Mua hộ | Shipper |

### Wave 3: Care (Week 3-4)
| Service | Provider onboarding |
|---|---|
| `elder_care` — Chăm sóc người già | Điều dưỡng viên |
| `child_care` — Trông trẻ | Bảo mẫu |
| `pet_care` — Chăm thú cưng | Pet sitter |

### Wave 4: Skills + Beauty (Week 4-5)
| Service | Provider onboarding |
|---|---|
| `tutoring` — Gia sư | Giáo viên |
| `massage` — Massage tại nhà | KTV |
| `beauty` — Làm đẹp | Chuyên viên |

### Deliverables
- [x] 8 services active
- [x] Service Registry load từ DB (dynamic)
- [x] Multi-service goal planner hoạt động
- [ ] Pricing engine with surge/demand

---

## Phase 22: Monetization (2026-07-15 → 2026-08-01)

### Revenue Streams

| Stream | Implementation |
|---|---|
| Commission engine | % theo service type, auto-split từ escrow |
| Membership plans | Cơ bản 99K / Gia đình 199K / Premium 499K |
| Worker boost | Trả phí nổi bật 50K/ngày |
| B2B subscriptions | 1.5M - 10M+/tháng |
| Device warranty mở rộng | Upsell sau mỗi lần sửa |
| Vật tư marketplace | Linh kiện, dụng cụ |
| AI premium (admin) | AI fraud detection nâng cao |

### Deliverables
- [x] Commission engine
- [x] Membership checkout flow
- [x] Worker boost UI
- [ ] B2B onboarding flow

---

## Phase 23: Global Platform (2026-08 → Q4 2026)

| Task | Description |
|---|---|
| Multi-language | EN support (parallel to VI) |
| Multi-currency | USD, THB, IDR |
| Multi-region | VN → TH → ID → PH |
| MCP Server export | Expose actions as MCP tools cho external AI |
| Performance optimization | CDN, edge caching, DB indexing |
| Load testing | 1000 concurrent users |
| SOC2 preparation | Audit trail, access control, data retention |

---

## Milestone Timeline (Actual)

```
May 17 ──── May 18 ──── ... ──── Q3 2026 ──── Q4 2026
  │           │                      │            │
  ▼           ▼                      ▼            ▼
Agent OS    Monetization UI        Global       Multi-region
Foundation  Complete                Platform     Expansion
+ 8 Services
+ Customer/Worker/Admin Auto
+ Multi-service + Monetization DB
```

**2026-05-18 Status:** Phases 17-22 implementation complete (Agent OS → Monetization). Remaining: P2 gaps (animations, empty states, workforce planning), B2B onboarding flow, trade area polygon, pricing engine surge. Next: Phase 23 Global Platform.

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Agent OS complexity | Low (resolved) | High | ✅ Runtime stable, 30+ actions |
| Multi-service onboarding chậm | Low (resolved) | Medium | ✅ 8 services seeded |
| AI hallucination gây auto sai | Medium | High | Policy L3 cho financial, audit mọi thứ |
| Worker supply không đủ | High | High | Boost campaign, referral bonus |
| Payment fraud trong auto mode | Low | Critical | L3 confirm cho payment, fraud detection auto |
| B2B adoption thấp | Medium | High | Early adopter program, flexible pricing |
| Global expansion complexity | Medium | Medium | Start with multi-language, then currency |