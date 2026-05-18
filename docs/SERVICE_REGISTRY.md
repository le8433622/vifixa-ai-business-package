# Vifixa AI — Service Registry (Plugin Architecture)

> Mọi dịch vụ trong cuộc sống đều là 1 plugin.
> Thêm dịch vụ mới = thêm 1 block. Không sửa core workflow.

---

## 1. Core Principle

```
Vifixa KHÔNG hardcode service type.

Mọi service là 1 plugin implement interface:
[User Need] → [AI Hiểu] → [Match Provider] → [Fulfill] → [Pay] → [Review]
```

---

## 2. ServiceDefinition Interface

```typescript
interface ServiceDefinition {
  id: string                    // "repair", "cleaning", "delivery"
  name: string                  // Tên tiếng Việt
  icon: string                  // Emoji
  category: string              // "home_services", "logistics", "care", "education", "beauty"
  description: string           // Mô tả cho user

  // AI detection
  keywords: string[]            // Từ khóa để AI nhận diện service này
  requiredSkills: string[]      // Kỹ năng provider cần có
  typicalPricing: PriceRange    // Giá điển hình { min, max, currency }

  // UI generation
  questions: string[]           // Câu hỏi AI nên hỏi
  quickActions: ServiceAction[] // Nút tác vụ nhanh
  diagnosisFields: DiagnosisField[] // Form fields động

  // Optional lifecycle hooks
  onDiagnose?: (input: any) => Promise<any>
  onQuote?: (diagnosis: any) => Promise<any>
  onMatch?: (quote: any, providers: ServiceProvider[]) => Promise<any>
  onComplete?: (order: any) => Promise<any>
}
```

---

## 3. Current Services

### repair — Sửa chữa thiết bị
```typescript
{
  id: 'repair',
  name: 'Sửa chữa thiết bị',
  icon: '🔧',
  category: 'home_services',
  description: 'Sửa máy lạnh, điện nước, camera, đồ gia dụng...',
  keywords: ['sửa', 'chữa', 'hỏng', 'hư', 'máy lạnh', 'điều hòa', 'điện', 'nước', 'rò rỉ', 'camera', 'tủ lạnh', 'máy giặt', 'bếp', 'lò vi sóng', 'bình nóng lạnh', 'bồn cầu', 'ống nước', 'không mát', 'không lạnh', 'không chạy', 'chập', 'cháy'],
  requiredSkills: ['sửa chữa', 'bảo trì', 'kỹ thuật'],
  typicalPricing: { min: 150000, max: 2000000, currency: 'VND' },
  questions: [
    'Thiết bị nào đang gặp vấn đề?',
    'Vấn đề cụ thể là gì?',
    'Thiết bị đã dùng bao lâu?',
    'Có thể gửi ảnh không?'
  ]
}
```

---

## 4. Services to Add

### Phase 1: Home Services (hiện tại)
- ✅ `repair` — Sửa chữa thiết bị

### Phase 2: Cleaning & Maintenance
- `cleaning` — Dọn dẹp nhà cửa
- `ac_cleaning` — Vệ sinh máy lạnh
- `deep_cleaning` — Tổng vệ sinh

### Phase 3: Logistics
- `delivery` — Giao hàng
- `moving` — Chuyển nhà
- `errands` — Mua hộ, lấy đồ

### Phase 4: Care
- `elder_care` — Chăm sóc người già
- `child_care` — Trông trẻ
- `pet_care` — Chăm sóc thú cưng

### Phase 5: Education & Skills
- `tutoring` — Gia sư
- `music` — Dạy nhạc
- `language` — Dạy ngoại ngữ

### Phase 6: Beauty & Wellness
- `massage` — Massage tại nhà
- `beauty` — Làm đẹp tại nhà
- `fitness` — PT cá nhân

### Phase 7: B2B
- `office_maintenance` — Bảo trì văn phòng
- `commercial_cleaning` — Vệ sinh thương mại

---

## 5. Service Definitions (Ready to Register)

### cleaning — Dọn dẹp nhà cửa
```typescript
{
  id: 'cleaning',
  name: 'Dọn dẹp nhà cửa',
  icon: '🧹',
  category: 'home_services',
  description: 'Dọn nhà, lau kính, vệ sinh nhà cửa...',
  keywords: ['dọn', 'lau', 'vệ sinh', 'sạch', 'nhà cửa', 'dọn dẹp', 'dơ', 'bẩn', 'bừa', 'phòng', 'lau nhà', 'quét', 'chùi'],
  requiredSkills: ['dọn dẹp', 'vệ sinh'],
  typicalPricing: { min: 90000, max: 500000, currency: 'VND' },
  questions: [
    'Diện tích nhà khoảng bao nhiêu m²?',
    'Cần dọn những khu vực nào?',
    'Cần thêm dịch vụ gì không (giặt, ủi, lau kính)?'
  ],
  quickActions: [
    { type: 'quote', label: '💰 Báo giá', icon: '💰' },
    { type: 'create_order', label: '📅 Đặt lịch', icon: '📅' }
  ],
  diagnosisFields: [
    { key: 'area_sqm', label: 'Diện tích (m²)', type: 'text', required: true },
    { key: 'cleaning_type', label: 'Loại dọn dẹp', type: 'choice', options: ['Dọn cơ bản', 'Tổng vệ sinh', 'Dọn theo giờ'], required: true },
    { key: 'addon_laundry', label: 'Giặt ủi?', type: 'choice', options: ['Không', 'Có'], required: false },
    { key: 'addon_windows', label: 'Lau kính?', type: 'choice', options: ['Không', 'Có'], required: false },
    { key: 'location', label: 'Vị trí', type: 'location', required: true }
  ]
}
```

### ac_cleaning — Vệ sinh máy lạnh
```typescript
{
  id: 'ac_cleaning',
  name: 'Vệ sinh máy lạnh',
  icon: '❄️',
  category: 'home_services',
  description: 'Vệ sinh, bảo dưỡng máy lạnh định kỳ',
  keywords: ['vệ sinh máy lạnh', 'rửa máy lạnh', 'bảo dưỡng máy lạnh', 'máy lạnh dơ', 'máy lạnh hôi', 'vệ sinh điều hòa'],
  requiredSkills: ['vệ sinh máy lạnh', 'bảo trì'],
  typicalPricing: { min: 180000, max: 300000, currency: 'VND' },
  questions: [
    'Bao nhiêu máy lạnh cần vệ sinh?',
    'Máy lạnh loại gì (treo tường, tủ đứng, âm trần)?'
  ],
  quickActions: [
    { type: 'quote', label: '💰 Báo giá', icon: '💰' },
    { type: 'create_order', label: '📅 Đặt lịch', icon: '📅' }
  ],
  diagnosisFields: [
    { key: 'quantity', label: 'Số lượng máy', type: 'text', required: true },
    { key: 'ac_type', label: 'Loại máy lạnh', type: 'choice', options: ['Treo tường', 'Tủ đứng', 'Âm trần', 'Multi'], required: true },
    { key: 'location', label: 'Vị trí', type: 'location', required: true }
  ]
}
```

### delivery — Giao hàng
```typescript
{
  id: 'delivery',
  name: 'Giao hàng',
  icon: '📦',
  category: 'logistics',
  description: 'Giao hàng nhanh, lấy đồ, mua hộ',
  keywords: ['giao', 'ship', 'vận chuyển', 'gửi', 'chuyển đồ', 'mua hộ', 'lấy đồ', 'giao hàng', 'shipper'],
  requiredSkills: ['giao hàng'],
  typicalPricing: { min: 15000, max: 200000, currency: 'VND' },
  questions: [
    'Giao từ đâu đến đâu?',
    'Hàng gì? Kích thước, cân nặng?',
    'Cần giao gấp không?'
  ],
  quickActions: [
    { type: 'quote', label: '💰 Tính phí', icon: '💰' },
    { type: 'create_order', label: '📦 Đặt giao ngay', icon: '📦' }
  ],
  diagnosisFields: [
    { key: 'pickup_address', label: 'Địa chỉ lấy hàng', type: 'text', required: true },
    { key: 'delivery_address', label: 'Địa chỉ giao hàng', type: 'text', required: true },
    { key: 'package_description', label: 'Mô tả hàng', type: 'text', required: true },
    { key: 'urgency', label: 'Mức độ gấp', type: 'choice', options: ['Bình thường', 'Gấp (2h)', 'Hỏa tốc (1h)'], required: true }
  ]
}
```

### moving — Chuyển nhà
```typescript
{
  id: 'moving',
  name: 'Chuyển nhà',
  icon: '🚛',
  category: 'logistics',
  description: 'Chuyển nhà, chuyển văn phòng, xe tải',
  keywords: ['chuyển nhà', 'dọn nhà', 'chuyển đồ', 'xe tải', 'khuân vác', 'chuyển văn phòng'],
  requiredSkills: ['chuyển nhà', 'khuân vác'],
  typicalPricing: { min: 600000, max: 5000000, currency: 'VND' },
  questions: [
    'Từ đâu đến đâu?',
    'Diện tích nhà? Có thang máy không?',
    'Cần xe tải loại gì?'
  ],
  quickActions: [
    { type: 'quote', label: '💰 Báo giá', icon: '💰' },
    { type: 'create_order', label: '📅 Đặt lịch', icon: '📅' }
  ],
  diagnosisFields: [
    { key: 'from_address', label: 'Địa chỉ hiện tại', type: 'text', required: true },
    { key: 'to_address', label: 'Địa chỉ mới', type: 'text', required: true },
    { key: 'house_area', label: 'Diện tích nhà (m²)', type: 'text', required: true },
    { key: 'has_elevator', label: 'Có thang máy?', type: 'choice', options: ['Có', 'Không'], required: true },
    { key: 'truck_size', label: 'Loại xe', type: 'choice', options: ['Xe ba gác', 'Xe tải 500kg', 'Xe tải 1.5 tấn', 'Xe tải 2.5 tấn'], required: true }
  ]
}
```

### elder_care — Chăm sóc người già
```typescript
{
  id: 'elder_care',
  name: 'Chăm sóc người già',
  icon: '👴',
  category: 'care',
  description: 'Chăm sóc người già tại nhà',
  keywords: ['chăm sóc người già', 'người già', 'ông bà', 'chăm sóc tại nhà', 'điều dưỡng'],
  requiredSkills: ['chăm sóc người già', 'điều dưỡng'],
  typicalPricing: { min: 120000, max: 250000, currency: 'VND' },
  questions: [
    'Người già có bệnh nền gì không?',
    'Cần chăm sóc bao nhiêu giờ/ngày?',
    'Cần kỹ năng đặc biệt gì không?'
  ],
  quickActions: [
    { type: 'quote', label: '💰 Báo giá', icon: '💰' },
    { type: 'create_order', label: '📅 Đặt lịch', icon: '📅' }
  ],
  diagnosisFields: [
    { key: 'care_type', label: 'Loại chăm sóc', type: 'choice', options: ['Theo giờ', 'Theo ngày', 'Qua đêm'], required: true },
    { key: 'hours_per_day', label: 'Số giờ/ngày', type: 'text', required: false },
    { key: 'health_conditions', label: 'Tình trạng sức khỏe', type: 'text', required: true }
  ]
}
```

### pet_care — Chăm sóc thú cưng
```typescript
{
  id: 'pet_care',
  name: 'Chăm sóc thú cưng',
  icon: '🐾',
  category: 'care',
  description: 'Dắt chó đi dạo, tắm, cắt tỉa, trông thú cưng',
  keywords: ['chó', 'mèo', 'thú cưng', 'pet', 'dắt chó', 'tắm chó', 'cắt lông', 'trông thú cưng'],
  requiredSkills: ['chăm sóc thú cưng'],
  typicalPricing: { min: 80000, max: 400000, currency: 'VND' },
  questions: [
    'Thú cưng loại gì? Cân nặng?',
    'Cần dịch vụ gì?',
    'Có yêu cầu đặc biệt gì không?'
  ],
  quickActions: [
    { type: 'quote', label: '💰 Báo giá', icon: '💰' },
    { type: 'create_order', label: '📅 Đặt lịch', icon: '📅' }
  ],
  diagnosisFields: [
    { key: 'pet_type', label: 'Loại thú cưng', type: 'choice', options: ['Chó', 'Mèo', 'Khác'], required: true },
    { key: 'service_type', label: 'Dịch vụ', type: 'choice', options: ['Dắt đi dạo', 'Tắm rửa', 'Cắt tỉa lông', 'Trông giữ', 'Khám sức khỏe'], required: true }
  ]
}
```

### tutoring — Gia sư
```typescript
{
  id: 'tutoring',
  name: 'Gia sư',
  icon: '👨‍🏫',
  category: 'education',
  description: 'Gia sư tại nhà: Toán, Văn, Anh, Lý, Hóa...',
  keywords: ['gia sư', 'học', 'dạy', 'kèm', 'toán', 'văn', 'anh', 'lý', 'hóa', 'sinh', 'tiếng anh', 'luyện thi'],
  requiredSkills: ['giảng dạy', 'sư phạm'],
  typicalPricing: { min: 150000, max: 500000, currency: 'VND' },
  questions: [
    'Môn học gì? Cấp mấy?',
    'Mục tiêu học tập?',
    'Bao nhiêu buổi/tuần?'
  ],
  quickActions: [
    { type: 'quote', label: '💰 Báo giá', icon: '💰' },
    { type: 'create_order', label: '📅 Đặt lịch', icon: '📅' }
  ],
  diagnosisFields: [
    { key: 'subject', label: 'Môn học', type: 'choice', options: ['Toán', 'Văn', 'Tiếng Anh', 'Vật lý', 'Hóa học', 'Sinh học', 'Lập trình', 'Khác'], required: true },
    { key: 'grade', label: 'Cấp học', type: 'choice', options: ['Tiểu học', 'THCS', 'THPT', 'Đại học', 'Người đi làm'], required: true }
  ]
}
```

### massage — Massage tại nhà
```typescript
{
  id: 'massage',
  name: 'Massage tại nhà',
  icon: '💆',
  category: 'beauty',
  description: 'Massage thư giãn, bấm huyệt, vật lý trị liệu tại nhà',
  keywords: ['massage', 'mát xa', 'bấm huyệt', 'thư giãn', 'đau lưng', 'đau vai', 'gáy', 'vật lý trị liệu'],
  requiredSkills: ['massage', 'bấm huyệt', 'vật lý trị liệu'],
  typicalPricing: { min: 250000, max: 600000, currency: 'VND' },
  questions: [
    'Massage loại gì?',
    'Bao nhiêu phút?',
    'Có vấn đề sức khỏe gì cần lưu ý không?'
  ],
  quickActions: [
    { type: 'quote', label: '💰 Báo giá', icon: '💰' },
    { type: 'create_order', label: '📅 Đặt lịch', icon: '📅' }
  ],
  diagnosisFields: [
    { key: 'massage_type', label: 'Loại massage', type: 'choice', options: ['Thư giãn', 'Bấm huyệt', 'Thể thao', 'Vật lý trị liệu', 'Bầu'], required: true },
    { key: 'duration', label: 'Thời gian (phút)', type: 'choice', options: ['60', '90', '120'], required: true }
  ]
}
```

---

## 6. Dynamic Loading from DB

Trong tương lai, services được load từ database:

```sql
CREATE TABLE service_definitions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  required_skills TEXT[] NOT NULL DEFAULT '{}',
  typical_pricing_min INTEGER NOT NULL,
  typical_pricing_max INTEGER NOT NULL,
  questions TEXT[] DEFAULT '{}',
  diagnosis_fields JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

```typescript
// Load từ DB thay vì hardcode
async function loadServices(supabase: any) {
  const { data } = await supabase
    .from('service_definitions')
    .select('*')
    .eq('is_active', true);

  for (const def of data) {
    serviceRegistry.register(mapToServiceDefinition(def));
  }
}
```

---

## 7. Service Activation Roadmap

```
Tháng 1-2: repair (hiện tại)
Tháng 3: + cleaning, + ac_cleaning
Tháng 4: + delivery
Tháng 5: + moving
Tháng 6: + elder_care, + child_care, + pet_care
Tháng 7: + tutoring, + massage, + beauty
Tháng 8: + b2b (office_maintenance, commercial_cleaning)
```

---

## 8. Multi-Service Order

Một user có thể yêu cầu nhiều dịch vụ trong 1 goal:

```
User: "Dọn nhà và sửa máy lạnh"

AI:
1. Detect: cleaning + repair (2 services)
2. Plan: [cleaning.quote, repair.diagnose, ...]
3. Mỗi service tạo order riêng
4. Hiển thị tổng chi phí: Dọn nhà 300K + Sửa máy lạnh 500K = 800K
5. Tối ưu: tìm thợ có thể làm cả 2 (nếu có)
```