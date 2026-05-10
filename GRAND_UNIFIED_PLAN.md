# Vifixa AI — Grand Unified PR & Upgrade Plan

**Mục tiêu**: Gộp toàn bộ nhánh, dọn GitHub, nâng cấp toàn diện lên phiên bản xuất sắc nhất.

---

## Phase 0: GitHub Cleanup

### 0.1 Close/Reject Stale PRs
| PR | Branch | State | Action |
|----|--------|-------|--------|
| #9 | `kiểm-tra-setting-dự-án-6b9a5` | OPEN | **Close & reject** — nội dung đã có trong `pr9-settings` (bản cũ, thiếu lint fixes + doc cleanup). Comment lý do. |
| #10 | `plasma-beacon-hovers-20h49-20260509` | MERGED | Đã merge → xoá remote branch. |
| — | `pr10-fix-cicd` | local | Đã merge vào main → xoá local branch. |

### 0.2 Delete Stale Remote Branches
```bash
git push origin --delete kiểm-tra-setting-dự-án-6b9a5    # sau khi close PR #9
git push origin --delete plasma-beacon-hovers-20h49-20260509  # PR #10 đã merge
git push origin --delete pr10-fix-cicd  # đã merged vào main
```

### 0.3 Delete Stale Local Branches
```bash
git branch -D plasma-beacon-hovers-20h49-20260509
git branch -D pr10-fix-cicd
# Giữ lại: main, staging, pr9-settings (sẽ merge)
```

---

## Phase 1: Merge PR #9 Settings → Main

### 1.1 Rebase `pr9-settings` lên `main` mới nhất
```bash
git checkout main && git pull origin main
git checkout pr9-settings
git rebase main
```

### 1.2 Verify không conflict
- `supabase/migrations/` — migration file đã được sửa (xóa old `20240520000000_...`, thêm `20260510000007_...` mới)
- `web/src/app/admin/settings/memberships/page.tsx` — đã fix lint
- `web/src/app/admin/settings/pricing/page.tsx` — đã fix lint
- `supabase/functions/activate-boost/index.ts` — đã fix Deno error handling
- Các functions khác tương tự

### 1.3 Squash commit message
```
feat: Dynamic Pricing & Memberships — migration, Edge Functions, Admin UI, Deno/lint fixes, doc cleanup

- Pricing rules engine (time, location, skill, surge, emergency)
- Membership plans CRUD with billing cycles
- Worker ad packages & boost system
- RLS policies for all new tables
- Fix Deno strict type errors (error instanceof Error)
- Fix React 19 lint errors (set-state-in-effect, no-explicit-any)
- Consolidate 35+ old docs → 4 master docs (BUSINESS, ARCHITECTURE, AI, OPERATIONS)
- Rewrite AGENTS.md, agent.md, README.md
```

### 1.4 Push & Create PR #11
```bash
git push origin pr9-settings
gh pr create --base main --head pr9-settings \
  --title "Dynamic Pricing & Memberships + lint fixes + doc revolution" \
  --body "## Summary
- Dynamic Pricing engine: 6 rule types (time_based, location, skill, emergency, surge, demand)
- Membership system: 4 plans (Basic/Silver/Gold/Platinum) with monthly/yearly billing
- Worker ad/boost packages with activation sessions
- Full Deno lint fixes across 4 edge functions
- React 19 lint compliance (0 errors in both settings pages)
- Doc revolution: deleted 35+ obsolete files, wrote 4 master docs (BUSINESS.md, ARCHITECTURE.md, AI.md, OPERATIONS.md)
- Rewrote AGENTS.md, agent.md, README.md"
```

### 1.5 Merge PR #11
```bash
gh pr merge 11 --squash --delete-branch
```

---

## Phase 2: Comprehensive Upgrade (The "Best in History" Edition)

### 2.1 Quality: Zero Lint Codebase
**Hiện tại**: còn ~30 lint lỗi rải rác (chủ yếu `no-explicit-any`, `no-unused-vars`, `react/no-unescaped-entities`)  
**Mục tiêu**: `npx eslint src/ --no-cache` = 0 errors

| File | Error | Fix |
|------|-------|-----|
| `admin/page.tsx` | unused `err` | Remove or use |
| `admin/users/page.tsx` | hoisting + `any` | Move fetch before effect, fix `any` |
| `admin/workers/page.tsx` | unused imports + `any` | Clean up |
| `admin/orders/page.tsx` | `any` ×2 | `Record<string, unknown>` |
| `admin/complaints/page.tsx` | `any` + unescaped | Fix types |
| `admin/approvals/page.tsx` | `any` ×2 | Fix types |
| `admin/ai-logs/page.tsx` | `any` | Fix types |
| `admin/settings/payments/page.tsx` | `any` ×2 + unescaped | Fix types |
| `admin/settings/payments/[gateway]/page.tsx` | `any` + unused | Fix types |
| `admin/chat-kpis/page.tsx` | `any` + unused | Fix types |
| `admin/price-accuracy/page.tsx` | `any` ×2 | Fix types |
| `admin/disputes/page.tsx` | `any` + unused | Fix types |
| `admin/settings/general/page.tsx` | `any` | Fix types |
| `admin/settings/features/page.tsx` | `any` | Fix types |
| Edge Functions | `error.message` patterns | instanceof guard (đã làm 4, còn ~10) |

### 2.2 Performance: Data Fetching Revolution
**Hiện tại**: `useEffect → fetch data → setState` pattern (warning: `set-state-in-effect`)  
**Mục tiêu**: React 19 data fetching pattern

Các lựa chọn:
- **QueueMicrotask pattern** (đã dùng cho memberships/pricing) — áp dụng cho toàn bộ admin pages
- HOẶC tạo custom hook `useSupabaseQuery` wrapper xử lý lifecycle + caching
- HOẶC tích hợp TanStack Query cho web (đã dùng trong mobile)

**Ưu tiên**: Tạo `web/src/lib/use-supabase-query.ts`:
```ts
export function useSupabaseQuery<T>(
  query: () => Promise<{ data: T | null; error: any }>,
  deps: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(async () => {
      try {
        const { data, error } = await query();
        if (error) throw error;
        setData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    });
  }, deps);

  return { data, loading, error, refetch: /* ... */ };
}
```

### 2.3 Architecture: DRY the Admin Settings
**Hiện tại**: 8 settings pages với code gần như giống hệt nhau (memberships, pricing, payments, gateway, general, features, notifications, security)  
**Mục tiêu**: Tạo reusable components:

- `SettingsTable` — generic table with loading/empty states
- `SettingsDialog` — generic CRUD dialog
- `SettingsToggle` — switch with loading state
- `SettingsPage` — page layout wrapper

### 2.4 Security: RLS Audit
**Hiện tại**: 37 migrations, RLS policies rải rác  
**Mục tiêu**: 
- Script audit: `SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false;`
- Ensure ALL public tables have RLS enabled
- Ensure no table allows public write without auth

### 2.5 Testing: Coverage to 80%
**Hiện tại**: Unit tests cho 1 số functions, integration tests cho AI  
**Mục tiêu**:
- Unit test coverage cho tất cả Edge Functions (35 functions × ít nhất 1 test)
- Unit test cho tất cả admin pages (smoke tests)
- E2E critical paths (Playwright)

### 2.6 Error Handling: Unified Pattern
**Hiện tại**: `catch (error: any)` rải rác, message lỗi không nhất quán  
**Mục tiêu**:
- `catch (err)` + `err instanceof Error ? err.message : '...'` — đồng bộ toàn bộ codebase
- Unified error toast format (tiếng Việt nhất quán)
- Edge Functions trả về `{ success: boolean, error?: string }` format chuẩn

### 2.7 Deployment: Zero-Downtime
**Hiện tại**: Supabase functions deploy tất cả cùng lúc (risk downtime)  
**Mục tiêu**:
- Canary deploy cho Edge Functions
- Database migration có backward-compatible checks
- Rollback script tự động

---

## Timeline

| Phase | Tasks | Est. Effort |
|-------|-------|-------------|
| **0** — GitHub Cleanup | Close PR #9, delete stale branches | 15 phút |
| **1** — Merge PR #11 | Rebase, squash, push, merge | 30 phút |
| **2.1** — Zero Lint | Fix 15+ files, 30+ errors | 2-3 giờ |
| **2.2** — useSupabaseQuery hook | Tạo custom hook, refactor 15+ pages | 3-4 giờ |
| **2.3** — DRY Admin | Tạo reusable components | 4-6 giờ |
| **2.4** — RLS Audit | Script + fix policies | 1 giờ |
| **2.5** — Testing | Unit tests + E2E | 6-8 giờ |
| **2.6** — Error Handling | Đồng bộ pattern toàn bộ | 2 giờ |
| **2.7** — Zero-Downtime | Canary + rollback | 2 giờ |

**Tổng**: ~20-25 giờ dev time
