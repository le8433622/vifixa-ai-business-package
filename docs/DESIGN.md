# 🎨 Vifixa AI Design System v3

> Kiến trúc: **MAP (điểm vật lý) + AI (bộ não trí tuệ) → Mọi module xoay quanh**

---

## 1. TRIẾT LÝ THIẾT KẾ

```
MAP + AI = TRUNG TÂM
  ↓
3 màn hình: Khách → Thợ → Admin
  ↓
Tất cả đều xoay quanh bản đồ và AI
```

**Nguyên tắc vàng:**
1. **Map-first**: Mọi màn hình bắt đầu bằng bản đồ. Object nào cũng có tọa độ.
2. **AI-first**: AI xử lý mọi thứ — chẩn đoán, định giá, ghép thợ, tối ưu.
3. **3 vai trò**: Khách (thấy thợ) → Thợ (thấy đơn) → Admin (thấy tất cả).
4. **Không form**: Chat với AI thay vì điền form. Map thay vì danh sách.
5. **100% tiếng Việt**: Mọi UI, error message, notification.

---

## 2. BẢNG MÀU (Colors)

### Primary palette
```css
/* Brand colors */
--vf-primary: #2563eb;       /* Xanh dương - chính */
--vf-primary-dark: #1d4ed8;
--vf-primary-light: #dbeafe;

--vf-success: #16a34a;       /* Xanh lá - thành công */
--vf-warning: #ca8a04;       /* Vàng - cảnh báo */
--vf-danger: #dc2626;        /* Đỏ - lỗi/nguy hiểm */
--vf-info: #7c3aed;          /* Tím - thông tin */

/* Neutral */
--vf-bg: #ffffff;
--vf-bg-subtle: #f9fafb;
--vf-bg-muted: #f3f4f6;
--vf-border: #e5e7eb;
--vf-text: #111827;
--vf-text-secondary: #6b7280;
--vf-text-muted: #9ca3af;
```

### Gradient patterns
```css
/* Cards gradient */
--gradient-primary: linear-gradient(135deg, #2563eb, #7c3aed);
--gradient-success: linear-gradient(135deg, #16a34a, #059669);
--gradient-danger: linear-gradient(135deg, #dc2626, #e11d48);
--gradient-amber: linear-gradient(135deg, #f59e0b, #d97706);
```

---

## 3. TYPOGRAPHY

### Font stack
```css
font-family: 'Inter', 'Be Vietnam Pro', system-ui, sans-serif;
font-family: 'JetBrains Mono', monospace; /* Code/monetary values */
```

### Size scale
| Token | Size | Dùng cho |
|-------|------|----------|
| `text-xs` | 12px | Labels, timestamps |
| `text-sm` | 14px | Body, descriptions |
| `text-base` | 16px | UI text |
| `text-lg` | 18px | Section titles |
| `text-xl` | 20px | Card titles |
| `text-2xl` | 24px | Page headers |
| `text-3xl` | 30px | Hero headers |

---

## 4. COMPONENTS

### 4.1 BanDo (Map) — Component trung tâm

```tsx
<BanDo
  geoJSON={data}              // GeoJSON FeatureCollection
  points={[{id, lat, lng, type, label, desc}]}
  center={[10.77, 106.69]}    // [lat, lng] — mặc định TP.HCM
  zoom={12}
  height="500px"
  onMapClick={(lat, lng) => {}} // Click vào bản đồ
  onMarkerClick={(id, type) => {}} // Click vào marker
  showControls={true}
/>
```

### 4.2 AIUI — Shared components

```tsx
<PageHeader title="" description="" actions={} />
<LoadingState text="Đang tải..." />
<EmptyState icon="📭" title="" description="" />
<ErrorAlert message="" onRetry={} />
<StatCard label="" value="" color="blue|green|red" />
<FilterBar options={[]} selected="" onChange={() => {}} />
<InfoBadge label="" color="green|red|blue|amber" />
```

### 4.3 Card patterns

```tsx
// Data card — dùng cho danh sách
<div className="bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition-all">
  {children}
</div>

// Metric card — dùng cho thống kê
<div className="bg-white p-6 rounded-xl shadow-sm border">
  <p className="text-sm text-gray-600">{label}</p>
  <p className="text-2xl font-bold">{value}</p>
</div>

// Gradient card — dùng cho CTA/highlight
<div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl p-4">
  {children}
</div>
```

---

## 5. LAYOUT PATTERNS

### 5.1 Admin Map-first layout
```
┌──────────────────────────────────────────────┐
│  Header: dropdown + stats                     │
├──────────────────────────────────────────────┤
│  BẢN ĐỒ (chiếm 60% viewport)                │
│  ● Worker markers ● Order markers            │
│  🔥 Heatmap overlay                          │
│  Click → popup chi tiết                      │
├──────────────────────────────────────────────┤
│  Quick actions grid (2-4 cards)              │
└──────────────────────────────────────────────┘
```

### 5.2 Customer Map-first layout
```
┌──────────────────────────────────────────────┐
│  BẢN ĐỒ (300px) + gradient overlay          │
│  ● Thợ gần đây ● Vị trí user                │
├──────────────────────────────────────────────┤
│  Danh mục dịch vụ (grid 3 cột)              │
├──────────────────────────────────────────────┤
│  Danh sách thợ gần + "Đặt ngay"             │
└──────────────────────────────────────────────┘
```

### 5.3 Worker Map-first layout
```
┌──────────────────────────────────────────────┐
│  BẢN ĐỒ (350px) + gradient overlay          │
│  ● Đơn hàng gần ● Vị trí worker              │
├──────────────────────────────────────────────┤
│  Thống kê: đơn chờ / hoàn thành / thu nhập   │
├──────────────────────────────────────────────┤
│  Danh sách đơn + "Xem"                       │
│  Quick actions: Route optimize + AI Coach    │
└──────────────────────────────────────────────┘
```

---

## 6. AI AGENT PATTERN

```typescript
// Mọi AI agent đều theo pattern này:
import { verifyAuth, checkRateLimit, jsonResponse, handleOptions } from '../_shared/auth-helper.ts'

Deno.serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt
  try {
    const user = await verifyAuth(req)
    checkRateLimit(user.id, clientIp, { maxRequests: 15 })
    // ... logic AI ...
  } catch (error: any) {
    if (error.name === 'AuthError') return jsonResponse({ error: error.message }, 401)
    if (error.name === 'RateLimitError') return jsonResponse({ error: error.message }, 429)
    console.error('Lỗi [agent]:', error)
    return jsonResponse({ error: error.message || 'Lỗi máy chủ nội bộ' }, 500)
  }
})
```

---

## 7. RESPONSIVE BREAKPOINTS

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Mobile | < 640px | Single column, bottom tabs |
| Tablet | 640-1024px | 2 columns, sidebar nav |
| Desktop | > 1024px | 3 columns, top nav |

---

## 8. AI RESPONSE FORMAT

```typescript
// Mọi AI response đều theo format:
type AIResponse<T> = {
  success: true
  data: T        // Zod-validated data
  meta: {
    model: string
    latency: number
    tokensIn: number
    tokensOut: number
    cost: number
    cacheHit: boolean
  }
} | {
  success: false
  error: string  // Tiếng Việt
  meta: { model, latency, cacheHit: false }
}
```

---

## 9. FILE STRUCTURE CHUẨN

```
supabase/functions/ai-[tên]/index.ts  ← 1 function = 1 file
_shared/ai-core.ts                    ← Shared AI engine
_shared/ai-audit.ts                   ← Audit logging
_shared/ai-rag.ts                     ← RAG pipeline
_shared/auth-helper.ts                ← Auth + rate limit
_shared/ai-types.ts                   ← TypeScript types

web/src/app/[role]/[page]/page.tsx    ← 1 page = 1 file
components/admin/AIUI.tsx             ← Shared UI components
components/map/BanDo.tsx              ← Map component

mobile/src/app/([role])/[page].tsx    ← 1 screen = 1 file
mobile/src/components/BanDo.tsx       ← Map component mobile
```