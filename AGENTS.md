# Vifixa AI — Opencode Directive

## North Star
**1 AI Companion cho mỗi người dùng** (khách · thợ · admin)
3 trụ cột: **AI · Map · Payment** — tất cả phục vụ khách hàng

## Rules
- Source of truth: `docs/VISION.md`, `docs/COMPANION.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`
- Follow sequential process in `agent.md` — zero deviation
- No secrets in mobile/web frontend
- No mock data in production
- Stack: Supabase (Postgres + Edge Functions) · Vercel (Next.js 16) · Expo (SDK 54)
- AI Models: NVIDIA NIM (Llama 3.1 · Mixtral · Llama 3.2 Vision)
- Payments: VNPay (VND) + Stripe (USD)
- Maps: OpenStreetMap + Leaflet + OSRM

## References
- `vifixa-ai-v4` repo = backup archive (don't modify)
- This repo = active production development