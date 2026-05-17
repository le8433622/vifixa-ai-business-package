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

## Build Status (2026-05-17)
| Check | Status |
|-------|--------|
| Next.js build (62 routes) | ✅ 0 errors |
| Deno tests (6 functions → 33) | ✅ 33/33 pass |
| SQL migrations | 26 committed (001 → 20260529000001) |
| RLS on profiles | ✅ Fixed — `is_admin_from_jwt()` helper, 24+ policies converted |
| CI/CD auto-deploy | ✅ GitHub Actions (Supabase + Vercel) — all green |

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
- Committed: `001_init`, `20260510...gateway_configs`, `20260514...companion_core`, `20260514...ai_map_payment_core`, `20260514...seed_vnpay`, `20260515...unify_v4_backup`, `20260515...create_companion_tables`, `20260515...multi_ledger_wallet`, `20260521...ai_vector_search`, `20260522...service_areas_heatmap`, `20260523...map_infrastructure`, `20260525...payment_intents`, `20260526...workflow_engine`, `20260526...notifications`, `20260527...workflow_triggers_idempotency`, `20260528...device_tokens_messages`, +4 phase migrations

## Edge Functions
- Deployed/ready: `ai-chat`, `ai-diagnosis`, `ai-matching`, `ai-quality`, `ai-dispute`, `ai-coach`, `ai-predict`, `ai-warranty`, `ai-healthcheck`, `ai-care-agent`, `ai-fraud-check`, `stripe-connect`, `companion/chat`
- Ready (auto-deploy on push): `ai-auto-executor`, `ai-kyc`, `workflow-engine`, `notify`

## Recent Work (2026-05-17)
1. ✅ Fixed login routing bug (P0) — profiles columns, error handling on login/register/home pages
2. ✅ Applied 14 migrations to production (20260515000004 → 20260528000001)
3. ✅ Added `DROP POLICY IF EXISTS` to 4 migration files for idempotent deployment
4. ✅ Wired `ai-auto-executor` to call workflow engine (diagnosis:completed, price:estimated, worker:matched, job:completed)
5. ✅ Wired worker GeoFenceCheckIn → `worker:arrived` workflow event
6. ✅ Wired worker job complete → `job:completed` workflow event
7. ✅ Wired mobile `usePushNotifications` hook into App.tsx root
8. ✅ **RLS Recursion Fix**: Created `is_admin_from_jwt()` helper, converted 24+ admin policies across all tables to use JWT instead of subquerying `profiles` — breaks infinite `profiles → orders → profiles` loop
9. ✅ **Test user passwords**: Reset to `Vifixa@2026!` — login verified for all 3 roles
10. ✅ **Migration cleanup**: Removed superseded 02/03 files, repaired migration history (marked reverted), committed + pushed 04 + 05
11. ✅ **CI/CD**: All 3 pipelines green (Deploy Vercel, Deploy Supabase, Self-Check)

## Current State
- **Workflow Engine**: Full 11-state machine, all events wired from payment-process, wallet-manager, ai-auto-executor, and worker UI
- **Notification Engine**: 13 notification types, SMS (Twilio) + Push (Expo) + In-app table, NotificationBell component wired in all 3 layouts
- **Real-time Tracking**: WorkerTracker with Realtime subscription, OSRM route integration on worker map
- **Customer Refund**: RefundRequestModal + Admin refund management page complete
- **Mobile**: Expo project with all screens, push notification hook wired, GPS tracking ready
- **Analytics**: Anomaly detection, revenue forecast, workforce suggestions, location analytics all in admin dashboard

## Recent Work (2026-05-17)
1. ✅ Applied all 10 P0 bug fixes — RLS recursion, payment function names, wallet escrow, mobile worker chat, admin disputes route, ai-fraud-check verifyAuth()
2. ✅ Created customer map page `/customer/map` — standalone map with skill filter + AvailableWorkersMap
3. ✅ Created worker mobile map `(worker)/map.tsx` — nearby orders on map with accept + detail panel
4. ✅ Created 7 missing mobile admin screens: KYC, Payments, Settings, Analytics, Locks, Notifications, Refunds — updated admin tab layout with Vietnamese labels + comprehensive dashboard menu
5. ✅ Verified AI scheduler cron — code complete (Edge Function + Vercel Cron route + vercel.json schedule)
6. ✅ Implemented worker payout method — fixed Stripe Connect button (added worker_id), added payout history display on web + mobile earnings pages
7. ✅ Rewrote admin AI settings page — fully functional: model selector, API keys, prompt editor, quality thresholds, persisting to app_settings table
8. ✅ Added migration `20260529000001_ai_settings.sql` — creates app_settings table with AI config defaults

## Build Status (2026-05-17)
| Check | Status |
|-------|--------|
| Next.js build (62 routes) | ✅ 0 errors |
| Deno tests (6 functions → 33) | ✅ 33/33 pass |
| SQL migrations | 26 committed (001 → 20260529000001) |
| RLS on profiles | ✅ Fixed |
| CI/CD auto-deploy | ✅ GitHub Actions (Supabase + Vercel) |

## Next Steps
1. ⏳ **Verify CI/CD** after push — check deploy-vercel + deploy-supabase workflows
2. ⏳ **Mobile admin**: fix English tab labels → Vietnamese (admin index, users, orders, disputes screens)
3. ⏳ **P1 fixes**: map marker clustering, OSRM route optimization, push notification for worker arrival
4. ⏳ **P2 fixes**: UI polish, English string audit, transition animations, empty states

## References
- `vifixa-ai-v4` repo = backup archive (don't modify)
- This repo = active production development