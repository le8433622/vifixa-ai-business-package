# Security Plan
## Authentication (Supabase Auth)
- Email/password with secure password requirements
- Phone OTP for worker verification (later)
- Google OAuth for convenience (later)
- Session management via Supabase JS client
- Service role key only for server-side admin operations

## Row Level Security (RLS) Matrix
| Table | Customer | Worker | Admin |
|-------|----------|--------|-------|
| profiles | Own row | Own row + assigned customers | All rows |
| workers | No access | Own row | All rows |
| orders | Own orders | Assigned orders | All orders |
| ai_logs | No access | No access | All rows |
| storage | Own avatars, service-media | Own docs, order-evidence | All buckets |

## Data Protection
- PII (email, phone, address) protected by RLS
- Storage buckets: private by default, signed URLs for access
- No PII in API responses unless explicitly authorized via RLS
- Supabase Postgres encryption at rest

## AI Security
- All AI calls via Supabase Edge Functions, no API keys in mobile/web
- All AI inputs/outputs logged to `ai_logs` table for audit
- AI responses tagged with "Preliminary diagnosis, confirm with technician"
- Edge Functions use environment variables for AI provider keys

## Audit & Compliance
- Sensitive actions logged via Supabase database triggers
- Audit logs in dedicated table, retained 12 months
- GDPR-compliant data deletion: Supabase Auth user deletion cascades
- Export endpoint: `GET /functions/v1/admin/export-user-data`

## Vulnerability Prevention
- All inputs validated with Zod on Edge Functions and client
- Rate limiting via Supabase Auth: 5 auth requests/minute per IP
- CORS restricted to official domains in Supabase config
- Service role key never exposed to client-side code

## Environment Variables (Server-side Only)
```
SUPABASE_SERVICE_ROLE_KEY= (never in mobile/web)
OPENAI_API_KEY= (only in Edge Functions)
AI_PROVIDER=openai
```

## References
- 15_CODEX_BUSINESS_CONTEXT.md
- SUPABASE_SPEC.md
- 13_RISKS_LEGAL_COMPLIANCE.md
- 20_DATABASE_SCHEMA.md
- 21_API_SPECIFICATION.md
