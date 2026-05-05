# Performance & Security Test Checklist
# Per Step 8: Testing & Validation

## Performance Tests

### 1. Supabase Function Response Time < 2s
```bash
# Test Edge Function response time
time curl -X POST https://[PROJECT_REF].supabase.co/functions/v1/ai-diagnosis \
  -H "Authorization: Bearer [TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{"description": "test", "category": "plumbing"}'

# Expected: < 2 seconds
```

**Checklist:**
- [ ] ai-diagnosis responds < 2s
- [ ] ai-estimate-price responds < 2s
- [ ] ai-matching responds < 2s
- [ ] ai-quality responds < 2s
- [ ] ai-fraud-check responds < 2s
- [ ] ai-warranty responds < 2s

### 2. Web Pages Load < 3s
```bash
# Test with Lighthouse CI or manual testing
# Open Chrome DevTools → Network tab → Reload page
# Check "Load" time at bottom

# Or use curl to measure TTFB (Time to First Byte)
curl -o /dev/null -s -w "TTFB: %{time_starttransfer}s\nTotal: %{time_total}s\n" \
  https://vifixa.com/customer

# Expected: TTFB < 1s, Total load < 3s
```

**Checklist:**
- [ ] Homepage loads < 3s
- [ ] Customer dashboard loads < 3s
- [ ] Worker dashboard loads < 3s
- [ ] Admin dashboard loads < 3s
- [ ] AI logs page loads < 3s with data

### 3. Mobile Screens Render < 2s
```bash
# Use Expo DevTools or React Native Debugger
# Measure time from component mount to render complete

# Or use performance.now() in components:
# const start = performance.now();
# useEffect(() => {
#   const end = performance.now();
#   console.log('Render time:', end - start, 'ms');
# }, []);
```

**Checklist:**
- [ ] Customer home screen renders < 2s
- [ ] Service request form ready < 2s
- [ ] Orders list loads < 2s
- [ ] Worker jobs list loads < 2s
- [ ] Admin users list loads < 2s

### 4. Database Query Optimization (Check Indexes)
```sql
-- Run in Supabase SQL Editor
EXPLAIN ANALYZE 
SELECT * FROM orders 
WHERE customer_id = '[USER_ID]' 
ORDER BY created_at DESC 
LIMIT 10;

-- Check if indexes are used
-- Expected: Index Scan using idx_orders_customer_id

-- Check slow queries
SELECT 
  query,
  mean_time,
  calls
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
```

**Checklist:**
- [ ] orders.customer_id has index
- [ ] orders.worker_id has index
- [ ] orders.status has index
- [ ] ai_logs.order_id has index
- [ ] workers.user_id has index

---

## Security Tests

### 1. No Secrets in Frontend
```bash
# Check web app for exposed secrets
cd /Users/lha/Documents/vifixa-ai-business-package/web

# Search for potential secrets
grep -r "sk-" --include="*.ts" --include="*.tsx" src/ || echo "No Stripe secret keys found"
grep -r "SUPABASE_SERVICE_ROLE" --include="*.ts" --include="*.tsx" src/ || echo "No service role keys in frontend"
grep -r "password\|secret\|api_key" --include="*.ts" --include="*.tsx" src/ | grep -v "process.env" || echo "No hardcoded secrets"

# Check mobile app
cd ../mobile
grep -r "sk-" --include="*.ts" --include="*.tsx" src/ || echo "No secrets in mobile"
```

**Expected:** No secrets found in frontend code

### 2. RLS Policies Enforce (Try Access Other User's Data)
```sql
-- Test as Customer 1: Try to view Customer 2's orders
-- (Should fail with RLS)

-- Test as Worker 1: Try to view Worker 2's profile
-- (Should fail unless admin)

-- Test as non-admin: Try to view ai_logs
-- (Should fail - only admins can view)

-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
JOIN pg_class ON pg_class.relname = tablename 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'workers', 'orders', 'ai_logs');

-- Expected: rowsecurity = true for all tables
```

**Checklist:**
- [ ] Customer can only view own orders
- [ ] Customer can only view own profile
- [ ] Worker can only view own worker profile
- [ ] Worker can only update own orders (assigned)
- [ ] Non-admin cannot view ai_logs
- [ ] RLS enabled on all tables

### 3. Service Role Only Server-Side
```bash
# Verify Edge Functions use service role correctly
cd /Users/lha/Documents/vifixa-ai-business-package/supabase/functions

# Check that functions use service role for sensitive ops
grep -r "SUPABASE_SERVICE_ROLE_KEY" */index.ts | head -20

# Verify web API routes use service role
cd ../../web
grep -r "SUPABASE_SERVICE_ROLE" --include="*.ts" --include="*.tsx" src/app/api/

# Verify frontend only uses anon key
grep -r "NEXT_PUBLIC_SUPABASE_ANON_KEY\|EXPO_PUBLIC_SUPABASE_ANON_KEY" .
```

**Expected:**
- [ ] Edge Functions use `SUPABASE_SERVICE_ROLE_KEY` for DB writes
- [ ] Web API routes use service role server-side only
- [ ] Frontend uses anon key only
- [ ] No service role key in frontend code

### 4. Supabase Storage Policies (Private Buckets)
```sql
-- Check storage policies
SELECT 
  bucket_id, 
  name, 
  definition 
FROM storage.policies;

-- Verify verification-docs bucket is private
SELECT 
  id, 
  name, 
  public 
FROM storage.buckets 
WHERE id = 'verification-docs';

-- Expected: public = false
```

**Checklist:**
- [ ] verification-docs bucket is private (public=false)
- [ ] Workers can only upload own docs
- [ ] Workers can only view own docs
- [ ] Admins can view all docs
- [ ] No public access to verification docs

### 5. Authentication & Authorization
```bash
# Test protected routes redirect to login
curl -s -o /dev/null -w "%{http_code}" https://vifixa.com/customer/orders
# Expected: 307 redirect to /login

# Test API routes without auth
curl -s -X POST https://vifixa.com/api/trust \
  -H "Content-Type: application/json" \
  -d '{"worker_id": "test"}'
# Expected: 401 Unauthorized

# Test API routes with invalid token
curl -s -X POST https://vifixa.com/api/trust \
  -H "Authorization: Bearer invalid-token" \
  -H "Content-Type: application/json" \
  -d '{"worker_id": "test"}'
# Expected: 401 Unauthorized
```

**Checklist:**
- [ ] Unauthenticated users redirected to login
- [ ] API returns 401 without auth header
- [ ] API returns 401 with invalid token
- [ ] Admin routes check role = 'admin'
- [ ] Workers can only access worker routes

---

## Automated Security Scan (Optional)

```bash
# Install security scanner
npm install -g @security/audit

# Scan for vulnerabilities
cd /Users/lha/Documents/vifixa-ai-business-package
npm audit --production

# Scan for secrets
npx @security/secret-scan .

# Check dependencies
npm outdated
```

**Pass Criteria:**
- [ ] No critical vulnerabilities (npm audit)
- [ ] No secrets detected
- [ ] Dependencies up to date (or documented exceptions)
