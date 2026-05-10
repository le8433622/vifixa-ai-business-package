# Vifixa AI — Business Master Plan

## Vision
Trở thành **hệ điều hành AI cho dịch vụ vật lý**: sửa chữa, bảo trì, lắp đặt, cải tạo, kiểm tra định kỳ, vận hành tài sản.

## Brand
- **Tên**: Vifixa AI | **Codename**: VFIX
- **Slogan**: Smart services for real life.
- **Định vị**: Nền tảng mobile-first kết nối khách hàng với thợ sửa chữa, vận hành bởi AI từ tiếp nhận → chẩn đoán → báo giá → ghép thợ → theo dõi → kiểm tra → bảo hành.

## Market Problem
- Khó tìm thợ đáng tin, giá không minh bạch, không có lịch sử bảo trì
- Thợ thiếu khách ổn định, thiếu công cụ chuyên nghiệp
- B2B khó quản lý đội thợ, không có dashboard bảo trì, không SLA rõ ràng
- Cơ hội AI: chuẩn hóa đầu vào, chẩn đoán, báo giá, ghép thợ, phát hiện gian lận

## Users
3 roles: **Customer** → **Worker** → **Admin**

## Product Flows
**Customer (10 bước)**: Mở app → Chọn dịch vụ → Gửi ảnh/video → AI chẩn đoán → Nhận báo giá → Xác nhận → Ghép thợ → Theo dõi → Xác nhận → Đánh giá/Bảo hành/Khiếu nại

**Worker (10 bước)**: Đăng ký → Xác minh → Chọn khu vực → Nhận đơn → Chấp nhận → Cập nhật → Upload ảnh trước/sau → Ghi vật tư → Hoàn thành → Theo dõi thu nhập

**Admin (7 module)**: Dashboard → Users → Workers → Orders → Complaints → Warranty → Audit

## Revenue Model (7 streams)
| # | Stream | Description |
|---|--------|-------------|
| 1 | **Commission** | % trên mỗi đơn hoàn thành (take rate) |
| 2 | **Membership** | Gói bảo trì định kỳ cho khách hàng |
| 3 | **Worker Tools** | AI assistant, dashboard nâng cao cho thợ |
| 4 | **B2B SaaS** | Cho tòa nhà, chuỗi cửa hàng, văn phòng |
| 5 | **Marketplace** | Vật tư, linh kiện, dụng cụ |
| 6 | **Ad/Boost** | Worker trả phí để nổi bật hơn |
| 7 | **Insurance** | Bảo hành mở rộng, bảo hiểm thiết bị |

## Financial Plan
| Phase | Period | Cost | Revenue Target |
|-------|--------|------|----------------|
| MVP | Tháng 1-3 | $56,500 | $0 |
| Beta | Tháng 4-6 | $52,800 | $5,000/tháng |
| Scale | Tháng 7-12 | $116,500 | $15,000/tháng |
| **Total Year 1** | | **$225,800** | **$80,000** |

Break-even: **Tháng 18**. Capital allocation: 60% dev, 25% ops, 15% marketing.

## OKRs (MVP Phase)
- **500 users**, 100 service requests, 30 completed orders
- **50 workers**, 20 verified, 10 active weekly
- **80%** diagnosis category accuracy, **60%** price estimate accuracy
- **North Star**: Completed trusted service orders per week

## Business Priorities
1. Trust → 2. Speed → 3. Transparent pricing → 4. Quality → 5. Repeat usage → 6. Worker supply quality → 7. AI learning

## Do Not Build
- No mock data in production | No secrets in mobile/frontend | No skipped auth/validation/RBAC
- No irreversible AI decisions without audit | No service-role keys in client apps
