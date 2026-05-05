# Technical Architecture
## System Overview
Vifixa AI uses Supabase backend (Auth, Postgres, Storage, Edge Functions) + Vercel-deployed Next.js web app + cross-platform Expo/React Native mobile app.

## Text-Based Architecture Diagram
```
[Expo Mobile App (Customer/Worker/Admin)]
        ↓ ↑ Supabase JS Client
[Supabase (Auth, Postgres, Storage, Realtime)]
        ↓ ↑ Edge Functions
[Supabase Edge Functions (AI Agents)]
        ↓ ↑ Server-side API
[Next.js Web App (Vercel)]
        ↓ ↑ AI API Calls (Server-side Only)
[AI Provider (OpenAI/Anthropic)]
```

## Core Components
### Backend (Supabase)
- Supabase Auth: Email/password, OTP, OAuth
- Supabase Postgres: Relational storage, RLS policies
- Supabase Storage: Buckets for avatars, media, documents
- Supabase Edge Functions: Server-side AI agents, API endpoints
- Supabase Realtime: Live order updates, notifications

### Web App (Next.js + Vercel)
- Admin dashboard, public landing page, marketing pages
- Server-side rendering, API routes for webhooks

### Mobile App (Expo/React Native)
- Three isolated navigation stacks: Customer, Worker, Admin
- No AI secrets, all calls via Supabase JS client or Edge Functions

## Sample Data Flow (Customer Service Request)
1. Customer submits request + media via mobile app
2. App uploads media to Supabase Storage, creates record via Supabase JS client
3. Supabase Edge Function (ai-diagnose) triggers, calls AI provider
4. Diagnosis stored in Postgres, worker matching Edge Function runs
5. Matched worker receives push notification via Expo
6. Status updates sync via Supabase Realtime to customer app

## References
- 15_CODEX_BUSINESS_CONTEXT.md
- SUPABASE_SPEC.md
- VERCEL_SPEC.md
- 11_AI_OPERATING_MODEL.md
- 05_PRODUCT_SOLUTION.md
