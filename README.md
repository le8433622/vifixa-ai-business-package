# Vifixa AI

**AI-powered repair & maintenance marketplace.**  
Smart services for real life. | Dịch vụ thông minh cho đời sống thật.

## Stack
| Layer | Tech |
|-------|------|
| Mobile | Expo / React Native |
| Web | Next.js 16 / Tailwind / shadcn/ui |
| Backend | Supabase (Auth, Postgres, Storage, Edge Functions) |
| AI | Edge Functions → OpenAI/Anthropic |
| Payments | Stripe Connect |
| Deploy | Vercel + EAS Build |

## Quick Start
```bash
npm install                # web
cd mobile && npm install   # mobile
supabase login
supabase link --project-ref lipjakzhzosrhttsltwo
cp web/.env.local.example web/.env.local
cd web && npm run dev      # start web
cd mobile && npx expo start # start mobile
```

## Project Structure
```
├── web/          # Next.js web app (admin dashboard, landing)
├── mobile/       # Expo mobile app (customer, worker, admin)
├── supabase/
│   ├── migrations/  # 37 DB migrations
│   └── functions/   # 35 Edge Functions
├── tests/        # Integration & E2E tests
└── docs/         # Business, Architecture, AI docs
```

## Key Docs
- `docs/BUSINESS.md` — Market, model, financials, OKRs
- `docs/ARCHITECTURE.md` — Stack, DB, functions, security
- `docs/AI.md` — AI agents, chat system, KPIs
- `agent.md` — Build execution steps

## Deployments
| Component | URL |
|-----------|-----|
| Web | https://web-eta-ochre-99.vercel.app |
| Supabase | lipjakzhzosrhttsltwo (prod) / drapjraegrygkakzalog (staging) |

## CI/CD
GitHub Actions: lint → typecheck → build → test → deploy (auto on push to main/staging)
