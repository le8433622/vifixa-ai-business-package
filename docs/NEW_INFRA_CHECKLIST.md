# New Infrastructure Checklist

Checklist này dùng khi build Vifixa sang hạ tầng mới.

## 1. Pre-flight

- [ ] Không còn secrets trong repo.
- [ ] `.env.example` đầy đủ nhưng không chứa giá trị thật.
- [ ] `web` build được từ clean clone.
- [ ] Supabase migrations chạy được trên staging project mới.
- [ ] Edge Functions deploy được trên staging.
- [ ] Vercel preview build pass.
- [ ] Có rollback plan.

## 2. GitHub setup

- [ ] Tạo repo mới hoặc fork sạch.
- [ ] Bật branch protection cho `main`.
- [ ] Required checks:
  - [ ] CI / web-build
  - [ ] CI / edge-check
  - [ ] Vercel preview
- [ ] Tạo GitHub Environments:
  - [ ] staging
  - [ ] production
- [ ] Thêm secrets vào GitHub Environments, không commit vào repo.

## 3. Supabase setup

Tạo project:

```txt
vifixa-staging
vifixa-production
```

Bật và kiểm tra:

- [ ] Auth enabled.
- [ ] Database healthy.
- [ ] RLS enabled trên bảng nghiệp vụ.
- [ ] Edge Functions enabled.
- [ ] Storage buckets nếu dùng upload ảnh/KYC.
- [ ] Realtime nếu dùng location/order activity.

Deploy staging:

```bash
supabase link --project-ref <staging-ref>
supabase db push
supabase functions deploy income-commerce
```

Verify staging:

- [ ] `income-commerce` ACTIVE.
- [ ] `verify_jwt=true`.
- [ ] Supabase security advisor không có lỗi mới từ migration vừa thêm.
- [ ] Case profit âm tạo correction cycle.
- [ ] Case profit dương tạo decision scale/test và không tạo correction cycle.

## 4. Vercel setup

Project settings:

```txt
Framework: Next.js
Install command: npm install && cd web && npm install
Build command: cd web && npm run build
Output directory: web/.next
```

Env vars:

- [ ] Public Supabase URL/key.
- [ ] Server-only keys chỉ đặt ở Vercel env server/runtime nếu route cần.
- [ ] Không đưa service role vào client bundle.

Verify:

- [ ] Preview deploy pass.
- [ ] Production deploy pass.
- [ ] `/api/health` trả OK nếu route tồn tại.
- [ ] Login/register smoke test.

## 5. Mobile setup

- [ ] Expo project mới.
- [ ] EAS configured.
- [ ] Staging env tách production env.
- [ ] Android build preview.
- [ ] iOS build preview nếu cần.

## 6. Data migration

- [ ] Không copy production data sang staging nếu không cần.
- [ ] Mask PII nếu bắt buộc dùng dữ liệu thật.
- [ ] Seed dữ liệu test riêng.
- [ ] Kiểm tra auth triggers/wallet/profile creation.

## 7. Security gates

- [ ] Rotate mọi secret từng bị lộ.
- [ ] Bật RLS cho bảng mới.
- [ ] Không có RLS-enabled table thiếu policy.
- [ ] Không có function thiếu fixed `search_path`.
- [ ] OTP không lưu plaintext ở production.
- [ ] Payment callback xác minh chữ ký.
- [ ] Admin/refund/lock actions có audit.

## 8. Release

```txt
PR -> CI -> staging deploy -> smoke test -> merge main -> production deploy -> post-deploy smoke test
```

Không merge nếu:

- [ ] Web build fail.
- [ ] Supabase migration chưa test staging.
- [ ] Edge Function mới chưa ACTIVE.
- [ ] Advisors có lỗi mới nghiêm trọng do migration mới.
- [ ] Có secret lộ trong repo.

## 9. Post-release

- [ ] Kiểm tra logs 30 phút đầu.
- [ ] Kiểm tra auth/login.
- [ ] Kiểm tra order/payment smoke test nếu có.
- [ ] Kiểm tra income-commerce âm/dương.
- [ ] Ghi checkpoint mới vào docs.
