# 🛡️ Vifixa AI — Security Hardening Guide

> OWASP Web/API/LLM/Agentic · Stripe · Supabase · Expo · Vercel
> Cập nhật: 2026-05-17

---

## 🔴 Zero Tolerance Policy

| Code | Violation | Detection |
|------|-----------|-----------|
| SEC-001 | API key/secret trong frontend code | Pre-commit grep |
| SEC-002 | Edge Function thiếu `verifyAuth()` | Code review |
| SEC-003 | Admin routes trong customer/worker code | Pre-commit grep |
| SEC-004 | `@ts-nocheck` / `@ts-ignore` | Pre-commit grep |
| SEC-005 | `console.log` trong frontend code | Pre-commit grep |
| SEC-006 | service_role key leak vào frontend | Pre-commit grep |
| SEC-007 | Log không prefix `[VIFIXA]` | Pre-commit grep |
| SEC-008 | Secrets trong migration files | Code review |

---

## OWASP Top 10 (Web)

| # | Risk | Vifixa Status | Mitigation |
|---|------|---------------|------------|
| 1 | Broken Access Control | ✅ RLS + verifyAuth() | `is_admin_from_jwt()` helper, role check mọi Edge Function |
| 2 | Cryptographic Failures | ✅ HTTPS forced | bcrypt passwords, HMAC-SHA512 for VNPay |
| 3 | Injection (SQL/NoSQL/XSS) | ✅ Zod + Supabase | Zod validation mọi input, parameterized queries |
| 4 | Insecure Design | ✅ Event-driven | Workflow engine, service registry pattern |
| 5 | Security Misconfiguration | ⚠️ Audit monthly | Pre-commit grep, CI/CD scan |
| 6 | Vulnerable Components | 🔄 Run monthly | npm audit, deno audit, Snyk |
| 7 | Auth Failures | ✅ Implemented | verifyAuth() mọi Edge Function, session timeout |
| 8 | Data Integrity | ✅ RLS + Ledger | RLS trên mọi bảng, double-entry bookkeeping |
| 9 | Logging & Monitoring | ✅ Standardized | `[VIFIXA]` log prefix, `ai_logs` table |
| 10 | SSRF | ⚠️ Cần audit | Validate fetch URLs, user không tự chọn URL |

---

## OWASP API Security Top 10

| # | Risk | Status | Mitigation |
|---|------|--------|------------|
| 1 | Broken Object Level Auth | ✅ | RLS + verifyAuth() user match |
| 2 | Broken User Auth | ✅ | Supabase Auth + JWT |
| 3 | Excessive Data Exposure | ✅ | Zod response filtering |
| 4 | Lack of Resources & Rate Limiting | ✅ | verifyAuth() default 20 req/min |
| 5 | Broken Function Level Auth | ✅ | Role check mọi Edge Function |
| 6 | Mass Assignment | ✅ | Zod input validation |
| 7 | Security Misconfiguration | ⚠️ | CORS, CSP headers audit |
| 8 | Injection | ✅ | Zod + parameterized queries |
| 9 | Improper Assets Management | ⚠️ | API versioning cần review |
| 10 | Insufficient Logging & Monitoring | ✅ | `[VIFIXA]` logs + `ai_logs` |

---

## OWASP LLM Top 10 (GenAI)

| # | Risk | Status | Mitigation |
|---|------|--------|------------|
| LLM01 | **Prompt Injection** | ⚠️ Partial | `sanitizeSystemPrompt()` — cần input/output guard |
| LLM02 | **Sensitive Info Disclosure** | ⚠️ Partial | No secrets in prompts — cần output filter |
| LLM03 | Supply Chain | ✅ | NVIDIA NIM + Supabase — trusted providers |
| LLM04 | Data Poisoning | ⚠️ Partial | User feedback loop — cần garbage-in guard |
| LLM05 | Improper Output Handling | ✅ | Zod schema validation on AI output |
| LLM06 | **Excessive Agency** | 🔴 P0 | service_role key leak = unlimited agency — cần fix |
| LLM07 | System Prompt Leakage | ⚠️ Partial | Sanitize blocks known patterns — cần review |
| LLM08 | Vector Weaknesses | ✅ | Not using vectors yet |
| LLM09 | **Misinformation** | ⚠️ Partial | Web search grounding — cần confidence scores |
| LLM10 | Unbounded Consumption | ✅ | Rate limiting 20 req/min/user |

---

## OWASP Agentic AI Security

| Risk | Status | Mitigation |
|------|--------|------------|
| Tool Misuse | ⚠️ | workflow-engine gọi AI với service_role key — function-specific key needed |
| Agent-to-Agent Poisoning | ⚠️ | AI function outputs chưa validate cross-function |
| Excessive Agency | 🔴 P0 | auto-executor có thể approve KYC không Vision AI |
| Data Leakage via Tools | ⚠️ | AI logs có thể chứa sensitive data |
| Insecure Output Handling | ✅ | Zod validation |
| Agent Sprawl | ⚠️ | 3 luồng AI chat song song — cần consolidate |

---

## Supabase Security

### RLS (Row Level Security)
- [x] All public tables have RLS enabled
- [x] `is_admin_from_jwt()` — admin check không recursion
- [x] 24+ policies converted to JWT pattern
- [ ] **AUDIT**: 11+ SECURITY DEFINER functions cần review

### Edge Functions
- [x] `verifyAuth()` on all functions
- [x] Zod input validation
- [x] Rate limiting (20 req/min default)
- [ ] **FIX P0-05**: workflow-engine không gửi service_role_key qua Bearer

### Database
- [x] Parameterized queries (Supabase client)
- [x] No raw SQL in Edge Functions
- [ ] **AUDIT**: SECURITY DEFINER functions migration plan

---

## Stripe Security

### Webhook Verification
- [ ] **FIX P0-04**: Signature check `sig.length > 0` → `compare()` thật
```typescript
// CẦN FIX — hiện tại (SAI):
const sig = req.headers.get('stripe-signature') || ''
if (sig.length === 0) { /* ... */ }
// → KHÔNG verify signature thật!

// Fix:
import Stripe from 'stripe'
const event = Stripe.webhooks.constructEvent(
  body,  // raw body (Uint8Array)
  sig,
  stripeWebhookSecret
)
```

### Idempotency
- [x] `stripe-payment-intent`: DB idempotency_keys + Stripe Idempotency-Key
- [x] `stripe-webhook`: webhook_events table check duplicate
- [ ] **AUDIT**: `payment-process` gateway key dùng Date.now() — cần UUID

### Connect
- [x] Zod validation worker_id, email, country
- [x] verifyAuth() + user == worker_id match
- [ ] **AUDIT**: Auto-payout → debit wallet + ledger

---

## VNPay Security

- [x] HMAC-SHA512 signature verification
- [x] IPN + Return flow
- [ ] **FIX P0-08**: Key naming mismatch (tmn_code vs tmnCode vs hash_secret)
- [ ] **FIX P0-08**: Remove sandbox secrets from migration files

---

## Expo Mobile Security

- [x] Expo Push Notification tokens (not raw device tokens)
- [ ] **AUDIT**: Secure storage cho JWT (expo-secure-store)
- [ ] **AUDIT**: Background location permission flow
- [ ] **AUDIT**: No secrets in mobile bundle

---

## Vercel Deployment

- [x] Environment variables in Vercel dashboard (not in code)
- [x] Cron jobs (anomaly-detector, ai-scheduler, cleanup)
- [ ] **AUDIT**: CSP headers trong next.config.js

---

## Internal Auth Architecture

```
Current (SAI):
  workflow-engine → Bearer: SUPABASE_SERVICE_ROLE_KEY → AI functions
  → AI functions accept ANY key that matches service_role
  → Full DB access exposed

Target (ĐÚNG):
  workflow-engine → Bearer: CRON_SECRET → AI functions
  AI functions check: verifyAuth() accepts either:
    - User JWT (for human calls)
    - CRON_SECRET (for internal/workflow calls)
  → Limited scope, revocable
```

---

## Audit Trail Requirements

| Event | Log Destination | Retention |
|-------|----------------|-----------|
| AI call (user) | `ai_logs` table | 90 days |
| AI call (internal) | `ai_logs` table | 90 days |
| Payment transaction | `ledger` table | Permanent |
| Stripe webhook | `webhook_events` table | 90 days |
| Workflow state change | `orders.status` history | Permanent |
| Admin action | `worker_locks` + notifications | 90 days |
| Cron job run | `cron_job_log` table | 30 days |
| Auth attempt | Supabase Auth logs | 30 days |

---

## Security Checklist (Pre-deploy)

### Auth & Authorization
- [ ] Mọi page có auth guard (session check trong layout)
- [ ] Mọi Edge Function có `verifyAuth()` + role check
- [ ] Mọi query filter theo `user_id`
- [ ] KHÔNG admin routes trong customer/worker code
- [ ] KHÔNG service_role key trong frontend
- [ ] SECURITY DEFINER functions reviewed

### Code Quality
- [ ] KHÔNG `@ts-nocheck` / `@ts-ignore`
- [ ] Zod schema validation trên mọi API input
- [ ] KHÔNG `console.log` trong production code
- [ ] Rate limiting active (20 req/min default)

### Payment Security
- [ ] VNPay: HMAC-SHA512 verify
- [ ] Stripe webhook: signature compare() thật
- [ ] Idempotency: DB + Stripe Idempotency-Key
- [ ] Ledger: double-entry — mọi giao dịch = 1 debit + 1 credit
- [ ] Secrets trong Supabase Secrets, không trong migration/code

### AI Safety
- [ ] System prompt sanitization
- [ ] Rate limit AI calls
- [ ] Audit log mọi AI interaction
- [ ] Output Zod validation
- [ ] Internal auth không dùng service_role key

### Zero Tolerance Grep
```bash
grep -rn "API_KEY\|SECRET" web/src/app/ mobile/src/      # SEC-001
grep -rn "@ts-nocheck\|@ts-ignore" web/src/ mobile/src/   # SEC-004
grep -rn "console.log" web/src/app/                        # SEC-005
grep -rn "service_role" web/src/ mobile/src/               # SEC-006
grep -rn "/admin/" web/src/app/customer/ mobile/src/       # SEC-003
grep -rn "console.log" supabase/functions/ | grep -v "\[VIFIXA\]"  # SEC-007
```
