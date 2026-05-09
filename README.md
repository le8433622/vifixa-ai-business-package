# Vifixa AI — Business Package

Bộ tài liệu này mô tả đầy đủ dự án kinh doanh **Vifixa AI**.

**Tên thương hiệu đề xuất:** Vifixa AI  
**Tên nội bộ / codename:** VFIX — Vietnam Fix / Verified Fix / Virtual Fix  
**Slogan quốc tế:** Smart services for real life.  
**Slogan tiếng Việt:** Dịch vụ thông minh cho đời sống thật.

## Cách dùng

1. Copy toàn bộ thư mục này vào dự án hoặc Google Drive.
2. Dùng file `00_BUSINESS_PLAN_VIFIXA_AI.docx` làm bản tổng hợp để gửi đối tác/nhà đầu tư.
3. Dùng các file Markdown riêng lẻ để đưa cho Codex, làm website, landing page, tài liệu nội bộ.
4. Dùng `15_CODEX_BUSINESS_CONTEXT.md` để Codex hiểu bối cảnh kinh doanh trước khi lập trình.

## Tài liệu kỹ thuật

- **AI API Docs**: `docs/ai-api.md` — tài liệu API 8 functions (endpoint, request/response, env vars)
- **Rollback Plan**: `docs/rollback-plan.md` — hướng dẫn rollback functions + migrations
- **CI/CD Secrets**: `docs/ci-secrets-guide.md` — cấu hình GitHub secrets
- **Staging & Canary**: `docs/staging-canary.md` — staging project + chiến lược canary
- **Checkpoint**: `docs/CHECKPOINT_SYSTEM_STATE.md` — snapshot hệ thống (tag v0.1.0-payment-smart-system)

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

## Danh sách tài liệu

- `00_BUSINESS_PLAN_VIFIXA_AI.docx`: bản tổng hợp đầy đủ.
- `01_EXECUTIVE_SUMMARY.md`: tóm tắt điều hành.
- `02_MISSION_VISION_VALUES.md`: sứ mệnh, tầm nhìn, giá trị cốt lõi.
- `03_ABOUT_US.md`: giới thiệu về chúng tôi.
- `04_MARKET_PROBLEM.md`: vấn đề thị trường.
- `05_PRODUCT_SOLUTION.md`: giải pháp sản phẩm.
- `06_TARGET_CUSTOMERS.md`: khách hàng mục tiêu.
- `07_BUSINESS_MODEL.md`: mô hình kinh doanh.
- `08_GO_TO_MARKET.md`: chiến lược ra thị trường.
- `09_BRAND_MESSAGING.md`: thương hiệu và thông điệp.
- `10_PRODUCT_ROADMAP.md`: lộ trình sản phẩm.
- `11_AI_OPERATING_MODEL.md`: mô hình vận hành bằng AI.
- `12_OPERATIONS_AND_TRUST.md`: vận hành, kiểm soát chất lượng, niềm tin.
- `13_RISKS_LEGAL_COMPLIANCE.md`: rủi ro, pháp lý, tuân thủ.
- `14_OKR_KPI.md`: OKR và KPI.
- `15_CODEX_BUSINESS_CONTEXT.md`: ngữ cảnh đưa cho Codex/AI lập trình (Supabase + Vercel stack).
- `16_ONE_PAGE_PITCH.md`: bản pitch một trang.
- `17_LANDING_PAGE_COPY.md`: nội dung landing page.
- `18_FINANCIAL_PLAN.md`: kế hoạch tài chính.
- `19_TECHNICAL_ARCHITECTURE.md`: kiến trúc kỹ thuật (Supabase + Vercel).
- `20_DATABASE_SCHEMA.md`: cấu trúc cơ sở dữ liệu (Supabase Postgres).
- `21_API_SPECIFICATION.md`: thông số API (Supabase Edge Functions + Next.js).
- `22_SECURITY_PLAN.md`: kế hoạch bảo mật (Supabase RLS).
- `agent.md`: quy trình bắt buộc cho opencode CLI (tuân thủ 100%).
- `AGENTS.md`: cấu hình khởi động cho opencode CLI.
