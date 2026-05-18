# Vifixa AI - Product Roadmap

> Current roadmap after Agent OS, monetization, service expansion, and hardening.
> Updated: 2026-05-18.

---

## 1. Current Position

| Metric | Value |
|---|---|
| Product state | Production-ready candidate |
| Next.js routes | 72 |
| Edge Functions | 50+ implemented |
| SQL migrations | 37 committed |
| Web unit tests | 33/33 pass |
| Mobile unit tests | 14/14 pass |
| Deno tests | 71/71 pass |
| Mobile TypeScript | 0 errors |
| P0 implementation bugs | 21/21 resolved |
| Functional gaps remaining | 2 |
| Launch verification gaps | 9 |

---

## 2. Completed Phases

| Phase | Status | Outcome |
|---|---|---|
| Phase 17 | Complete | Agent OS runtime, actions, policies, approvals, audit |
| Phase 18 | Complete | Customer auto mode, goal planner, approval UX, memory |
| Phase 19 | Complete | Worker auto mode, job ranking, route optimization, income dashboard, AI coach |
| Phase 20 | Complete | Admin auto mode, daily brief, KYC reviewer, fraud, workforce planning |
| Phase 21 | Complete | Multi-service expansion, service registry, EmptyState |
| Phase 22 | Complete | Monetization UI, membership, worker boost, B2B onboarding/dashboard |
| Phase 23 | Complete | Global platform foundation: EN dictionary, multi-currency, MCP, dark mode, invoice, surge pricing |
| Phase 24-A | Complete | Service area polygon wired to DB and docs source-of-truth cleaned up |

---

## 3. Phase 24 - Product Hardening

> Goal: close remaining product-quality gaps before production verification.

| Task | Status | Acceptance Criteria |
|---|---|---|
| Full page transitions | Pending | Route transitions visible on customer/worker/admin top paths |
| Mode switch animations | Pending | Auto/manual toggle gives animated state feedback |
| Voice-first auto mode | Pending | User speaks, transcript auto-submits, Agent OS handles through existing policy flow |
| Critical page UX audit | Pending | Loading/empty/error states verified for top pages |
| Accessibility smoke test | Pending | Forms/dialogs/buttons keyboard and label path verified |

Exit criteria: P1 UX gaps either closed or explicitly accepted as post-launch.

---

## 4. Phase 25 - Production Verification

> Goal: produce evidence that the system works on real infrastructure.

| Task | Status | Evidence |
|---|---|---|
| Deploy latest candidate to staging | Pending | Staging URL + commit SHA |
| Run migrations on staging Supabase | Pending | Migration logs + schema version |
| Verify RLS on staging | Pending | Per-persona query results |
| Full E2E business flow | Pending | Login -> book -> match -> accept -> complete -> pay report |
| VNPay sandbox verification | Pending | Transaction ID and callback/IPN result |
| Stripe sandbox verification | Pending | PaymentIntent ID and webhook result |
| Sentry event verification | Pending | Dashboard event link |
| Mobile STT device test | Pending | iOS + Android test evidence |
| Production env/security audit | Pending | Env matrix + no-secret/no-mock report |
| Rollback plan | Pending | Recovery plan and owner |

Exit criteria: all P0 launch gates in `docs/TASK_PLAN.md` pass.

---

## 5. Phase 26 - Launch Operations

> Goal: operate safely after launch.

| Task | Status | Evidence |
|---|---|---|
| Load test | Pending | 1000 concurrent users or Product-approved target |
| Backup/restore drill | Pending | Restore staging DB from backup |
| Payment reconciliation runbook | Pending | VNPay/Stripe/wallet ledger reconciliation steps |
| Incident response runbook | Pending | Severity, owner, rollback, communication template |
| Observability dashboard | Pending | Error, latency, payment failure, AI action failure metrics |
| Launch sign-off | Pending | Product + Engineering + Ops approval |

---

## 6. Phase 27 - Scale And Compliance

| Task | Status | Notes |
|---|---|---|
| SOC2 readiness | Future | Access control, audit trail, retention, incident docs |
| Data export/delete verification | Future | User rights flow tested on staging |
| Multi-region rollout | Future | VN -> TH -> ID -> PH |
| External integrations | Future | Shopee, Lazada, VietnamWorks, IoT |
| Third-party AI marketplace | Future | External agent policy, limits, audit |

---

## 7. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Claiming perfect without infra evidence | Medium | High | Prompt guard + TASK_PLAN launch gates |
| Payment sandbox/live mismatch | Medium | Critical | Sandbox transaction IDs + webhook verification before launch |
| RLS drift between migration and real DB | Medium | Critical | Staging query verification per persona |
| Mobile STT differs by device/OS | Medium | Medium | Physical iOS/Android test before launch |
| Voice-first auto mode over-executes | Medium | High | Reuse Agent OS policy and confirmation levels |
| Page transitions regress performance | Low | Medium | Keep animations minimal and measure build/runtime |
| Worker supply shortage | High | High | Boost campaign, referral bonus, workforce planning |

---

## 8. Status Statement

As of 2026-05-18, Vifixa AI is a **production-ready candidate**, not yet **production-proven**. The next milestone is Phase 25 evidence collection on real staging/production infrastructure.
