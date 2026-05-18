# 🔍 Vifixa AI — Gap Analysis (Live)

> Cross-flow analysis: Khách · Thợ · Admin × AI · Map · Payment × Manual · Auto
> Cập nhật: 2026-05-17 — Agent OS version

---

## Current Architecture Snapshot

```
KHÁCH (Manual + Auto)    THỢ (Manual + Auto)      ADMIN (Manual + Auto)
  │                         │                          │
  ├─ Agent OS Companion     ├─ AI Co-pilot             ├─ AI Analyst
  ├─ Goal → Plan → Execute  ├─ Job ranking             ├─ Daily brief
  ├─ 8 services plugin      ├─ Route optimization      ├─ Fraud detection
  └─ Memory + Personalize   └─ Income dashboard        └─ Auto task list

AI CORE (13 funcs)        MAP CORE (6 components)    PAYMENT CORE (VMD+USD)
```

---

## 🔴 P0 Agentic Gaps (Blocking)

| ID | Gap | Impact | Fix Plan |
|----|-----|--------|----------|
| GAP-OS-01 | Agent OS runtime chưa tồn tại | AI không thể tự trị | Phase 17: tạo agent_goals/runs/steps/actions/policies/approvals + orchestrator |
| GAP-OS-02 | Action Registry chưa có | AI không biết có thể làm gì | Seed 30+ actions vào agent_actions table |
| GAP-OS-03 | Policy Engine chưa có | AI không biết action nào được auto | Tạo agent_policies table + policy checker trong orchestrator |
| GAP-OS-04 | Goal Planner chưa có | AI chat nhưng không tạo goal thật | Phase 18: companion/chat integration với orchestrator |
| GAP-OS-05 | Approval UI chưa có | AI cần confirm nhưng không có UX cho user | Companion ApprovalDialog component |
| GAP-OS-06 | Agent Audit UI chưa có | Admin không thấy AI đang làm gì | Admin page: agent runs/steps timeline |
| GAP-OS-07 | Memory auto-save chưa có | AI không tự ghi nhớ facts | L2 auto memory.save_fact trong orchestrator |
| GAP-OS-08 | Service Registry chỉ có repair | Chỉ 1 service / 8 planned | Dynamic loading service_definitions từ DB |
| GAP-OS-09 | Multi-service goal planner chưa có | "Dọn nhà + sửa máy lạnh" → 2 services 1 goal | Extend Goal Planner đa service |
| GAP-OS-10 | Account auto actions chưa có | "Đổi địa chỉ" → không auto | L2 actions: update_address, update_phone, update_profile |

---

## 🟡 P1 Gaps (Major)

| ID | Gap | Impact | Fix Plan |
|----|-----|--------|----------|
| GAP-P1-01 | Worker job ranking engine chưa có | Thợ thấy đơn không được rank | (RESOLVED) WorkerJobRanker + useWorkerAutoMode ✅ |
| GAP-P1-02 | Worker route multi-job optimization | Thợ không thấy route tối ưu nhiều đơn | (RESOLVED) OSRM multi-waypoint + WorkerRouteOptimizer ✅ |
| GAP-P1-03 | Admin daily brief chưa có | Admin phải tự xem KPI thủ công | (RESOLVED) AdminDailyBrief + useAdminAutoMode ✅ |
| GAP-P1-04 | KYC auto-approve low risk | Admin phải duyệt từng KYC | (RESOLVED) AdminKycReviewer + AI score ✅ |
| GAP-P1-05 | Fraud detection real-time alert | Admin không biết fraud cho đến khi check | (RESOLVED) Fraud detection in useAdminAutoMode ✅ |
| GAP-P1-06 | Workforce planning chưa có | Admin không biết thiếu thợ ở đâu | demand vs supply per district |
| GAP-P1-07 | Worker income dashboard auto-generate | Thợ xem thu nhập thủ công | (RESOLVED) WorkerIncomeDashboard ✅ |
| GAP-P1-08 | AI coaching (worker skill improvement) | Thợ không biết cải thiện gì | (RESOLVED) WorkerCoach component ✅ |
| GAP-P1-09 | English strings còn trong UI | UX inconsistency | (RESOLVED) Vietnamese audit completed ✅ |
| GAP-P1-10 | Transition animations chưa có | UX thô | Page transitions + mode switch |
| GAP-P1-11 | Empty states chưa có cho mọi list | UX không chuyên | (RESOLVED) EmptyState component created ✅ |

---

## 🟢 P2 Gaps (Minor)

| ID | Gap |
|----|-----|
| GAP-P2-01 | Map marker clustering trên số lượng lớn (1000+) — (RESOLVED) MapWithClustering component exists ✅ |
| GAP-P2-02 | Service area polygon containment trong matching | (RESOLVED) point_in_polygon RPC + service-area EF + ServiceAreaDrawer wires to DB ✅ |
| GAP-P2-03 | Voice-first auto mode: nói thay vì gõ |
| GAP-P2-04 | Multi-language VI → EN cho expansion — (RESOLVED) i18n EN dictionary expanded ✅ |
| GAP-P2-05 | MCP Server: expose actions as MCP tools — (RESOLVED) mcp-server Edge Function ✅ |
| GAP-P2-06 | B2B service plan + dashboard riêng — (RESOLVED) /b2b + /for-business pages ✅ |
| GAP-P2-07 | Invoice generation (PDF hóa đơn điện tử) — (RESOLVED) invoice-generator Edge Function ✅ |
| GAP-P2-08 | Dark mode UI — (RESOLVED) ThemeProvider + ThemeToggle + animations ✅ |

---

## 🟣 P3 Gaps (Future)

| ID | Gap |
|----|-----|
| GAP-P3-01 | External platform integration (Shopee, Lazada, VietnamWorks) |
| GAP-P3-02 | Multi-currency (USD, THB, IDR) |
| GAP-P3-03 | Load testing: 1000 concurrent users |
| GAP-P3-04 | SOC2 compliance preparation |
| GAP-P3-05 | AI marketplace: 3rd-party AI agents on Vifixa platform |
| GAP-P3-06 | IoT integration: auto detect device failure from sensors |

---

## Gap History (Resolved — Recent)

| ID | Gap | Resolved In |
|----|-----|-------------|
| GAP-C-01 | gateway_payment_id ≠ gateway_txn_id | Phase C-1 |
| GAP-C-02 | VNPay key naming mismatch (tmnCode vs tmn_code) | Phase C-3 |
| GAP-C-03 | Worker earnings not from ledger | Phase C-4 |
| GAP-C-04 | Payout escrow release via release_escrow RPC | Phase C-5 |
| GAP-B-01 | SECURITY DEFINER functions no caller verification | Phase B |
| GAP-D-01 | 3 AI chat streams (companion/chat, ai-chat, v4-orchestrator) | Phase D |
| GAP-E-01 | OSRM proxy no auth/rate limit | Phase E-1 |
| GAP-E-02 | Web worker map direct OSRM call (CORS) | Phase E-2 |
| GAP-E-03 | Mobile GPS permissions missing | Phase E-3 |
| GAP-01→15 | (see GAP_ANALYSIS v2) | Phase 1-16 |
| GAP-OS-01→10 | Agent OS foundation gaps | Phase 17 ✅ |
| GAP-P1-01 | Worker job ranking engine | Phase 19 — WorkerJobRanker ✅ |
| GAP-P1-03 | Admin daily brief | Phase 20 — AdminDailyBrief ✅ |
| GAP-P1-04 | KYC auto-approve | Phase 20 — AdminKycReviewer ✅ |
| GAP-P1-05 | Fraud detection | Phase 20 — Fraud alerts ✅ |
| GAP-P1-07 | Worker income dashboard | Phase 19 — WorkerIncomeDashboard ✅ |
| GAP-P1-09 | English strings in UI | Phase 6 — EN→VI audit ✅ |
| GAP-SUB-01 | Membership UI missing | Phase 22 — /customer/membership page ✅ |
| GAP-SUB-02 | Worker boost UI missing | Phase 22 — /worker/boost page ✅ |
| GAP-P1-02 | Worker route multi-job optimization | Phase 19 — OSRM multi-waypoint + WorkerRouteOptimizer ✅ |
| GAP-P1-08 | AI coaching (worker skill improvement) | Phase 19 — WorkerCoach component ✅ |
| GAP-P1-11 | Empty states on lists | Phase 21 — EmptyState component ✅ |
| GAP-B2B-01 | B2B onboarding flow | Phase 22 — /for-business page ✅ |

---

## Gap History (All Resolved)

| ID | Gap | Resolved In | Verification |
|----|-----|------------|-------------|
| GAP-01 | Event-driven workflow engine | Phase 6 | ✅ 71 tests |
| GAP-02 | Real-time worker tracking | Phase 3 | ✅ Web + mobile |
| GAP-03 | Notification engine (13 types) | Phase 6 | ✅ SMS/Push/In-app |
| GAP-04 | AI proactive predictive care | Phase 6 | ✅ ai-scheduler cron |
| GAP-05 | Refund/dispute integration | Phase 6 | ✅ Refund + admin |
| GAP-06 | Admin AI decision support | Phase 6 | ✅ ai-anomaly |
| GAP-07 | Spatial intelligence OSRM | Phase E | ✅ Proxy + auth |
| GAP-08 | Mobile app all screens | Phase 7-8 | ✅ Expo built |
| GAP-09 | Payment idempotency | Phase 6 | ✅ stripe-pi + webhook |
| GAP-10 | Admin mobile route path | Bugfix 2026-05-17 | ✅ Fixed |
| GAP-11 | Worker payout onboarding | Bugfix 2026-05-17 | ✅ Stripe Connect |
| GAP-12→15 | Various P0 fixes | Phase C/B/D/E | ✅ Verified |
| GAP-OS-01→10 | Agent OS gaps | Phase 17 ✅ | Orchestrator, audit, actions |
| GAP-P1-01 | Job ranking engine | Phase 19 ✅ | WorkerJobRanker |
| GAP-P1-02 | Route optimization | Phase 19 ✅ | OSRM multi-waypoint |
| GAP-P1-03 | Admin daily brief | Phase 20 ✅ | AdminDailyBrief |
| GAP-P1-04 | KYC auto-approve | Phase 20 ✅ | AdminKycReviewer |
| GAP-P1-05 | Fraud detection | Phase 20 ✅ | Fraud alerts |
| GAP-P1-06 | Workforce planning | Phase 20 ✅ | AdminWorkforcePlanning |
| GAP-P1-07 | Income dashboard | Phase 19 ✅ | WorkerIncomeDashboard |
| GAP-P1-08 | AI coaching | Phase 19 ✅ | WorkerCoach |
| GAP-P1-09 | English strings | Phase 6 ✅ | EN→VI audit |
| GAP-P1-11 | Empty states | Phase 21 ✅ | EmptyState component |
| GAP-P2-04 | Multi-language EN | Phase 23 ✅ | i18n EN dictionary |
| GAP-P2-05 | MCP Server | Phase 23 ✅ | mcp-server Edge Function |
| GAP-P2-06 | B2B dashboard | Phase 22 ✅ | /b2b page |
| GAP-P2-07 | Invoice PDF | Phase 23 ✅ | invoice-generator Edge Function |
| GAP-P2-08 | Dark mode | Phase 23 ✅ | ThemeProvider + animations |
| GAP-P1-10 | Animations | Phase 23 ✅ | CSS micro-animations in globals.css (page transitions still missing) |
| GAP-P2-02 | Service area polygon | Phase 24 ✅ | ServiceAreaDrawer wires polygon to service-area EF → DB |

---

## Kết Luận

- **10 P0 agentic gaps** — ✅ All resolved
- **11 P1 gaps** — ✅ 10 resolved, 1 remaining (P1-10 page transition animations — CSS micro-animations done, full page transitions missing)
- **1 P1 remaining:** Page transitions (P1-10)
- **8 P2 gaps** — ✅ 7 resolved, 1 remaining (P2-03 voice-first auto mode)
- **1 P2 remaining:** Voice-first auto mode (P2-03)
- **6 P3 gaps** — Global expansion (Phase 23+)
- **41 resolved gaps** — Agent OS → Service Area Polygon complete

**Trạng thái:** Phases 17-22 (Agent OS → Monetization) implementation complete. GAP-P2-02 (service area polygon) resolved. P1-10 (page transitions) and P2-03 (voice-first auto mode) remain for next phase.