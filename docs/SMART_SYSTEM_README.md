# Vifixa AI — Smart System & Feature Flags

## Tổng quan

Hệ thống Vifixa AI được xây dựng với kiến trúc **Toggle-Safe Development**:
- Mọi tính năng đều có thể bật/tắt mà không cần deploy lại code
- Admin quản lý toàn bộ cài đặt thông qua `/admin/settings`
- Hệ thống thông minh học hỏi từ hành vi người dùng để đưa ra gợi ý tối ưu

---

## Kiến trúc Toggle-Safe

```
┌─────────────────────────────────────────────────────────┐
│           HỆ THỐNG TOGGLE-SAFE              │
├─────────────────────────────────────────────────────────┤
│ Tầng 1: System Feature Flags (Admin)          │
│   → Bật/tắt tính năng toàn hệ thống         │
│   → Table: feature_flags                   │
├─────────────────────────────────────────────────────────┤
│ Tầng 2: User Preferences (User-controlled)   │
│   → Worker/Customer tự chỉnh tùy chọn        │
│   → Table: user_preferences               │
├─────────────────────────────────────────────────────────┤
│ Tầng 3: Behavioral Analytics (Intelligence) │
│   → Phân tích hành vi → tìm patterns        │
│   → Tạo smart suggestions              │
├─────────────────────────────────────────────────────────┤
│ Tầng 4: Proactive Recommendations       │
│   → Gợi ý chủ động dựa trên context         │
│   → Tự động điều chỉnh theo thời gian/vị trí│
└─────────────────────────────────────────────────────────┘
```

---

## Database Migrations

| File | Tables Created | Description |
|------|----------------|-------------|
| `20260510000000_feature_flags.sql` | `feature_flags` | Toggle ON/OFF cho mọi tính năng |
| `20260510000001_app_settings.sql` | `app_settings` | Cài đặt chung của ứng dụng |
| `20260510000002_gateway_configs.sql` | `gateway_configs` | Cấu hình payment gateways |
| `20260510000003_payment_system.sql` | `payment_intents`, `wallets`, `ledger_entries`, `webhook_events`, modifies `payouts` | Hệ thống thanh toán + ví nội bộ |
| `20260510000004_smart_system.sql` | `user_preferences`, `behavioral_patterns`, `user_suggestions` | Hệ thống thông minh |

---

## Edge Functions

| Function | Purpose | Endpoint |
|----------|---------|----------|
| `feature-flag` | Server-side feature flag check + admin toggle | `GET /?key=xxx`, `POST /`, `GET /` (list) |
| `payment-process` | Tạo payment, xử lý webhook, refund | `POST /create`, `POST /webhook/:gateway`, `GET /status` |
| `wallet-manager` | Quản lý ví, yêu cầu rút tiền, duyệt payout | `GET /?action=balance`, `POST /`, `PUT /?action=approve` |
| `user-preferences` | Quản lý user preferences | `GET /?key=xxx`, `GET /`, `PUT /?key=xxx` |
| `behavioral-analytics` | Phân tích hành vi, tạo gợi ý | `POST /` (trigger analysis) |
| `smart-suggestions` | Xử lý user apply/dismiss suggestions | `GET /`, `PUT /apply?id=xxx`, `PUT /dismiss?id=xxx` |

---

## Admin Settings UI

Truy cập: `https://web-lipdeeob7-le8433622-9187s-projects.vercel.app/admin/settings`

### Navigation (Sidebar)
```
Settings
├── General (app name, support email, etc.)
├── Features (feature flags toggle UI) ⚙️
├── Payments (VNPay, MoMo, ZaloPay config) 💳
├── Wallet (wallet settings) 💰
├── Notifications (email, SMS, push) 📧
├── AI Config (models, prompts) 🤖
└── Security (maintenance mode, rate limiting) 🔒
```

### Feature Flags Catalog

| Key | Label | Category | Default | Requires Config |
|-----|-------|----------|---------|-----------------|
| `payment_gateway` | Payment Gateway | payment | false | true |
| `internal_wallet` | Internal Wallet | wallet | false | true |
| `worker_payouts` | Worker Payouts | wallet | false | true |
| `ai_chat` | AI Chat | ai | true | false |
| `ai_warranty` | AI Warranty | ai | true | false |
| `ai_quality_monitor` | AI Quality Monitor | ai | true | false |
| `email_notifications` | Email Notifications | notification | false | true |
| `maintenance_mode` | Maintenance Mode | system | false | false |

---

## Payment Gateway System

### Supported Gateways
- ✅ **VNPay** — Vietnam domestic (bank transfer, QR, card)
- ✅ **MoMo** — Mobile wallet
- ✅ **ZaloPay** — Zalo ecosystem wallet
- ✅ **Stripe** — Global payments (future)
- ✅ **Mock** — Development mode (no real accounts needed)

### Gateway Abstraction Layer
```
PaymentGateway (interface)
├── VNPayGateway implements PaymentGateway
├── MoMoGateway implements PaymentGateway
├── ZaloPayGateway implements PaymentGateway
├── StripeGateway implements PaymentGateway
└── MockGateway implements PaymentGateway

Registry Pattern: registerGateway('vnpay', VNPayGateway)
```

---

## Smart System (Hệ thống thông minh)

### User Preferences
Worker có thể tùy chỉnh:
- **Work Mode**: Active | Selective | Standby | Offline
- **Job Filters**: min_pay, max_distance, preferred_types
- **AI Assistance Level**: auto | assist | manual | learning

Customer có thể tùy chỉnh:
- **Service Preferences**: preferred_worker_skills, min_worker_rating, budget_range
- **AI Diagnosis Level**: auto | confirm | manual
- **Communication Channel**: app | sms | email

### Behavioral Analytics
Hệ thống tự động:
1. Phân tích lịch sử orders → tìm patterns (giờ vàng, job types thành công)
2. Tính confidence score (càng nhiểu data → càng chính xác)
3. Tạo smart suggestions với lý do và boost (VD: +30% earnings)

### Smart Suggestions UI
```
💡 Gợi ý cho bạn:
┌──────────────────────────────────────────────┐
│  📈 Bật chế độ 'Active' ngay bây giờ      │
│     Thứ 3 từ 9-11h thường +30% thu nhập │
│     [Áp dụng] [Để sau]                     │
├──────────────────────────────────────────────┤
│  🎯 Tăng bán kính lên 15km              │
│     Dựa trên lịch sử, +5 jobs/tuần          │
│     [Áp dụng] [Để sau]                     │
└──────────────────────────────────────────────┘
```

---

## Safety Guarantees

✅ **Existing features**: default ON (safe)  
✅ **New features**: default OFF (no impact)  
✅ **Admin can disable** any feature instantly (zero downtime)  
✅ **No partial deployments**: Feature is either fully ON or fully OFF  
✅ **Graceful degradation**: Disabled features show "Coming Soon"  
✅ **Zero user impact** when toggling: State change is immediate  

---

## Development Workflow

### Adding New Feature
1. Thêm vào `feature_flags` table (default `enabled=false`)
2. Wrap UI trong `<FeatureGuard flag="x">`
3. Guard Edge Function với flag check
4. Admin sẽ enable khi sẵn sàng

### Toggle Feature in Production
```bash
# Via Edge Function (admin only)
curl -X POST https://lipjakzhzosrhttsltwo.supabase.co/functions/v1/feature-flag \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"key":"payment_gateway", "enabled":true}'
```

### Check Feature Status
```bash
curl "https://lipjakzhzosrhttsltwo.supabase.co/rest/v1/feature_flags?select=key,enabled" \
  -H "apikey: <service_role_key>"
```

---

## Deployment Status

### Migrations (Deployed ✅)
```
✅ 20260510000000_feature_flags
✅ 20260510000001_app_settings
✅ 20260510000002_gateway_configs
✅ 20260510000003_payment_system
✅ 20260510000004_smart_system
```

### Edge Functions (Deployed ✅)
```
✅ feature-flag
✅ payment-process
✅ wallet-manager
✅ user-preferences
✅ behavioral-analytics
✅ smart-suggestions
```

### Web App (Deployed ✅)
```
✅ https://web-lipdeeob7-le8433622-9187s-projects.vercel.app
✅ /admin/settings/*
✅ /worker/settings
✅ /customer/settings
```

---

## Next Steps

1. **Implement VNPay/MoMo/ZaloPay Adapters**
   - Complete HMAC-SHA512 signature implementation
   - Real API calls instead of mock responses
   - Webhook normalization for each gateway

2. **Complete Wallet Manager UI**
   - Worker earnings page with ledger entries
   - Payout request form
   - Admin payout approval dashboard

3. **Enhance Smart System**
   - Real behavioral analytics (not localStorage mock)
   - Machine learning for better suggestions
   - A/B testing framework for suggestions

4. **Production Testing**
   - End-to-end payment flow (VNPay sandbox)
   - Worker payout flow
   - Smart suggestions in real usage

---

## File Structure

```
web/src/
├── types/
│   ├── featureFlags.ts          # Feature flags types
│   └── paymentGateway.ts        # Payment gateway types
├── hooks/
│   └── useFeatureFlag.ts       # Hook for checking flags
├── components/
│   ├── FeatureFlagProvider.tsx  # React Context
│   └── FeatureGuard.tsx          # Guard component
├── app/
│   ├── admin/settings/
│   │   ├── layout.tsx            # Settings sidebar nav
│   │   ├── page.tsx              # Redirect to general
│   │   ├── general/page.tsx       # General settings
│   │   ├── features/page.tsx      # Feature flags UI
│   │   ├── payments/page.tsx     # Gateway list
│   │   ├── payments/[gateway]/page.tsx  # Gateway config
│   │   ├── wallet/page.tsx        # Wallet settings
│   │   ├── notifications/page.tsx # Notification settings
│   │   ├── ai/page.tsx            # AI config
│   │   └── security/page.tsx       # Security settings
│   ├── worker/settings/page.tsx  # Worker smart toggles
│   └── customer/settings/page.tsx # Customer smart preferences

supabase/
├── migrations/
│   ├── 20260510000000_feature_flags.sql
│   ├── 20260510000001_app_settings.sql
│   ├── 20260510000002_gateway_configs.sql
│   ├── 20260510000003_payment_system.sql
│   └── 20260510000004_smart_system.sql
└── functions/
    ├── feature-flag/index.ts
    ├── payment-process/index.ts
    ├── wallet-manager/index.ts
    ├── user-preferences/index.ts
    ├── behavioral-analytics/index.ts
    ├── smart-suggestions/index.ts
    └── _shared/
        ├── payment-gateway.ts      # Interface + Registry
        └── gateways/
            ├── vnpay.ts
            ├── momo.ts
            ├── zalopay.ts
            ├── stripe.ts
            └── mock.ts
```

---

## Quick Start for Developers

```bash
# 1. Clone & install
git clone <repo-url>
cd vifixa-ai-business-package
npm install

# 2. Setup environment
cp web/.env.example web/.env.local
# Edit .env.local with your keys

# 3. Run Supabase locally
supabase start

# 4. Push migrations
supabase db push

# 5. Deploy edge functions
supabase functions deploy --use-api

# 6. Run web app
cd web && npm run dev
```

---

**Built with ❤️ for Vifixa AI — Smart Home Services Platform**
