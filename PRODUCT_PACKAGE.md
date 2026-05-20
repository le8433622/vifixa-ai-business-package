# Vifixa AI Product Package

> Mục tiêu: đóng gói repo thành bộ sản phẩm có thể dựng lại trên hạ tầng mới gồm GitHub, Supabase, Vercel và mobile build.

## 1. Sản phẩm đang đóng gói

Vifixa hiện là nền tảng AI-native gồm:

```txt
Web Admin / Customer / Worker portal
Mobile app Expo
Supabase database + Edge Functions
Income Commerce OS core
Agent OS policy/action foundation
Payment, map, trust, notification, admin modules
```

## 2. Nguyên tắc đóng gói

1. Không commit secrets.
2. Không phụ thuộc máy cá nhân.
3. Build được từ clean clone.
4. Supabase migration chạy được từ đầu.
5. Vercel build không phụ thuộc cấu hình thủ công ngoài env.
6. Edge Functions deploy được độc lập.
7. Có staging trước production.
8. Có rollback và checklist xác minh.

## 3. Repo layout chuẩn

```txt
.
├── web/                         # Next.js app
├── mobile/                      # Expo app
├── supabase/
│   ├── migrations/              # Database schema
│   ├── functions/               # Edge Functions
│   └── seed.sql                 # Optional seed data
├── docs/                        # Product / technical docs
├── scripts/                     # Infra verification scripts
├── .github/workflows/           # CI/CD
├── vercel.json                  # Vercel build config
├── package.json                 # Root orchestration scripts
├── .env.example                 # Root env template
└── PRODUCT_PACKAGE.md           # This file
```

## 4. Hạ tầng mới cần chuẩn bị

### GitHub

- Repository mới hoặc fork sạch.
- Branch protection cho `main`.
- Required checks: CI, Vercel Preview, Supabase dry-run if available.
- Secrets chỉ lưu trong GitHub Environments, không lưu trong code.

### Supabase

Tạo 2 project:

```txt
vifixa-staging
vifixa-production
```

Bật:

```txt
Auth
Postgres
RLS
Edge Functions
Storage nếu dùng upload
Realtime nếu dùng tracking/order activity
```

### Vercel

Tạo project trỏ repo này.

Cấu hình build:

```txt
Install command: npm install && cd web && npm install
Build command: cd web && npm run build
Output directory: web/.next
Framework: Next.js
```

### Mobile / Expo

- Tạo Expo project riêng.
- Cấu hình EAS secrets.
- Không dùng production Supabase trong dev build.

## 5. Env tối thiểu

Tạo các file từ template:

```bash
cp .env.example .env.local
cp web/.env.local.example web/.env.local
```

Các nhóm biến bắt buộc:

```txt
Supabase URL / publishable key
Supabase service role chỉ dùng server/Edge Function
AI provider keys
Payment gateway keys
Map provider keys
Twilio/SMS nếu dùng OTP
Vercel project/team IDs nếu dùng CLI deploy
```

## 6. Build từ clean clone

```bash
git clone <repo-url>
cd vifixa-ai-business-package
npm install
cd web && npm install && npm run build
```

Mobile:

```bash
cd mobile
npm install
npx expo start
```

Supabase local/dry run:

```bash
supabase link --project-ref <staging-ref>
supabase db push --dry-run
supabase functions deploy income-commerce --project-ref <staging-ref>
```

## 7. Kiểm tra đóng gói

Chạy:

```bash
npm run package:check
npm run test:web
npm run test:supabase
```

Nếu thiếu command trong môi trường mới, dùng checklist thủ công trong `docs/NEW_INFRA_CHECKLIST.md`.

## 8. Quy trình release

```txt
feature branch
→ PR
→ CI pass
→ Vercel preview pass
→ Supabase staging migration
→ Edge Functions staging deploy
→ smoke test
→ merge main
→ production deploy
→ post-deploy smoke test
```

## 9. Rollback

Web:

```txt
Rollback deployment trong Vercel dashboard.
```

Supabase:

```txt
Không sửa production trực tiếp nếu migration chưa qua staging.
Migration destructive phải có rollback migration riêng.
```

Edge Function:

```txt
Deploy lại version cũ hoặc rollback qua Supabase dashboard.
```

## 10. Definition of Done

Một bản package được coi là sẵn sàng build sang hạ tầng mới khi:

- Clean clone build được web.
- Supabase migrations apply được trên staging trống.
- Edge Functions deploy được.
- Không có secrets trong repo.
- `.env.example` đầy đủ.
- Vercel preview success.
- Có smoke test âm/dương cho Income Commerce OS.
- Có checklist release/rollback.
