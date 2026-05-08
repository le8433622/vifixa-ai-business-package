# OpenCode Skills Index - Vifixa AI Project

## Tổng quan
Các skills này được thiết kế để hướng dẫn opencode thực hiện 10 bước trong `agent.md` một cách tuần tự và chính xác.

## Danh sách Skills

### Step 1: Project Initialization
- **File**: `project-init.md`
- **Trigger**: step 1|init|initialize|project structure|verify tools
- **Mục tiêu**: Đọc tài liệu, tạo cấu trúc thư mục, kiểm tra tools

### Step 2: Supabase Backend Foundation
- **File**: `supabase-backend.md`
- **Trigger**: step 2|backend|supabase|database schema|edge functions
- **Mục tiêu**: Tạo database, auth, storage, edge functions

### Step 3: Core Backend & Web APIs
- **File**: `web-api.md`
- **Trigger**: step 3|web api|next.js api|customer flow|worker flow|admin flow
- **Mục tiêu**: Tạo API routes, implement các flows

### Step 4: AI Integration
- **File**: `ai-integration.md`
- **Trigger**: step 4|ai integration|ai agents|openai|anthropic|ai-provider
- **Mục tiêu**: Implement 7 AI agents qua Supabase Edge Functions

### Step 5: Mobile Foundation
- **File**: `mobile-foundation.md`
- **Trigger**: step 5|mobile|expo|react native|app/(customer)|app/(worker)|app/(admin)
- **Mục tiêu**: Khởi tạo Expo app với đầy đủ libraries

### Step 6: Mobile & Web Flows
- **File**: `mobile-web-flows.md`
- **Trigger**: step 6|mobile flows|web flows|customer flow|worker flow|admin dashboard
- **Mục tiêu**: Implement tất cả user flows cho mobile và web

### Step 7: Trust & Quality
- **File**: `trust-quality.md`
- **Trigger**: step 7|trust score|quality check|warranty|complaint|before/after photos
- **Mục tiêu**: Trust scores, quality checks, warranties, complaints

### Step 8: Testing & Validation
- **File**: `testing-validation.md`
- **Trigger**: step 8|testing|validation|unit tests|integration tests|e2e tests|okr|kpi
- **Mục tiêu**: Chạy tất cả tests, validate KPIs

### Step 9: Deployment
- **File**: `deployment.md`
- **Trigger**: step 9|deployment|deploy|vercel|supabase deploy|eas build|app store
- **Mục tiêu**: Deploy Supabase, web (Vercel), mobile (App Store/Play Store)

### Step 10: Final Verification
- **File**: `final-verification.md`
- **Trigger**: step 10|final verification|completion|generate report|audit
- **Mục tiêu**: Kiểm tra cuối cùng, generate completion report

## Cách sử dụng

1. Để chạy một step cụ thể, gõ: `/skill <tên-skill>`
2. Hoặc gõ các từ khóa trong trigger để opencode tự động load skill phù hợp
3. Thực hiện theo thứ tự 1 → 2 → ... → 10 nghiêm ngặt

## Lưu ý quan trọng
- Tất cả skills đều tham chiếu đến `/agent.md` làm nguồn chỉ dẫn chính
- Phải hoàn thành 100% một step trước khi chuyển sang step tiếp theo
- Không được bỏ qua bước nào hoặc thay đổi thứ tự
