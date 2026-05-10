# Vifixa AI — Architecture Master Plan

## Stack
```
Layer          │ Stack
───────────────┼─────────────────────────────────────────────
Mobile         │ Expo / React Native / Expo Router
Web Admin      │ Next.js 16 / Tailwind / shadcn/ui
Backend        │ Supabase (Auth + Postgres + Storage + Realtime)
AI Layer       │ Supabase Edge Functions → OpenAI / Anthropic
Payments       │ Stripe Connect / Stripe Checkout
Deploy Web     │ Vercel
Deploy Mobile  │ EAS Build (iOS + Android)
```

## Architecture
```
[Mobile App] ←→ [Supabase JS Client] ←→ [Supabase: Auth/DB/Storage/Realtime]
                                              ↕ Edge Functions
                                        [AI Agents] ←→ [OpenAI/Anthropic]
                                              ↕
[Next.js Web] ←→ [Server-side API] ──────────↗
```

## Database (Key Tables)
| Table | Purpose |
|-------|---------|
| `profiles` | Linked to auth.users, role-based (customer/worker/admin) |
| `workers` | Skills, service areas, trust_score, verification |
| `orders` | Full lifecycle: request → matched → in_progress → completed |
| `ai_logs` | Every AI call input/output for audit |
| `trust_scores` | Dynamic trust for customers & workers |
| `pricing_rules` | Dynamic pricing config (surge, time, location, skill) |
| `membership_plans` | Subscription plans (Basic/Silver/Gold/Platinum) |
| `customer_subscriptions` | Active subscriptions |
| `worker_ad_packages` | Ad/boost packages for workers |
| `gateway_configs` | Payment gateway configurations |
| `feature_flags` | Toggle-safe feature management |
| `app_settings` | Global app configuration |
| `chat_sessions` | AI chat conversations |
| `chat_messages` | Individual messages in chat |
| `referrals` | Referral tracking |
| `achievements` | Gamification achievements |
| `reviews` | Order reviews & ratings |
| `complaints` | Dispute/complaint management |
| `warranties` | Warranty tracking |
| `maintenance_history` | Equipment maintenance records |

Full schema: `supabase/migrations/` (37 migration files, all incremental)

## Edge Functions (35 total)
### AI Agents (8)
| Function | Role |
|----------|------|
| `ai-diagnose` | Analyze issue → category, urgency, diagnosis |
| `ai-estimate-price` | Estimate cost from category, difficulty, materials |
| `ai-matching` | Match best worker by skills, distance, history |
| `ai-quality` | Check before/after photos, quality checklist |
| `ai-dispute` | Summarize disputes, analyze evidence |
| `ai-coach` | Technical suggestions, safety checklists |
| `ai-fraud-check` | Detect fake orders, fake reviews, price anomalies |
| `ai-predict` | Predict demand, maintenance needs |

### Business Logic (12)
`admin-dashboard`, `customer-requests`, `worker-jobs`, `auth-login`, `auth-register`, `activate-boost`, `calculate-dynamic-price`, `create-subscription`, `purchase-ad-package`, `subscription-manage`, `wallet-manager`, `stripe-checkout`, `stripe-connect`, `stripe-payment-intent`, `stripe-webhook`, `payment-process`, `upload-complete`, `notify`

### AI Chat (3)
`ai-chat`, `ai-care-agent`, `ai-warranty`

### System (4)
`feature-flag`, `user-preferences`, `smart-suggestions`, `behavioral-analytics`

## Security
- **Auth**: Supabase Auth (email/password, OTP, Google OAuth)
- **RLS**: Row-level security per role (customer/worker/admin) on all tables
- **AI**: All calls via Edge Functions only — no API keys in mobile/web
- **Storage**: Private by default, signed URLs for access
- **Audit**: Every AI call logged to `ai_logs`, retention 12 months
- **Validation**: Zod schemas on all Edge Function inputs
- **Rate limit**: 5 auth requests/min per IP via Supabase

## Key Design Principles
- **Toggle-safe**: Every feature can be turned on/off without deploy
- **AI-first but human-controlled**: AI suggests, human confirms for sensitive decisions
- **Evidence-based ops**: Every order has photos, diagnosis, status, materials, review
- **No mock data in production** | **No secrets in frontend** | **No skipped RBAC**

## Deployments
| Component | Production | Staging |
|-----------|------------|---------|
| Supabase | `lipjakzhzosrhttsltwo` | `drapjraegrygkakzalog` |
| Web | Vercel (auto-deploy `main`) | Vercel (auto-deploy `staging`) |
| Mobile | EAS Build | EAS Build preview |
| CI/CD | GitHub Actions (lint → typecheck → build → deploy) |
