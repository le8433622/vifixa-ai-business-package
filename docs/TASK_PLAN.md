# Vifixa AI - Production-Perfect Task Plan

> Source of truth: `agent.md` -> `docs/GAP_ANALYSIS.md` -> `docs/ROADMAP.md` -> file này.
> Mục tiêu: biến trạng thái "production-ready candidate" thành "production-proven" bằng evidence thật.

---

## 1. Nguyên tắc

- Không gọi "hoàn hảo" nếu thiếu P0 Launch Gate evidence.
- Không deploy production nếu staging chưa pass smoke test và migration/RLS verification.
- Không dùng mock data, seed dev, key test hoặc fallback local trong production.
- Không secret trong web/mobile frontend.
- Manual flow phải chạy hoàn chỉnh trước Auto mode.
- AI chỉ gọi Action qua Policy, không direct UI/DB.
- Mọi claim "done" phải có command, screenshot/log, hoặc dashboard evidence.

---

## 2. Current State

| Item | Status | Evidence |
|---|---|---|
| Web build | Pass | `npm run build`, 72 routes |
| Web unit tests | Pass | `npx vitest run`, 33/33 |
| Mobile unit tests | Pass | `npx jest --no-coverage`, 14/14 |
| Edge Function tests | Pass | `deno test --allow-all`, 71/71 |
| Mobile TypeScript | Pass | `npx tsc --noEmit`, 0 errors |
| Working tree | Clean at last checkpoint | HEAD after `2041c5c` before docs update |
| Product status | Candidate | Production infrastructure verification pending |

---

## 3. P0 Launch Gate - Blockers

| ID | Task | Status | Evidence Required | Owner |
|---|---|---|---|---|
| P0-LG-01 | Deploy staging build | Pending | Vercel staging URL + smoke test result |
| P0-LG-02 | Run Supabase migrations on staging | Pending | Migration log + schema diff check |
| P0-LG-03 | Verify RLS on staging DB | Pending | Query results for customer/worker/admin access paths |
| P0-LG-04 | Full E2E business flow | Code ready | Login -> book -> match -> accept -> complete -> pay pass |
| P0-LG-05 | Payment sandbox verification | Pending | VNPay + Stripe sandbox transaction IDs |
| P0-LG-06 | Sentry event verification | Pending | Event appears in Sentry dashboard from staging |
| P0-LG-07 | Mobile STT real-device test | Pending | iOS + Android transcript evidence with `vi-VN` |
| P0-LG-08 | Production env audit | Pending | No missing required env, no frontend secrets |
| P0-LG-09 | Seed/mock guard audit | Pending | Dev seed blocked by production guard, no mock production path |
| P0-LG-10 | Rollback plan | Doc ready | Migration rollback/recovery plan documented |

Exit criteria: tất cả P0-LG phải Pass trước khi gọi production-proven.

---

## 4. P1 Product Polish

| ID | Task | Status | Evidence Required |
|---|---|---|---|
| P1-UX-01 | Full page transitions | Code ready | PageTransition.tsx component exists, route-level enter animation, animated auto/manual switch |
| P1-UX-02 | Mode switch animation | Code ready | ModeToggle CSS transition duration-300 with sliding indicator |
| P1-UX-03 | Voice-first auto mode | Pending | User speaks -> auto submits -> Agent OS handles request |
| P1-UX-04 | UI Vietnamese audit | Pass | Scan completed; admin settings translated |
| P1-UX-05 | Critical empty/error/loading states | Code ready | admin/customer/worker error.tsx pages exist, EmptyState component exists |
| P1-UX-06 | Accessibility smoke test | Pending | Keyboard and labels on forms/dialogs |

Exit criteria: P1 items can ship after P0, but must be scheduled before public launch marketing.

---

## 5. P2 Operations And Scale

| ID | Task | Status | Evidence Required |
|---|---|---|---|
| P2-OPS-01 | Load test 1000 concurrent users | Pending | k6/Artillery report or approved lower target |
| P2-OPS-02 | Backup/restore drill | Pending | Restore staging DB from backup succeeds |
| P2-OPS-03 | Payment reconciliation runbook | Pending | VNPay/Stripe/wallet ledger reconciliation steps |
| P2-OPS-04 | Incident response runbook | Pending | Severity, owner, rollback, customer communication |
| P2-OPS-05 | Observability dashboard | Pending | Error rate, latency, payment failure, AI action failure |
| P2-OPS-06 | Admin audit review | Pending | Agent/admin actions reviewable by timeline |

Exit criteria: required before scaling user acquisition.

---

## 6. P3 Compliance And Expansion

| ID | Task | Status | Evidence Required |
|---|---|---|---|
| P3-COMP-01 | Data retention policy | Pending | Retention matrix by table/data type |
| P3-COMP-02 | User export/delete verification | Pending | Export/delete request tested on staging |
| P3-COMP-03 | SOC2 readiness checklist | Pending | Access control, audit trail, backup, incident docs |
| P3-COMP-04 | Regional readiness | Pending | Currency, language, payment, legal per market |
| P3-COMP-05 | Third-party AI marketplace policy | Future | External agent permissions and audit model |

---

## 7. Immediate Execution Order

1. Implement voice-first auto mode (GAP-P2-03).
2. Complete P0-LG-01 staging deployment.
3. Run P0-LG-02 migrations on staging.
4. Run P0-LG-03 RLS verification scripts with P0-LG-10 rollback at hand.
5. Run P0-LG-04 full E2E business flow test with real staging users.
6. Verify P0-LG-05 payment sandbox with real sandbox keys.
7. Verify P0-LG-06 Sentry event dashboard.
8. Test P0-LG-07 mobile STT on real iOS/Android.
9. Freeze release candidate and produce launch evidence pack.

---

## 8. Launch Evidence Pack

Release cannot be approved without this pack:

- Build URL and commit SHA.
- Test report: web, mobile, Edge Functions, E2E.
- Migration log and DB version.
- RLS verification result.
- Payment sandbox transaction IDs.
- Sentry event link.
- Mobile device test notes.
- Security/env audit result.
- Rollback/recovery plan.
- Known risks and accepted tradeoffs.

---

## 9. Definition Of Perfect

"Hoàn hảo" trong repo này nghĩa là:

- P0 Launch Gate 100% pass with evidence.
- P1 Product Polish either pass or explicitly accepted by Product as post-launch.
- P2 Ops gates scheduled with owners before scale.
- Docs source-of-truth updated.
- No hidden blockers, no unverified payment path, no unverified production DB assumptions.

Nếu thiếu một trong các điều trên, trạng thái đúng là **production-ready candidate**, không phải **production-proven**.
