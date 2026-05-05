# Supabase Setup Instructions for Step 10 Verification

## 1. Create Test User (Manual Steps in Supabase Dashboard)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/lipjakzhzosrhttsltwo/auth/users)
2. Click "Add User" → "Create new user"
3. Email: `test-vifixa-ai@gmail.com` (use real email)
4. Password: `Test123456!`
5. Click "Create user"
6. Copy the User ID (UUID)

## 2. Run KPI Verification SQL

Go to [SQL Editor](https://supabase.com/dashboard/project/lipjakzhzosrhttsltwo/sql)

Copy and paste `supabase/kpi-verification.sql` and click "Run"

Expected output:
- Diagnosis accuracy (needs data)
- Price accuracy (needs data)
- Matching success rate (needs data)
- First-time fix rate
- Trust score distribution
- Fraud detection effectiveness

## 3. Verify Database Tables

Run this SQL in SQL Editor:

```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Check RLS enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check migration 002 tables
SELECT 
  (SELECT COUNT(*) FROM trust_scores) as trust_scores_count,
  (SELECT COUNT(*) FROM complaints) as complaints_count,
  (SELECT COUNT(*) FROM warranty_claims) as warranty_claims_count;
```

## 4. Test AI Functions with Real JWT

After creating test user:

```bash
# Sign in to get JWT
curl -X POST "https://lipjakzhzosrhttsltwo.supabase.co/auth/v1/token?grant_type=password" \
  -H "apikey: sb_publishable_8ZQN98zLEfCsvoAn2OR85g_gB9QjWEF" \
  -H "Content-Type: application/json" \
  -d '{"email": "test-vifixa-ai@gmail.com", "password": "Test123456!"}'

# Use the access_token from response to test AI functions
TOKEN="your-access-token"

curl -X POST "https://lipjakzhzosrhttsltwo.supabase.co/functions/v1/ai-diagnose" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"description": "Máy giặt không quay", "category": "appliance_repair"}'
```

## 5. Configure Stripe Webhooks

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to Developers → Webhooks
3. Click "Add endpoint"
4. Endpoint URL: `https://web-4uc6um2x2-le8433622-9187s-projects.vercel.app/api/webhooks`
5. Select events:
   - `checkout.session.completed`
   - `account.updated`
   - `payment_intent.succeeded`
6. Add endpoint
7. Copy the "Signing secret" (whsec_...)
8. Add to Supabase secrets:
   ```bash
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
   ```

## 6. EAS Mobile Build

```bash
cd mobile

# Login to Expo (use your Expo account)
eas login

# Build for iOS (requires Apple Developer account)
eas build --platform ios --profile production

# Build for Android
eas build --platform android --profile production
```

## 7. Final Checklist

- [ ] API keys updated in web/.env.local ✅
- [ ] API keys updated in mobile/app.json ✅
- [ ] Test user created in Supabase Auth
- [ ] 7 AI functions tested with JWT
- [ ] KPI verification SQL executed
- [ ] Database tables verified (trust_scores, complaints, warranty_claims)
- [ ] RLS policies verified
- [ ] EAS build completed (iOS + Android)
- [ ] Stripe webhooks configured
- [ ] E2E flow tested (customer → worker → admin)

## 8. Mark Complete

Once all items checked:
- Update ACTUAL_PROGRESS_REPORT.md
- Change Step 10 status to ✅ COMPLETE
- Project is 100% complete and production-ready! 🚀

