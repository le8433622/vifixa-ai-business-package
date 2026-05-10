# Vifixa AI — Operations Guide

## Deployment

### Supabase
```bash
supabase login
supabase link --project-ref lipjakzhzosrhttsltwo  # prod
supabase db push     # migrate database
supabase functions deploy  # deploy all 35 edge functions
```

### Web (Vercel)
```bash
cd web
vercel --prod   # manual deploy
# OR push to main → GitHub Actions auto-deploys
```

### Mobile (EAS)
```bash
cd mobile
eas build --platform ios --profile production
eas build --platform android --profile production
```

## Environment Variables
| Var | Location | Secret? |
|-----|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Web .env.local | No |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Web .env.local | No |
| `SUPABASE_SERVICE_ROLE_KEY` | Web server-side only | Yes |
| `OPENAI_API_KEY` | Edge Functions only | Yes |
| `STRIPE_SECRET_KEY` | Web server-side | Yes |
| `STRIPE_WEBHOOK_SECRET` | Web server-side | Yes |

## CI/CD Pipeline
| Workflow | Trigger | Action |
|----------|---------|--------|
| `ci.yml` | Every push/PR | Lint → typecheck → quality gates → build → integration tests |
| `deploy-vercel.yml` | Push main/staging | Vercel preview + staging + production |
| `deploy-supabase.yml` | Push supabase/ | Deno check → deploy all functions + migrations |
| `ai-tests.yml` | AI function changes | Lint + integration tests |

## Testing

### Unit Tests
```bash
cd web && npm test           # Jest/React Testing Library
cd mobile && npm test        # Jest/Expo
```

### Integration Tests
```bash
npm test /tests/integration  # Supabase + API integration
```

### E2E Critical Paths
**Customer Flow**: service-request → AI diagnosis → price → accept → complete → review  
**Worker Flow**: accept job → start → upload photos → complete  
**Admin Flow**: verify worker → view complaints → resolve dispute  
**Trust Score**: Complete order → verify trust recalculation  
**Fraud Detection**: Simulate suspicious activity → verify alerts  
**Warranty**: Complete order <30 days → eligible for claim

### Performance Checklist
- Edge Functions respond < 2s (all 7 AI agents)
- Web pages load < 3s (TTFB < 1s)
- Database queries < 100ms (indexed)

### Manual Test Checklist
See `docs/testing/e2e-test-plan.md` for full manual checklist.

## Rollback

### Edge Function Rollback
```bash
supabase functions deploy <function-name> --ref <previous-version>
```

### Database Rollback
```bash
supabase db reset  # local only
# Remote: apply new migration to revert changes
```

See `docs/rollback-plan.md` for detailed procedures.

## Monitoring
| Dashboard | URL |
|-----------|-----|
| Supabase | https://supabase.com/dashboard/project/lipjakzhzosrhttsltwo |
| Vercel | https://vercel.com/le8433622-9187s-projects |
| Stripe | https://dashboard.stripe.com |

## AI KPIs (Target)
| KPI | Target |
|-----|--------|
| Diagnosis Accuracy | ≥80% |
| Price Accuracy | ≥60% |
| Matching Success | ≥50% |
| Fraud Precision | ≥90% |
| Manual Intervention | ≤20% |
| AI Cost/Order | ≤$0.50 |
