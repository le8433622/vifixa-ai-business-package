# Vifixa AI - Gap Analysis Live

> Cross-flow analysis: Khách - Thợ - Admin x AI - Map - Payment x Manual - Auto.
> Cập nhật: 2026-05-18 - Production-perfect protocol.

---

## 1. Current Architecture Snapshot

```text
KHÁCH (Manual + Auto)    THỢ (Manual + Auto)      ADMIN (Manual + Auto)
  |                         |                          |
  |- Agent OS Companion     |- AI Co-pilot             |- AI Analyst
  |- Goal -> Plan -> Action |- Job ranking             |- Daily brief
  |- 9 services plugin      |- Route optimization      |- Fraud detection
  |- Memory + personalize   |- Income dashboard        |- Auto task list

AI CORE                 MAP CORE                  PAYMENT CORE
NVIDIA NIM             OSM + Leaflet + OSRM       VNPay + Stripe + Wallet
```

---

## 2. Product State

| Area | Status | Evidence |
|---|---|---|
| Agent OS foundation | Resolved | Orchestrator, actions, policies, approvals, audit |
| Customer auto mode | Resolved | Goal planner, service flow, approvals, memory |
| Worker auto mode | Resolved | Job ranking, route optimizer, income dashboard, coach |
| Admin auto mode | Resolved | Daily brief, KYC reviewer, fraud, workforce planning |
| Multi-service | Resolved | 9 service definitions in service registry |
| Map core | Resolved | OSRM proxy, clustering, service area polygon |
| Payment core | Resolved in code | Stripe/VNPay handlers and sandbox-aware gateways |
| Production readiness | Candidate | Real infra verification pending |

---

## 3. Remaining Product Gaps

| ID | Priority | Gap | Impact | Fix Plan | Status |
|---|---|---|---|---|---|
| GAP-P1-10 | P1 | Full page transitions + mode switch animations | UX chưa đạt polish public-launch | Add page transition wrapper, route-level enter animation, animated auto/manual switch | Open |
| GAP-P2-03 | P1 | Voice-first auto mode | Voice hiện là dictation, chưa hands-free Agent OS | Add voice mode, auto-submit on speech end, route transcript to existing auto-mode flow | Open |

---

## 4. Production Verification Gaps

Các gap này không nhất thiết là code thiếu. Đây là launch evidence bắt buộc để chuyển từ **production-ready candidate** sang **production-proven**.

| ID | Priority | Gap | Required Evidence | Status |
|---|---|---|---|---|
| GAP-LAUNCH-01 | P0 | Staging deployment chưa verify mới nhất | Vercel staging URL + smoke test pass | Open |
| GAP-LAUNCH-02 | P0 | Supabase migrations chưa chạy trên staging/prod mới nhất | Migration log + schema version | Open |
| GAP-LAUNCH-03 | P0 | RLS chưa verify bằng DB thật | Query evidence per persona | Open |
| GAP-LAUNCH-04 | P0 | Full E2E business flow chưa có evidence thật | Login -> book -> match -> accept -> complete -> pay | Open |
| GAP-LAUNCH-05 | P0 | Payment sandbox/live-key audit chưa đủ evidence | VNPay + Stripe sandbox transaction IDs | Open |
| GAP-LAUNCH-06 | P0 | Sentry dashboard chưa xác nhận event | Sentry event link from deployment | Open |
| GAP-LAUNCH-07 | P0 | Mobile STT chưa test thiết bị thật | iOS + Android notes/video/log | Open |
| GAP-LAUNCH-08 | P0 | Production env/security audit chưa có pack | Env checklist, no secrets, no mock data | Open |
| GAP-LAUNCH-09 | P0 | Rollback/recovery plan chưa đóng gói | Rollback doc + owner | Open |

---

## 5. Resolved Gaps - Recent

| ID | Gap | Resolved In | Verification |
|---|---|---|---|
| GAP-OS-01->10 | Agent OS foundation gaps | Phase 17 | Orchestrator, actions, policies, approvals, audit |
| GAP-P1-01 | Worker job ranking engine | Phase 19 | WorkerJobRanker |
| GAP-P1-02 | Worker route multi-job optimization | Phase 19 | OSRM multi-waypoint + WorkerRouteOptimizer |
| GAP-P1-03 | Admin daily brief | Phase 20 | AdminDailyBrief |
| GAP-P1-04 | KYC auto-approve low risk | Phase 20 | AdminKycReviewer |
| GAP-P1-05 | Fraud detection real-time alert | Phase 20 | Fraud alerts |
| GAP-P1-06 | Workforce planning | Phase 20 | AdminWorkforcePlanning |
| GAP-P1-07 | Worker income dashboard | Phase 19 | WorkerIncomeDashboard |
| GAP-P1-08 | AI coaching | Phase 19 | WorkerCoach |
| GAP-P1-09 | English UI strings | Phase 6 + 2026-05-18 audit | Admin settings translated, scan clean |
| GAP-P1-11 | Empty states | Phase 21 | EmptyState component |
| GAP-P2-01 | Map marker clustering | Phase 23 | MapWithClustering |
| GAP-P2-02 | Service area polygon containment | Phase 24 | point_in_polygon RPC + service-area EF + ServiceAreaDrawer save |
| GAP-P2-04 | Multi-language EN | Phase 23 | i18n dictionary expanded |
| GAP-P2-05 | MCP Server | Phase 23 | mcp-server Edge Function |
| GAP-P2-06 | B2B dashboard | Phase 22 | /b2b + /for-business pages |
| GAP-P2-07 | Invoice PDF | Phase 23 | invoice-generator Edge Function |
| GAP-P2-08 | Dark mode | Phase 23 | ThemeProvider + ThemeToggle + CSS animations |
| GAP-C-01 | gateway_payment_id mismatch | Phase C-1 | Payment naming fixed |
| GAP-C-02 | VNPay key naming mismatch | Phase C-3 | camelCase unified |
| GAP-C-03 | Worker earnings not from ledger | Phase C-4 | Ledger-backed earnings |
| GAP-C-04 | Payout escrow release | Phase C-5 | release_escrow RPC |
| GAP-B-01 | SECURITY DEFINER caller verification | Phase B | Audit complete |
| GAP-D-01 | 3 AI chat streams | Phase D | companion/chat canonical |
| GAP-E-01 | OSRM proxy auth/rate limit | Phase E-1 | Proxy protected |
| GAP-E-02 | Web worker map direct OSRM call | Phase E-2 | Uses proxy |
| GAP-E-03 | Mobile GPS permissions | Phase E-3 | Permission flow added |

---

## 6. Gap Handling Protocol

1. If a new gap is discovered, add it here before coding.
2. Every gap must have priority, impact, fix plan, and status.
3. After fix, move it to Resolved with verification evidence.
4. Launch gaps cannot be marked resolved without real infrastructure evidence.
5. If evidence is unavailable, status remains Open or Blocked, never Done.

---

## 7. Conclusion

- Product feature gaps remaining: **2**.
- Launch verification gaps remaining: **9**.
- Resolved functional gaps: **40+**.
- Correct status: **production-ready candidate**.
- Not yet production-proven because staging/prod, payment, Sentry, mobile device, RLS, and full E2E evidence are still pending.
