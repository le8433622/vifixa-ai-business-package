# Feature Flags System Documentation

## Overview
Hệ thống Feature Flags cho phép admin toggle tính năng ON/OFF mà không cần deploy code. Đây là nền tảng cho "Toggle-Safe Development" - mọi tính năng mới đều được phát triển an toàn, chỉ bật khi đã sẵn sàng.

## Database Schema

### `feature_flags` Table
Lưu trữ tất cả feature flags của hệ thống.

| Column | Type | Description |
|--------|------|-------------|
| `key` | TEXT (PK) | Unique identifier (vd: 'payment_gateway') |
| `label` | TEXT | Human-readable label |
| `description` | TEXT | Mô tả chi tiết |
| `enabled` | BOOLEAN | Toggle state (default: false) |
| `category` | TEXT | 'payment', 'wallet', 'ai', 'notification', 'security', 'system' |
| `requires_config` | BOOLEAN | Cần config trước khi bật |
| `config_completed` | BOOLEAN | Đã config xong chưa |
| `created_at` | TIMESTAMPTZ | Thời gian tạo |
| `updated_at` | TIMESTAMPTZ | Thời gian cập nhật |
| `updated_by` | UUID | Admin đã cập nhật cuối |

**RLS Policies:**
- Admin: Full access (ALL)
- Others: Read only enabled flags

### `app_settings` Table
Cài đặt chung của ứng dụng.

| Column | Type | Description |
|--------|------|-------------|
| `key` | TEXT (PK) | Unique identifier |
| `value` | TEXT | Giá trị cài đặt |
| `value_type` | TEXT | 'text', 'number', 'boolean', 'json' |
| `category` | TEXT | Phân loại |
| `label` | TEXT | Label hiển thị |
| `description` | TEXT | Mô tả |
| `is_public` | BOOLEAN | Hiển thị cho client không |

## Usage (Client-side)

### 1. Check single feature flag:

```tsx
import { useFeatureFlag } from '@/hooks/useFeatureFlag';

function MyComponent() {
  const { isEnabled, loading, error } = useFeatureFlag('payment_gateway');

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!isEnabled) return <div>Feature disabled</div>;

  return <PaymentGatewayUI />;
}
```

### 2. Guard component wrapper:

```tsx
import { FeatureGuard } from '@/components/FeatureGuard';

function MyPage() {
  return (
    <FeatureGuard
      flag="payment_gateway"
      fallback={<p>Tính năng đang phát triển...</p>}
    >
      <PaymentGatewayUI />
    </FeatureGuard>
  );
}
```

### 3. Check multiple flags (via FeatureFlagProvider):

```tsx
import { useFeatureFlags } from '@/components/FeatureFlagProvider';

function Navigation() {
  const { isEnabled } = useFeatureFlags();

  return (
    <nav>
      <Link href="/dashboard">Dashboard</Link>
      {isEnabled('payment_gateway') && (
        <Link href="/payments">Payments</Link>
      )}
      {isEnabled('internal_wallet') && (
        <Link href="/wallet">Wallet</Link>
      )}
    </nav>
  );
}
```

### 4. Toggle flag (admin only):

```tsx
import { useToggleFeatureFlag } from '@/hooks/useFeatureFlag';

function AdminSettings() {
  const { toggleFlag, loading, error } = useToggleFeatureFlag();

  const handleToggle = async () => {
    const success = await toggleFlag('payment_gateway', true);
    if (success) {
      alert('Feature enabled!');
    }
  };

  return (
    <button onClick={handleToggle} disabled={loading}>
      {loading ? 'Saving...' : 'Enable Payment Gateway'}
    </button>
  );
}
```

## Usage (Server-side / Edge Functions)

Guard feature trong Edge Function:

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Check if feature enabled
  const { data: flag } = await supabase
    .from('feature_flags')
    .select('enabled')
    .eq('key', 'payment_gateway')
    .single();

  if (!flag?.enabled) {
    return new Response(
      JSON.stringify({ error: 'Feature disabled' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Process normally...
  // ...
});
```

## Edge Function: `feature-flag`

### GET /?key=xxx
Check single flag (server-side guard):
```
GET /functions/v1/feature-flag?key=payment_gateway
→ { "key": "payment_gateway", "enabled": false, ... }
```

### GET /
List all flags (admin only):
```
GET /functions/v1/feature-flag
Headers: Authorization: Bearer <admin_token>
→ { "flags": [...] }
```

### POST /
Toggle flag on/off (admin only):
```
POST /functions/v1/feature-flag
Headers: Authorization: Bearer <admin_token>
Content-Type: application/json

Body: { "key": "payment_gateway", "enabled": true }
→ { "success": true, "flag": {...} }
```

**Validation rules:**
- Cannot enable flag if `requires_config = true` AND `config_completed = false`
- Only admin can toggle flags
- Non-admin can only read flags

## Admin UI
Truy cập: `/admin/settings/features` (sẽ implement ở Step 2)

UI cho phép admin:
- Xem tất cả flags theo category
- Toggle ON/OFF từng feature
- Thấy trạng thái `requires_config` và `config_completed`
- Quản lý cài đặt chi tiết từng gateway

## Adding New Feature Flag

Khi thêm tính năng mới:

1. **Thêm vào migration** `feature_flags`:
   ```sql
   INSERT INTO feature_flags (key, label, description, enabled, category, requires_config)
   VALUES ('new_feature', 'New Feature', 'Description', false, 'system', false);
   ```

2. **Default = false** (an toàn mặc định)

3. **Wrap UI trong FeatureGuard**:
   ```tsx
   <FeatureGuard flag="new_feature">
     <NewFeatureUI />
   </FeatureGuard>
   ```

4. **Guard Edge Function**:
   ```typescript
   const { data: flag } = await supabase
     .from('feature_flags')
     .select('enabled')
     .eq('key', 'new_feature')
     .single();

   if (!flag?.enabled) return new Response(..., { status: 503 });
   ```

5. **Admin sẽ enable** khi tính năng sẵn sàng

## Feature Flag Catalog (Seeded)

| Key | Label | Category | Default | Requires Config |
|-----|-------|----------|---------|-----------------|
| `payment_gateway` | Payment Gateway | payment | false | true |
| `internal_wallet` | Internal Wallet | wallet | false | true |
| `worker_payouts` | Worker Payouts | wallet | false | true |
| `stripe_connect` | Stripe Connect | payment | false | true |
| `ai_chat` | AI Chat | ai | true | false |
| `ai_warranty` | AI Warranty | ai | true | false |
| `ai_quality_monitor` | AI Quality Monitor | ai | true | false |
| `ai_suggestions` | AI Suggestions | ai | false | true |
| `email_notifications` | Email Notifications | notification | false | true |
| `sms_notifications` | SMS Notifications | notification | false | true |
| `push_notifications` | Push Notifications | notification | false | true |
| `maintenance_mode` | Maintenance Mode | system | false | false |
| `debug_mode` | Debug Mode | security | false | false |
| `rate_limit_strict` | Strict Rate Limiting | security | false | false |
| `worker_registration` | Worker Registration | system | true | false |
| `customer_registration` | Customer Registration | system | true | false |
| `subscriptions` | Subscription Plans | payment | false | true |

## App Settings Catalog (Seeded)

| Key | Value | Type | Category | Public |
|-----|-------|------|----------|--------|
| `app_name` | Vifixa AI | text | general | true |
| `app_description` | AI-Powered Home Services | text | general | true |
| `primary_currency` | VND | text | general | false |
| `support_email` | NULL | text | general | true |
| `support_phone` | NULL | text | general | true |
| `platform_fee_percent` | 10 | number | billing | false |
| `min_payout_amount` | 50000 | number | wallet | false |
| `max_payout_amount` | 50000000 | number | wallet | false |
| `payout_fee` | 5000 | number | wallet | false |
| `maintenance_message` | Hệ thống đang bảo trì... | text | system | true |
| `terms_url` | NULL | text | legal | true |
| `privacy_url` | NULL | text | legal | true |

## Safety Guarantees

**Tại mọi thời điểm deployment:**
- ✅ Existing features: default ON (safe)
- ✅ New features: default OFF (no impact)
- ✅ Admin can disable any feature instantly (zero downtime)
- ✅ No partial deployments: Feature is either fully ON or fully OFF
- ✅ Graceful degradation: Disabled features show "Coming Soon" placeholders
- ✅ Zero user impact when toggling: State change is immediate

## Troubleshooting

### Flag not found
```typescript
// Error: PGRST116 (row not found)
// → Flag chưa được seed, thêm vào migration
```

### Cannot enable flag
```json
{
  "error": "Cannot enable: configuration required",
  "requires_config": true,
  "config_completed": false
}
// → Cần config xong trước khi bật flag
```

### RLS Policy error
```
// → Kiểm tra user có role = 'admin' trong profiles table
SELECT role FROM profiles WHERE id = auth.uid();
```
