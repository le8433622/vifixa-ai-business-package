# Vifixa AI — Business Package

Bộ tài liệu này mô tả đầy đủ dự án kinh doanh **Vifixa AI**.

**Tên thương hiệu đề xuất:** Vifixa AI  
**Tên nội bộ / codename:** VFIX — Vietnam Fix / Verified Fix / Virtual Fix  
**Slogan quốc tế:** Smart services for real life.  
**Slogan tiếng Việt:** Dịch vụ thông minh cho đời sống thật.

## Cách dùng

1. Copy toàn bộ thư mục này vào dự án hoặc Google Drive.
2. Dùng file `docs/specs/00_BUSINESS_PLAN_VIFIXA_AI.docx` làm bản tổng hợp để gửi đối tác/nhà đầu tư.
3. Dùng các file Markdown trong thư mục `docs/specs/` để đưa cho Codex, làm website, landing page, tài liệu nội bộ.
4. Dùng `docs/specs/15_CODEX_BUSINESS_CONTEXT.md` để Codex hiểu bối cảnh kinh doanh trước khi lập trình.

## Tài liệu kỹ thuật

- **AI API Docs**: `docs/ai-api.md` — tài liệu API 8 functions (endpoint, request/response, env vars)
- **Rollback Plan**: `docs/rollback-plan.md` — hướng dẫn rollback functions + migrations
- **CI/CD & Secrets**: `docs/ci-secrets-guide.md` — environments, secrets, workflows, branch protection
- **Staging & Canary**: `docs/staging-canary.md` — staging project + chiến lược canary
- **Checkpoint**: `docs/CHECKPOINT_SYSTEM_STATE.md` — snapshot hệ thống (tag v0.1.0-payment-smart-system)

## CI/CD Pipeline

| Workflow | Trigger | What it does |
|---|---|---|
| `ci.yml` | Every push/PR | Lint, typecheck, quality gates, build, integration tests |
| `deploy-vercel.yml` | Push main/staging, PR | Vercel preview + staging + production |
| `deploy-supabase.yml` | Push supabase/ changes | Deno check + all edge functions + migrations |
| `ai-tests.yml` | AI function changes | Lint + integration tests |

See `docs/ci-secrets-guide.md` for full secrets & environments setup.

## Quick Start (Developers)

```bash
# 1. Clone & install
npm install  # web
cd mobile && npx expo install  # mobile

# 2. Supabase setup
supabase login
supabase link --project-ref lipjakzhzosrhttsltwo
supabase db pull

# 3. Env files
cp web/.env.local.example web/.env.local
# Edit .env.local with your keys

# 4. Run
cd web && npm run dev
cd mobile && npx expo start
```

- `docs/CHECKPOINT_SYSTEM_STATE.md`: **[QUAN TRỌNG]** Trạng thái hiện tại của toàn bộ hệ thống (Single Source of Truth). Đọc file này để nắm bắt tiến độ và các endpoint.
- `docs/specs/`: Chứa toàn bộ các file đặc tả dự án từ `00_...` đến `24_...` (Business Plan, API, Database, UI, v.v.).
- `docs/archive/`: Chứa các báo cáo tiến độ cũ (Completion Report, Final Status, v.v.).
- `docs/testing/`: Chứa các kịch bản kiểm thử (E2E, Performance, Security).
- `agent.md`: quy trình bắt buộc cho AI Agents / opencode CLI (tuân thủ 100%).
- `AGENTS.md`: cấu hình khởi động cho opencode CLI.
