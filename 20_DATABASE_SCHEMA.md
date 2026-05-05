# Database Schema (Supabase Postgres)
## Profiles Table (linked to Supabase Auth)
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY, REFERENCES auth.users(id) |
| email | TEXT | UNIQUE, NOT NULL |
| phone | TEXT | UNIQUE |
| role | TEXT | NOT NULL (customer/worker/admin) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() |

## Workers Table
| Column | Type | Constraints |
|--------|------|-------------|
| user_id | UUID | PRIMARY KEY, REFERENCES profiles(id) |
| skills | JSONB | NOT NULL |
| service_areas | JSONB | NOT NULL |
| trust_score | INTEGER | DEFAULT 50 |
| is_verified | BOOLEAN | DEFAULT false |
| avg_earnings | NUMERIC | DEFAULT 0 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

## Orders Table
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY DEFAULT gen_random_uuid() |
| customer_id | UUID | REFERENCES profiles(id) |
| worker_id | UUID | REFERENCES workers(user_id) |
| category | TEXT | NOT NULL |
| description | TEXT | NOT NULL |
| media_urls | JSONB | |
| ai_diagnosis | JSONB | |
| estimated_price | NUMERIC | NOT NULL |
| final_price | NUMERIC | |
| status | TEXT | NOT NULL (pending/matched/in_progress/completed/cancelled/disputed) |
| before_media | JSONB | |
| after_media | JSONB | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() |

## AI_Logs Table
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY DEFAULT gen_random_uuid() |
| order_id | UUID | REFERENCES orders(id) |
| agent_type | TEXT | NOT NULL (diagnosis/pricing/matching/quality/dispute/coach/fraud) |
| input | JSONB | NOT NULL |
| output | JSONB | NOT NULL |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

## Trust_Scores Table
| Column | Type | Constraints |
|--------|------|-------------|
| user_id | UUID | PRIMARY KEY, REFERENCES profiles(id) |
| score | INTEGER | NOT NULL |
| last_updated | TIMESTAMPTZ | DEFAULT NOW() |
| history | JSONB | |

## Row Level Security (RLS) Policies
- Profiles: Users can read own profile, workers can read customer profiles for jobs
- Workers: Workers can update own profile, admin can read all
- Orders: Customers see own orders, workers see assigned orders, admin sees all
- AI_Logs: Only admin access
- Storage: Signed URLs for private files, public read for brand assets

## References
- 15_CODEX_BUSINESS_CONTEXT.md
- SUPABASE_SPEC.md
- 05_PRODUCT_SOLUTION.md
- 12_OPERATIONS_AND_TRUST.md
- 22_SECURITY_PLAN.md
