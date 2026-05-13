# Lộ trình Vận hành Thử — Vifixa AI

## Giai đoạn 1: Fix critical bugs (đang làm dở)

| # | Bug | File | Status |
|---|-----|------|--------|
| 1 | Worker dashboard crash: `e.filter is not a function` | `worker/page.tsx` | ✅ Fixed |
| 2 | Worker verify form lỗi "Có lỗi xảy ra" (thiếu cột `id_number`, `address`) | `worker/verify/page.tsx` | ✅ Fixed + migration |
| 3 | Worker profile không edit được phone | `worker/profile/page.tsx` | ✅ Fixed |
| 4 | Worker verify phone bị `disabled` | `worker/verify/page.tsx` | ✅ Fixed |
| 5 | ToS link `#` không đi đâu | `worker/verify/page.tsx` | ✅ Fixed → `/terms` |
| 6 | Vercel thiếu env vars (0 biến) | — | ✅ Added 7 vars |

---

## Giai đoạn 2: Vận hành thử — Khách hàng (Customer)

### 2A. Web App (`/customer/*`)

| # | Chức năng | Trang | Luồng kiểm thử | API/Gọi |
|---|-----------|-------|----------------|---------|
| 1 | **Đăng ký** | `/register` | Điền email, password, phone, chọn "Khách hàng" → submit → alert thành công → redirect `/login` | `POST /api/ai/auth-register` |
| 2 | **Đăng nhập** | `/login` | Nhập email/password → redirect `/customer` | `POST /api/ai/auth-login` |
| 3 | **Dashboard khách** | `/customer` | Xem thống kê đơn hàng, thiết bị, quick actions | `supabase.from('orders').select(...)`, `supabase.from('devices')` |
| 4 | **Chat AI chẩn đoán** | `/customer/chat` | Gõ tin nhắn → AI trả lời → tạo đơn dịch vụ → confirm → redirect | `POST /api/ai/ai-chat` + `POST /api/ai/ai-diagnose` |
| 5 | **Chat voice** | `/customer/chat` | Bấm microphone → nói → transcript → AI xử lý | Web Speech API + `POST /api/ai/ai-chat` |
| 6 | **Chat upload ảnh** | `/customer/chat` | Upload ảnh thiết bị hỏng → AI nhận diện | `supabase.storage` + `POST /api/ai/ai-diagnose` |
| 7 | **Chat location** | `/customer/chat` | Gửi vị trí → AI gán vào đơn | Geolocation API |
| 8 | **Tạo đơn dịch vụ** | `/customer/chat` → flow | AI tạo action card → user confirm → tạo `orders` record | `POST /api/ai/customer-requests` |
| 9 | **Xem danh sách đơn** | `/customer/orders` | Filter theo status (pending/matched/in_progress/completed/cancelled) | `supabase.from('orders').select()` |
| 10 | **Xem chi tiết đơn + review** | `/customer/orders/[id]` | Xem thông tin thợ, giá, trạng thái; viết đánh giá (sao + comment) | `supabase.from('orders').update({rating, review_comment})` |
| 11 | **Bảo hành** | `/customer/warranty/[orderId]` | Kiểm tra thời hạn bảo hành, tạo yêu cầu | `supabase.from('orders')` + `POST /api/ai/ai-warranty` |
| 12 | **Khiếu nại** | `/customer/complaint` | Chọn đơn hoàn thành → chọn loại khiếu nại → mô tả → gửi | `POST /api/ai/ai-dispute` + `supabase.from('complaints')` |
| 13 | **Yêu cầu dịch vụ** | `/customer/service-request` | Form tạo yêu cầu dịch vụ thủ công | `supabase.from('customer_service_requests')` |
| 14 | **Quản lý thiết bị** | `/customer/devices` | Xem danh sách thiết bị đã đăng ký | `supabase.from('devices')` |
| 15 | **Thêm thiết bị** | `/customer/devices/add` | Nhập loại, hãng, model, ngày mua | `supabase.from('devices').insert()` |
| 16 | **Profile khách** | `/customer/profile` | Sửa tên, phone, email, đổi mật khẩu | `supabase.from('profiles').update()` + `supabase.auth.updateUser()` |
| 17 | **Cài đặt** | `/customer/settings` | Tùy chỉnh thông báo, ngôn ngữ, v.v. | `supabase.from('user_preferences')` |

### 2B. Mobile App (`(customer)/*`)

| # | Chức năng | Màn hình | Ghi chú |
|---|-----------|----------|---------|
| 1-17 | Giống web (tương ứng) | — | — |
| 18 | **Dashboard mobile** | `index.tsx` | Compact UI, bottom tab nav |

---

## Giai đoạn 3: Vận hành thử — Thợ (Worker)

### 3A. Web App (`/worker/*`)

| # | Chức năng | Trang | Luồng kiểm thử |
|---|-----------|-------|----------------|
| 1 | **Đăng ký thợ** | `/register` | Chọn "Thợ" → nhập đầy đủ → login |
| 2 | **Dashboard thợ** | `/worker` | Xem earnings, jobs gần đây, trust score, badge |
| 3 | **Xác minh thợ (quan trọng)** | `/worker/verify` | Nhập phone, CMND/CCCD, địa chỉ → check ToS → submit → chờ duyệt |
| 4 | **Danh sách việc** | `/worker/jobs` | Xem jobs được match (pending/matched/in_progress/completed) |
| 5 | **Chi tiết việc + nhận việc** | `/worker/jobs/[id]` | Xem thông tin khách, báo giá → "Nhận việc" → chuyển `in_progress` |
| 6 | **Cập nhật trạng thái** | `/worker/jobs/[id]` | Upload ảnh trước/sau, cập nhật `completed` |
| 7 | **Lịch sử** | `/worker/history` | Xem các việc đã hoàn thành |
| 8 | **Thu nhập** | `/worker/earnings` | Xem tổng thu nhập, biểu đồ |
| 9 | **AI Coach** | `/worker/coach` | Chat với AI để được hướng dẫn sửa chữa |
| 10 | **Trust score** | `/worker/trust` | Xem điểm uy tín, upload CMND/CCCD |
| 11 | **Huy hiệu Premium** | `/worker/badges` | Mua/vô hiệu huy hiệu (Silver/Gold/Platinum) |
| 12 | **Profile thợ** | `/worker/profile` | Sửa skills, service areas, phone |
| 13 | **Cài đặt** | `/worker/settings` | Tùy chỉnh thông báo |
| 14 | **Subscription** | `/worker/subscription` | Xem gói, thanh toán định kỳ |

### 3B. Mobile App (`(worker)/*`)

| # | Chức năng | Màn hình |
|---|-----------|----------|
| 1-14 | Giống web (tương ứng) | — |

---

## Giai đoạn 4: Vận hành thử — Admin

### 4A. Web App (`/admin/*`)

| # | Chức năng | Trang | Luồng kiểm thử |
|---|-----------|-------|----------------|
| 1 | **Dashboard admin** | `/admin` | Xem thống kê: users, workers, orders, AI calls |
| 2 | **Quản lý Users** | `/admin/users` | Xem danh sách, tìm kiếm, filter role |
| 3 | **Quản lý Thợ** | `/admin/workers` | Xem danh sách thợ, trust score, xác minh |
| 4 | **Xác minh thợ** | `/admin/workers` | Duyệt/từ chối hồ sơ xác minh |
| 5 | **Quản lý Đơn hàng** | `/admin/orders` | Xem tất cả đơn, filter, gán thợ |
| 6 | **Khiếu nại** | `/admin/disputes` | Xem và xử lý khiếu nại |
| 7 | **AI Logs** | `/admin/ai-logs` | Xem lịch sử gọi AI (diagnose, price, match) |
| 8 | **AI Approvals** | `/admin/approvals` | Duyệt/từ chối đề xuất tự động của AI |
| 9 | **Chat KPIs** | `/admin/chat-kpis` | Funnel conversion, drop-off reports |
| 10 | **Price Accuracy** | `/admin/price-accuracy` | So sánh giá AI dự đoán vs thực tế |
| 11 | **Cài đặt chung** | `/admin/settings/general` | Tên app, mô tả, logo |
| 12 | **Cài đặt AI** | `/admin/settings/ai` | Cấu hình model, prompt, agent |
| 13 | **Cài đặt Features** | `/admin/settings/features` | Bật/tắt feature flags |
| 14 | **Cài đặt Memberships** | `/admin/settings/memberships` | Giá gói, quyền lợi |
| 15 | **Cài đặt Payments** | `/admin/settings/payments` | Cấu hình cổng thanh toán |
| 16 | **Cài đặt Pricing** | `/admin/settings/pricing` | Bảng giá động |
| 17 | **Cài đặt Security** | `/admin/settings/security` | Rate limit, IP block |
| 18 | **Cài đặt Notifications** | `/admin/settings/notifications` | Email/SMS template |
| 19 | **Cài đặt Wallet** | `/admin/settings/wallet` | Quản lý ví |
| 20 | **Cài đặt chi tiết gateway** | `/admin/settings/payments/[gateway]` | Stripe/MoMo/VNPay/ZaloPay config |

---

## Giai đoạn 5: Thanh toán (làm sau cùng)

| # | Chức năng | Edge Function | Luồng |
|---|-----------|---------------|-------|
| 1 | **Stripe Checkout** (subscription) | `stripe-checkout` | Worker chọn gói → tạo session → redirect Stripe → webhook xác nhận |
| 2 | **Stripe Connect** (worker payout) | `stripe-connect` | Worker đăng ký nhận tiền → Stripe Express onboarding |
| 3 | **Stripe Payment Intent** (1 lần) | `stripe-payment-intent` | Khách thanh toán đơn dịch vụ |
| 4 | **Stripe Webhook** | `stripe-webhook` | Xử lý sự kiện từ Stripe |
| 5 | **Cổng VNPay** | `payment-process` + VNPay adapter | Thanh toán VND |
| 6 | **Cổng MoMo** | `payment-process` + MoMo adapter | Thanh toán VND |
| 7 | **Cổng ZaloPay** | `payment-process` + ZaloPay adapter | Thanh toán VND |
| 8 | **Cổng Mock** (test) | `payment-process` + mock adapter | Test không tốn tiền |
| 9 | **Premium Badge** | `purchase-premium-badge` | Mua huy hiệu (Silver/Gold/Platinum) |
| 10 | **Ad Package** | `purchase-ad-package` | Mua gói quảng cáo |
| 11 | **Wallet** | `wallet-manager` | Nạp/rút ví điện tử |
| 12 | **Create Subscription** | `create-subscription` | Tạo subscription mới |
| 13 | **Manage Subscription** | `subscription-manage` | Hủy/gia hạn subscription |
| 14 | **Tính giá động** | `calculate-dynamic-price` | Tính giá theo cung cầu |
| 15 | **Tính giá Demand** | `calculate-demand-pricing` | Giá theo nhu cầu thị trường |

---

## Giai đoạn 6: Data Test (1000 users)

Script sql/csv thêm:

- 400 Khách hàng (customer) — ngẫu nhiên email, phone, tên
- 400 Thợ (worker) — có skills, service_areas, trust_score  
- 200 Admin (admin) — email @vifixa.com
- 1000 đơn hàng (orders) — gán ngẫu nhiên customer + worker
- 500 đánh giá (reviews)
- 100 khiếu nại (complaints)
- 10,000 tin nhắn chat (messages)

Lĩnh vực đầy đủ: electricity, plumbing, appliance, air_conditioning, camera, painting, lock_smith, carpentry, cleaning, hvac

Khu vực: HCM (quận 1-12, Bình Thạnh, Phú Nhuận, Gò Vấp), Hà Nội, Đà Nẵng

---

## Giai đoạn 7: 100 Kịch bản Test

### Khách hàng (35 kịch bản)
1. Đăng ký → login → dashboard hiển thị đúng
2. Chat AI → chẩn đoán → tạo đơn → xem đơn trong danh sách
3. Chat với voice input → nhận diện đúng
4. Chat upload ảnh → AI phân tích ảnh
5. Chat gửi location → AI dùng đúng vị trí
6. Tạo đơn thủ công qua service request
7. Hủy đơn đang pending
8. Xem chi tiết đơn → thấy thông tin thợ
9. Đánh giá thợ 5 sao → trust score thay đổi
10. Đánh giá thợ 1 sao + comment
11. Khiếu nại đơn hoàn thành → admin nhận được
12. Xem bảo hành → còn hạn / hết hạn
13. Thêm thiết bị mới → xuất hiện trong danh sách
14. Sửa profile (tên, phone) → lưu thành công
15. Đổi mật khẩu → logout → login mật khẩu mới
16. Đăng ký với referral code → code được ghi nhận
17. Chat tạo đơn → không confirm → đơn không được tạo
18. Upload ảnh không hợp lệ → báo lỗi
19. Nhập số điện thoại sai format → validation
20. Filter đơn theo status
21. Tìm kiếm đơn theo ID
22. Xem thông báo → click → đi đúng page
23. Chat gửi nhiều ảnh cùng lúc
24. Chat → AI hỏi thông tin → trả lời → tạo đơn
25. Chat → AI đề xuất thợ → chấp nhận → order matched
26. Đăng ký với email đã tồn tại → báo lỗi
27. Login sai password → báo lỗi
28. Quên mật khẩu → reset → login lại
29. Xem warranty → tạo yêu cầu bảo hành
30. Tạo đơn → thợ nhận → theo dõi realtime status
31. Tạo đơn → không thợ nào nhận → thông báo
32. Profile → xem thống kê cá nhân
33. Settings → bật/tắt thông báo
34. Logout → không truy cập được trang cần auth
35. Customer dashboard → số liệu đúng

### Thợ (35 kịch bản)
1. Đăng ký thợ → login → redirect verify page
2. Verify form: nhập phone, CMND, địa chỉ → submit → "pending"
3. Verify: không check ToS → báo lỗi
4. Dashboard thợ → earnings, jobs, trust score đúng
5. Xem danh sách jobs → filter theo status
6. Nhận job → status chuyển "in_progress"
7. Cập nhật job: upload before/after ảnh → complete
8. Từ chối job → job quay lại pool
9. Lịch sử → các job đã hoàn thành
10. Thu nhập → tổng đúng, biểu đồ hiển thị
11. AI Coach → chat hỏi kỹ thuật → AI trả lời
12. Trust score → xem điểm, upload CMND
13. Upload ID thành công → admin duyệt
14. Huy hiệu Premium → mua → active
15. Huy hiệu → hủy active → trở lại thường
16. Profile → sửa skills → lưu
17. Profile → sửa service areas → lưu
18. Profile → sửa phone → lưu
19. Settings → tùy chỉnh thông báo
20. Subscription → xem gói → chọn gói → redirect Stripe
21. Subscription → hủy → không còn premium
22. Xem chi tiết đơn → thông tin khách hàng đầy đủ
23. Báo giá lại → khách đồng ý → cập nhật
24. Worker verify → admin reject → sửa lại → gửi lại
25. Worker verify → admin approve → is_verified = true
26. Xem job detail → liên hệ khách qua phone
27. Hoàn thành job → tiền cộng vào earnings
28. Earnings → filter theo ngày/tuần/tháng
29. Badge → mua → boost factor áp dụng
30. Badge → hết hạn → tự động tắt
31. Trust score → giảm do dispute
32. Trust score → tăng do hoàn thành job
33. Worker dashboard → loading state → data
34. Worker dashboard → lỗi API → error boundary
35. Worker mobile → các chức năng tương tự

### Admin (30 kịch bản)
1. Dashboard → thống kê đúng các số liệu
2. Users → xem danh sách, filter, search
3. Workers → xem danh sách, filter theo trust score
4. Workers → duyệt verify → worker nhận được thông báo
5. Workers → từ chối verify → worker nhận được thông báo
6. Orders → xem tất cả đơn, filter status
7. Orders → gán thợ cho đơn chưa matched
8. Disputes → xem khiếu nại → resolve
9. AI Logs → xem lịch sử gọi AI
10. AI Approvals → duyệt/từ chối đề xuất
11. Chat KPIs → số liệu conversion funnel
12. Price Accuracy → so sánh giá AI vs thực tế
13. Settings General → sửa → lưu
14. Settings AI → cấu hình model → lưu
15. Settings Features → bật/tắt feature → user thấy thay đổi
16. Settings Memberships → thay đổi giá → user thấy
17. Settings Payments → cấu hình gateway → test
18. Settings Pricing → thay đổi bảng giá
19. Settings Security → rate limit → user bị giới hạn
20. Settings Notifications → template email → gửi test
21. Settings Wallet → xem số dư, lịch sử
22. Settings Gateway detail → Stripe config
23. Settings Gateway detail → VNPay config
24. Admin tạo user mới
25. Admin xóa user
26. Admin xem chi tiết user → orders history
27. Admin export data
28. Admin dashboard → realtime updates
29. Admin → không phải admin → redirect
30. Admin → settings → wallet → transaction history
