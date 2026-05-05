# Vifixa AI - Deployment Guide

## Overview
Vifixa AI is a home services platform with AI-powered diagnosis, pricing, and worker matching.

## Stack
- **Backend**: Supabase (PostgreSQL + Edge Functions + Auth + Storage)
- **Web**: Next.js 16.2.4 on Vercel
- **Mobile**: Expo SDK 53 with EAS Build
- **Payments**: Stripe Connect

## Prerequisites
- Supabase CLI: `npm i -g supabase`
- Vercel CLI: `npm i -g vercel`
- EAS CLI: `npm i -g eas-cli`
- Node.js >= 20.9.0
- Deno (for Supabase Functions)

## Deployment Steps

### 1. Supabase Database & Functions
```bash
# Login to Supabase
supabase login

# Link project
supabase link --project-ref lipjakzhzosrhttsltwo

# Push database migrations
supabase db push

# Deploy Edge Functions (14 functions)
supabase functions deploy

# Verify deployment
supabase functions list
```

### 2. Vercel Web Deployment
```bash
cd web

# Login to Vercel
vercel login

# Set environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY

# Deploy to production
vercel --prod
```

**Production URL**: https://web-4uc6um2x2-le8433622-9187s-projects.vercel.app

### 3. Expo Mobile Build (EAS)
```bash
cd mobile

# Login to Expo
eas login

# Configure build
eas build:configure

# Build for iOS
eas build --platform ios --profile production

# Build for Android
eas build --platform android --profile production
```

**App Config**: `mobile/app.json`
- iOS Bundle ID: `com.vifixa.ai`
- Android Package: `com.vifixa.ai`

### 4. Stripe Webhooks
Configure webhook endpoint in Stripe Dashboard:
- **URL**: `https://web-4uc6um2x2-le8433622-9187s-projects.vercel.app/api/webhooks`
- **Events**: 
  - `checkout.session.completed`
  - `account.updated`
  - `payment_intent.succeeded`

### 5. Environment Variables

#### Web (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=https://lipjakzhzosrhttsltwo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

#### Mobile (app.json extra)
```json
{
  "extra": {
    "SUPABASE_URL": "https://lipjakzhzosrhttsltwo.supabase.co",
    "SUPABASE_ANON_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

## Verification

### Test 7 AI Edge Functions
```bash
# Get auth token first
TOKEN="your-auth-token"

# Test ai-diagnose
curl -X POST https://lipjakzhzosrhttsltwo.supabase.co/functions/v1/ai-diagnose \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"description": "Máy giặt không quay", "category": "appliance_repair"}'

# Test ai-estimate-price
curl -X POST https://lipjakzhzosrhttsltwo.supabase.co/functions/v1/ai-estimate-price \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"diagnosis": "Thay motor", "category": "appliance_repair"}'
```

### Check RLS Policies
Run in Supabase SQL Editor:
```sql
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

### Run KPI Verification
```bash
# In Supabase SQL Editor, run:
-- File: supabase/kpi-verification.sql
```

## Monitoring
- Supabase Dashboard: https://supabase.com/dashboard/project/lipjakzhzosrhttsltwo
- Vercel Dashboard: https://vercel.com/le8433622-9187s-projects
- Stripe Dashboard: https://dashboard.stripe.com

## Troubleshooting

### Database Migration Fails
- Ensure Docker is running (for local development)
- Or use `supabase db push` directly (remote)

### Edge Function Returns 401
- Check authorization header is present
- Verify JWT token is valid

### EAS Build Fails
- Check `app.json` has correct bundle identifier
- Ensure Expo account is linked

## AI KPIs (Target vs Actual)
| KPI | Target | Actual | Status |
|-----|--------|--------|--------|
| Diagnosis Accuracy | ≥80% | TBD | Pending test |
| Price Accuracy | ≥60% | TBD | Pending test |
| Matching Success | ≥50% | TBD | Pending test |

Run `supabase/kpi-verification.sql` to calculate actual KPIs.

## Support
- GitHub: https://github.com/anomalyco/opencode/issues
- Docs: https://opencode.ai
