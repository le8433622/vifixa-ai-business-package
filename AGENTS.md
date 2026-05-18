# Vifixa AI — Opencode Directive

## North Star
**1 AI Companion cho mỗi người dùng** (khách · thợ · admin)
3 trụ cột: **AI · Map · Payment** — tất cả phục vụ khách hàng

## Hiến Pháp
`agent.md` — ĐỌC TRƯỚC MỌI VIỆC. Chứa toàn bộ: Agent OS principle, rules, action registry contract, autonomy levels, persona playbooks, build order.

## Rules
- **Workflow Protocol (bắt buộc):** (1) Propose plan + todo → (2) Chờ user approve → (3) Execute — không tự ý làm ngoài plan
- Source of truth: `agent.md` → `docs/AGENT_OS.md` → `docs/ACTION_REGISTRY.md` → ...
- No secrets in mobile/web frontend
- No mock data in production
- Stack: Supabase (Postgres + Edge Functions) · Vercel (Next.js 16) · Expo (SDK 54)
- AI Models: NVIDIA NIM (Llama 3.1 · Mixtral · Llama 3.2 Vision)
- Payments: VNPay (VMD) + Stripe (USD)
- Maps: OpenStreetMap + Leaflet + OSRM
- UI language: Vietnamese (English strings are bugs)
- **Agent OS Golden Rule:** AI không được trực tiếp thao tác UI/DB. AI chỉ gọi Action qua Policy. Manual flow là xương sống.

## Build Status (2026-05-18)
| Check | Status |
|-------|--------|
| Next.js build (72 routes) | ✅ 0 errors |
| Deno tests (71 tests) | ✅ 71/71 pass |
| Vitest (web) | ✅ 33/33 pass |
| Mobile tsc | ✅ 0 errors |
| SQL migrations | 38 committed (37 on remote) |
| RLS | ✅ All tables |
| Vercel deploy | ✅ https://web-eta-ochre-99.vercel.app |
| Supabase prod | ✅ lipjakzhzosrhttsltwo.supabase.co |
| P0 resolved | 21/21 |

## Gap Analysis
- Source of truth: `docs/GAP_ANALYSIS.md`, `docs/FLOWCHART.md`
- Mọi task mới phải check gap analysis trước
- Nếu phát hiện gap mới → cập nhật GAP_ANALYSIS.md trước

## Phases Completed
1. Trust & Verification — Worker KYC (AI Vision), Customer OTP, Trust Score Engine
2. Map Discovery — GPS, AvailableWorkersMap, Geo-matching RPC, WorkerTracker
3. Account Management — Lock/unlock, Staking (4 plans), VFCBadge (4 tiers)
4. Core AI Engine + Auto-mode — useAutoMode, ai-auto-executor, ai-kyc, ModeToggle
5. Map Gaps — Geo-fence Check-in, Location Analytics
6. Quality Fixes — @ts-nocheck removed, EN→VI, UI polish
7. Payment Hardening — gateway_payment_id fix, VNPay naming unified
8. Security Deep Audit — SECURITY DEFINER verified, OSRM proxy auth added
9. AI Unification — companion/chat canonical, ai-chat deprecated
10. Agent OS Foundation — orchestrator, 30+ actions, policy engine, audit UI
11. Customer Auto Mode — service goal planner, memory auto-save, 8 services
12. Worker Auto Mode — job ranking, income dashboard, intent detection
13. Admin Auto Mode — daily brief, KYC reviewer, fraud detection
14. Multi-service Expansion — 8 service definitions, 24 actions, 18 skills
15. Monetization Engine — commissions, 5 membership plans, worker boosts, B2B
16. Monetization UI — Membership page + Worker boost purchase page
17. Route Optimization — OSRM multi-waypoint + WorkerRouteOptimizer
18. AI Coaching — WorkerCoach (rating, skills, trust score, cancel rate tips)
19. Workforce Planning — Admin demand vs supply per district
20. B2B Dashboard — /b2b page + /for-business onboarding
21. Multi-language EN — i18n dictionary expanded with 100+ EN keys
22. MCP Server — Expose 30+ actions as MCP tools for external AI agents
23. Dark Mode — ThemeProvider + ThemeToggle + CSS animations
24. Invoice Generator — PDF invoice for orders
25. Pricing Surge — Dynamic pricing based on demand vs supply
26. Production Launch — Supabase migrations (37/37), Vercel deploy, RLS 100%, page transitions, E2E business flow, rollback plan

## References
- `vifixa-ai-v4` repo = backup archive (don't modify)
- This repo = active production development
- `agent.md` = constitution for all AI agents working on this project