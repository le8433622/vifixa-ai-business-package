# Vifixa AI — Opencode Directive

## North Star
**1 AI Companion cho mỗi người dùng** (khách · thợ · admin)
3 trụ cột: **AI · Map · Payment** — tất cả phục vụ khách hàng

## Rules
- **Workflow Protocol (bắt buộc):** (1) Propose plan + todo → (2) Chờ user approve → (3) Execute — không tự ý làm ngoài plan
- Source of truth: `docs/VISION.md`, `docs/COMPANION.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`
- Follow sequential process in `agent.md` — zero deviation
- No secrets in mobile/web frontend
- No mock data in production
- Stack: Supabase (Postgres + Edge Functions) · Vercel (Next.js 16) · Expo (SDK 54)
- AI Models: NVIDIA NIM (Llama 3.1 · Mixtral · Llama 3.2 Vision)
- Payments: VNPay (VND) + Stripe (USD)
- Maps: OpenStreetMap + Leaflet + OSRM
- UI language: Vietnamese (English strings are bugs)
- Layout: flex flow only (no absolute overlays)
- Auto mode: AI executes defined manual steps; centralized `useAutoMode` hook with Realtime subscriptions

## Build Status (2026-05-16)
| Check | Status |
|-------|--------|
| Next.js build (61 routes) | ✅ 0 errors |
| Deno tests (6 functions) | ✅ 33/33 pass |
| SQL migrations | 21 committed |
| Docker (local supabase) | ❌ Not running |
| Production env config | ✅ Linked (lipjakzhzosrhttsltwo) |
| CI/CD auto-deploy | ✅ GitHub Actions (Supabase + Vercel) |

## Gap Analysis
- Source of truth for all identified gaps: `docs/GAP_ANALYSIS.md`, `docs/FLOWCHART.md`
- Mọi task mới phải check gap analysis trước — không tạo code mới overlap hoặc ignore gap
- Nếu phát hiện gap mới giữa các luồng, phải cập nhật GAP_ANALYSIS.md và thông báo ngay

## Phases Completed
1. **Trust & Verification** — Worker KYC (CMND/CCCD + Selfie → AI Vision → Admin duyệt), CV/Portfolio, Customer OTP, Verification Badge (4 types × levels), Trust Score Engine
2. **Map Discovery** — Worker GPS auto-update + online/offline, AvailableWorkersMap, WorkerMapPopup + BookWorkerModal, Geo-matching RPC, Real-time WorkerTracker, Worker map page
3. **Account Management** — Admin lock/unlock UI (3 levels), Auto-lock trigger, Lock history, Account deletion + data export, Password change, Staking Manager (4 plans), VFCBadge (4 tiers), ConnectedAccounts, Notification preferences
4. **Core AI Engine + Auto-mode** — `useAutoMode` hook, `ai-auto-executor` Edge Function, `ai-kyc` Edge Function, all 3 domain pages wired (customer/worker/admin), ModeToggle
5. **Map Gaps** — Geo-fence Check-in (validate_check_in RPC, GeoFenceCheckIn component), Location Analytics (get_location_analytics RPC, LocationAnalytics component)
6. **Quality Fixes** — `@ts-nocheck` removed, dead code cleaned, OrderDetails interface fixed, transition prop on all 3 pages, AI KYC integration in admin approval, Layout redesign (flex flow), Language standardized EN→VI, UI polish

## SQL Migrations
- Committed: `001_init`, `20260510...gateway_configs`, `20260514...companion_core`, `20260514...ai_map_payment_core`, `20260514...seed_vnpay`, `20260515...unify_v4_backup`, `20260515...create_companion_tables`, `20260515...multi_ledger_wallet`, `20260521...ai_vector_search`, `20260522...service_areas_heatmap`, `20260523...map_infrastructure`, `20260525...payment_intents`, `20260526...workflow_engine`, `20260526...notifications`, +4 phase migrations

## Edge Functions
- Deployed/ready: `ai-chat`, `ai-diagnosis`, `ai-matching`, `ai-quality`, `ai-dispute`, `ai-coach`, `ai-predict`, `ai-warranty`, `ai-healthcheck`, `ai-care-agent`, `ai-fraud-check`, `stripe-connect`, `companion/chat`
- Ready (auto-deploy on push): `ai-auto-executor`, `ai-kyc`, `workflow-engine`, `notify`

## Next Steps
1. ✅ Commit all pending work (done)
2. ✅ Auto-deploy migrations via CI (`supabase db push` in deploy workflow)
3. ✅ Auto-deploy Edge Functions via CI (all functions in deploy list)
4. ✅ Auto-deploy web app via CI (`deploy-vercel.yml`)
5. ❌ Docker chưa chạy local — chỉ cần nếu muốn dev local

## References
- `vifixa-ai-v4` repo = backup archive (don't modify)
- This repo = active production development