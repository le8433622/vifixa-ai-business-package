# Skill: Project Initialization

description: "Initialize project structure and verify tools - Step 1"
trigger: "step 1|init|initialize|project structure|verify tools"

## Instructions

Execute Step 1 from /agent.md: Project Initialization

### Tasks:

1. **Read All Source of Truth Docs**:
   - Read all .md files (01-22) + SUPABASE_SPEC.md, VERCEL_SPEC.md, MASTER_SPEC.md
   - Use parallel reads for efficiency

2. **Create Directory Structure**:
   ```
   /supabase/migrations/
   /supabase/functions/
   /supabase/seed.sql
   /mobile/app/(customer)/
   /mobile/app/(worker)/
   /mobile/app/(admin)/
   /web/app/
   /web/components/
   /web/lib/
   /web/app/api/
   /tests/mobile/
   /tests/web/
   /tests/integration/
   ```

3. **Initialize Git Repo** (if not done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit with business docs"
   ```

4. **Verify Shell Tools**:
   - Supabase CLI: `supabase --version`
   - npm: `npm --version`
   - Node.js v18+: `node --version`
   - Expo CLI: `expo --version`
   - Vercel CLI: `vercel --version`

5. **Create .gitignore**:
   - node_modules/
   - .expo/
   - .next/
   - .vercel/
   - .supabase/

### Files to read first:
- /agent.md (Step 1)
- All 01-22 .md files in root directory

### Verification:
- All directories created ✓
- All business docs read ✓
- All tools verified ✓
- .gitignore created ✓
