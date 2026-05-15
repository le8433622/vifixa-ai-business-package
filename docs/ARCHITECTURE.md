# 🏗️ Vifixa AI — System Architecture

## 4-Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  Next.js 16 Web  │  │  Expo Mobile     │                │
│  │  (Vercel)        │  │  (iOS/Android)   │                │
│  └────────┬─────────┘  └────────┬─────────┘                │
│           │                     │                           │
│  ┌────────▼─────────────────────▼─────────┐                │
│  │        SHARED COMPONENTS               │                │
│  │  CompanionChat  MapView  PaymentModal  │                │
│  └────────────────┬───────────────────────┘                │
└───────────────────┼─────────────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────────────┐
│                    COMPANION LAYER ★                         │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              AI COMPANION ENGINE                     │   │
│  │  • Context Builder    • Memory Query                 │   │
│  │  • AI Decision        • Action Executor              │   │
│  │  • Personality Engine • Learning Engine              │   │
│  └──────────┬───────────────────────────────────────────┘   │
│             │                                                │
│  ┌──────────▼───────────────────────────────────────────┐   │
│  │              COMPANION MEMORY                        │   │
│  │  companion_profiles  companion_memories              │   │
│  │  companion_interactions  customer_devices            │   │
│  └──────────────────────────────────────────────────────┘   │
└───────────────────┬─────────────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────────────┐
│                    3 CORES LAYER                             │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   AI CORE    │  │   MAP CORE   │  │  PAYMENT CORE    │  │
│  │              │  │              │  │                  │  │
│  │ ai-diagnose  │  │ map-search   │  │ payment-create   │  │
│  │ ai-match     │  │ map-route    │  │ vnpay-ipn       │  │
│  │ ai-chat      │  │ map-tracking │  │ stripe-webhook   │  │
│  │              │  │              │  │ wallet           │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
│         │                │                    │            │
└─────────┼────────────────┼────────────────────┼────────────┘
          │                │                    │
┌─────────▼────────────────▼────────────────────▼────────────┐
│                    INFRASTRUCTURE LAYER                     │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Supabase │  │   Auth   │  │ Realtime │  │ Storage  │  │
│  │ Postgres │  │ (RBAC)   │  │ (Socket) │  │ (Media)  │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │ NVIDIA   │  │ Leaflet  │  │ VNPay/   │                 │
│  │ NIM AI   │  │ OSRM Map │  │ Stripe   │                 │
│  └──────────┘  └──────────┘  └──────────┘                 │
└───────────────────────────────────────────────────────────┘
```

## Database Schema (7 Core Tables)

```
┌──────────────────┐     ┌──────────────────┐
│  auth.users      │     │  companion       │
│  (Supabase Auth) │────▶│  _profiles       │
└──────────────────┘     └──────────────────┘
         │                        │
         │                        ▼
         │               ┌──────────────────┐
         │               │  companion       │
         │               │  _memories       │
         │               └──────────────────┘
         │                        │
         │                        ▼
         │               ┌──────────────────┐
         │               │  companion       │
         │               │  _interactions   │
         │               └──────────────────┘
         │
         ├──────────────────────┐
         │                      │
         ▼                      ▼
  ┌──────────┐          ┌──────────┐
  │customer  │          │ workers  │
  │_devices  │          │          │
  └──────────┘          └──────────┘
                              │
         ┌────────────────────┤
         │                    │
         ▼                    ▼
  ┌──────────┐          ┌──────────┐
  │ service  │          │  orders  │
  │_requests │─────────▶│          │
  └──────────┘          └──────────┘
                              │
                              ▼
                       ┌──────────┐
                       │transactns│
                       └──────────┘
                       ┌──────────┐
                       │ wallets  │
                       └──────────┘
                       ┌──────────┐
                       │ ledger   │
                       └──────────┘
```

## Edge Functions (9 total)

| Function | Method | Core | Description |
|----------|--------|------|-------------|
| `companion/chat` | POST | AI | Chat + memory + actions |
| `companion/memory` | GET | AI | Query user memory |
| `ai-diagnose` | POST | AI | Diagnose + price estimate |
| `ai-match` | POST | AI | Match worker to order |
| `map-search` | POST | Map | Find nearby workers/orders |
| `payment-create` | POST | Payment | Create VNPay/Stripe payment |
| `payment-status` | GET | Payment | Check payment status |
| `wallet` | POST/GET | Payment | Wallet + ledger operations |
| `admin` | GET | All | Dashboard stats |

## Webhooks (2)

| Webhook | Core | Description |
|---------|------|-------------|
| `vnpay-ipn` | Payment | GET: VNPay IPN callback |
| `stripe` | Payment | POST: Stripe webhook events |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Web | Next.js 16, React 19, Tailwind v4 |
| Mobile | Expo SDK 54, React Native 0.81 |
| Backend | Supabase (Postgres 17 + Auth + Realtime) |
| AI | NVIDIA NIM (Llama 3.1, Mixtral, Llama 3.2 Vision) |
| Maps | OpenStreetMap + Leaflet + OSRM |
| Payments | VNPay (HMAC-SHA512) + Stripe (Connect) |
| Deploy | Vercel (web) + EAS Build (mobile) |
| CI/CD | GitHub Actions |

## Security

- No service_role key in frontend
- All AI calls through Supabase Edge Functions
- RLS on ALL tables (user sees only own data)
- VNPay: HMAC-SHA512 signature verification
- Stripe: webhook signature verification
- No mock data in production