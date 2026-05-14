# 🚀 Vifixa AI-Native Platform v4

> **AI là app, app là AI** — 4 super-agents, 3 screens, không form, không table.

## 🧠 Kiến trúc V4

```
4 Super-Agents (thay 36 functions cũ) → 3 Screens (thay 54 screens cũ)
```

| Layer | Công nghệ |
|-------|-----------|
| **AI Engine** | 4 Supabase Edge Functions (Orchestrator, Navigator, Monetizer, Humanizer) |
| **Web** | Next.js 16 — 3 screens (Map + Chat + Dashboard) |
| **Mobile** | Expo React Native — 3 screens (Map + Chat + Dashboard) |
| **Backend** | Supabase (Postgres + Auth + Realtime) |
| **AI Models** | NVIDIA NIM (Llama 3.1, Mixtral) |
| **Maps** | OpenStreetMap + Leaflet + OSRM |

## 🚀 Quick Start V4

```bash
# Web V4
cd web && npm run dev  # → http://localhost:3000/v4

# Mobile V4
cd mobile && npx expo start  # → /v4 (3 tabs)

# Deploy super-agents
supabase functions deploy v4-core v4-orchestrator v4-navigator v4-monetizer v4-humanizer
```

## 🖥️ 3 Screens

| Screen | Web | Mobile | Mô tả |
|--------|-----|--------|-------|
| 🗺️ MAP | `/v4` | `/v4` | 1 screen cho Khách/Thợ/Admin |
| 💬 CHAT | `/v4/chat` | `/v4/chat` | Mọi tương tác qua AI |
| 📊 DASHBOARD | `/v4/dashboard` | `/v4/dashboard` | AI insights, không table |

## 📖 Tài liệu

- [V4 API Reference](docs/V4-API.md) — 4 super-agents endpoints
- [Architecture](docs/ARCHITECTURE.md) — Kiến trúc hệ thống
- [Design System](docs/DESIGN.md) — Components + patterns

## ⚠️ LEGACY — Hệ thống cũ

Hệ thống cũ (36 functions + 54 screens) vẫn hoạt động nhưng **không còn được phát triển**.
Chuyển sang V4 cho các tính năng mới.

| Cũ | Mới |
|----|-----|
| 36 edge functions riêng lẻ | 4 super-agents |
| 54 screens (web + mobile) | 6 screens (3 web + 3 mobile) |
| Forms + tables | Chat + Map |
