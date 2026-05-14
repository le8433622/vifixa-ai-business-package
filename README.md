# 🧠🗺️ Vifixa AI — MAP + AI Operating System

**Hệ điều hành AI cho dịch vụ vật lý.**  
MAP (điểm vật lý) + AI (bộ não trí tuệ) = Trung tâm. Mọi module xoay quanh.

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

## Architecture
```
MAP 🗺️ (7 OSM functions) + AI 🧠 (28 agents) = CORE
  ↓
3 màn hình: Khách → Thợ → Admin (Map-first, AI-first)
```

## Quick Start
```bash
supabase login && supabase link --project-ref lipjakzhzosrhttsltwo
cp .env.example .env.local  # Set NVIDIA_API_KEY
supabase db push            # Apply migrations
supabase functions deploy   # Deploy all 35+ functions
cd web && npm run dev       # Web
cd mobile && npx expo start # Mobile
```

## Project Structure
```
├── supabase/
│   ├── functions/    # 35+ Edge Functions (28 AI + 7 OSM)
│   │   ├── _shared/  # ai-core, ai-audit, ai-rag, auth-helper
│   │   ├── ai-*/     # 28 AI agents
│   │   └── osm-*/    # 7 OSM/map functions
│   └── migrations/   # 12 migrations
├── web/              # Next.js (customer + worker + admin)
├── mobile/           # Expo React Native
├── tests/            # E2E + API + load tests
└── docs/             # ARCHITECTURE, DESIGN, API docs
```

## 3 User Roles
| Role | Core Flow | Key Pages |
|------|-----------|-----------|
| 👤 Khách | Map → thợ gần → Chat AI → Đặt → Theo dõi | Map, Chat, Orders |
| 🛠️ Thợ | Map → đơn gần → Route → Nhận → Hoàn thành | Map, Jobs, Coach |
| 👑 Admin | Map → thợ/đơn → AI Analytics → Heatmap | Dashboard, Monitor, Cost |

## Key Features
- **Map-first**: Mọi thứ đều có tọa độ, hiển thị trên bản đồ
- **AI-first**: 28 AI agents xử lý mọi tác vụ
- **Streaming Chat**: AI trả lời real-time từng token
- **Vision**: AI nhìn ảnh sự cố để chẩn đoán
- **OSRM Route**: Khoảng cách lái xe thực tế, không chim bay
- **Heatmap**: Bản đồ nhu cầu dịch vụ
- **Auto-Pilot**: Một nút bấm, AI tự động xử lý đơn hàng
- **A/B Testing**: Statistical significance cho prompt experiments
- **100% tiếng Việt**: Toàn bộ UI và AI đều bằng tiếng Việt

## Documentation
- [Architecture](docs/ARCHITECTURE.md)
- [Design System](docs/DESIGN.md)
- [API Reference](docs/API.md)
- [AI Operating Model](docs/AI.md)

## Testing
```bash
bash scripts/run-all-tests.sh         # All tests
npx playwright test tests/e2e/       # E2E
deno test --allow-net tests/api/     # API contracts
k6 run tests/load/scenario-100-users.js  # Load test
```