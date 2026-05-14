# 🏗️ Vifixa AI Architecture v3

## Stack
```
Layer       │ Technology
────────────┼────────────────────────────────────
Mobile      │ Expo SDK 54 / React Native 0.81
Web Admin   │ Next.js 16 / React 19 / Tailwind v4
Backend     │ Supabase (Postgres 17 + Auth + Realtime)
AI Runtime  │ Supabase Edge Functions (Deno)
AI Models   │ NVIDIA NIM (Llama 3.1, Mixtral, Llama 3.2 Vision)
Maps        │ OpenStreetMap + Leaflet + OSRM
CI/CD       │ GitHub Actions + Vercel + EAS Build
```

## Cấu trúc thư mục
```
vifixa-ai/
├── supabase/
│   ├── functions/          # 35+ Edge Functions
│   │   ├── _shared/        # Shared modules (ai-core, ai-audit, etc)
│   │   ├── ai-*/          # 28 AI agents
│   │   └── osm-*/         # 7 OSM/map functions
│   └── migrations/        # 12 database migrations
├── web/
│   └── src/
│       ├── app/
│       │   ├── customer/   # 8 screens (map-first)
│       │   ├── worker/     # 10 screens (map-first)
│       │   └── admin/      # 20+ screens (map-first AI)
│       └── components/
│           ├── admin/AIUI.tsx   # Shared UI
│           └── map/BanDo.tsx    # Leaflet map
├── mobile/
│   └── src/
│       ├── app/(customer)/ # 8 screens
│       ├── app/(worker)/   # 10 screens
│       ├── app/(admin)/    # 15 screens
│       └── components/
│           └── BanDo.tsx   # WebView Leaflet map
├── tests/
│   ├── api/contracts.test.ts     # 22 API tests
│   ├── e2e/critical-flows.spec.ts # 10 E2E tests
│   └── load/scenario-100-users.js # k6 load test
└── docs/
    ├── ARCHITECTURE.md
    ├── DESIGN.md
    ├── API.md
    └── AI.md
```

## 35+ Edge Functions
```
AI Agents (28):     ai-diagnose, ai-estimate-price, ai-matching, ai-quality,
                    ai-dispute, ai-coach, ai-fraud-check, ai-predict,
                    ai-care-agent, ai-warranty, ai-upsell, ai-materials,
                    ai-chat, ai-feedback, ai-report, ai-monitor,
                    ai-news-writer, smart-suggestions, behavioral-analytics,
                    ai-retention, ai-referral, ai-reengage, ai-autopilot,
                    ai-pricing-optimizer, ai-order-funnel, ai-worker-revenue,
                    ai-auto-upsell, ai-negotiate

OSM/Map (7):        osm-geocode, osm-route, osm-map, osm-heatmap,
                    osm-service-area, osm-distance, osm-map (legacy)
```

## 3 user roles
```
Customer: Map → thợ gần → chat AI → chẩn đoán → báo giá → đặt → theo dõi
Worker:   Map → đơn gần → route → nhận → hoàn thành → AI coach
Admin:    Map → thợ/đơn → AI analytics → heatmap → quản lý
```

## Database
```
12 migrations applied. Key tables:
- profiles, workers, orders (có location_lat/lng)
- ai_logs, ai_cost_log (audit)
- ai_cache, ai_prompts, ai_feedback (AI core)
- service_areas (GeoJSON)
- location_cache (geocode)
- chat_sessions, chat_messages
- order_heatmap (view)
```