// 📐 Vifixa Service Registry — Plugin Architecture
// Core system: minimal, stable
// Plugins: mọi dịch vụ trong cuộc sống (🔧🧹👨‍🏫👩‍⚕️🚗...)

import { logVifixa } from './logger.ts'

export interface ServiceProvider {
  id: string
  name: string
  icon: string
  description: string
}

export interface PriceRange {
  min: number
  max: number
  currency: 'VND' | 'USD'
}

export interface ServiceAction {
  type: string
  label: string
  icon?: string
}

// ─── EVERY SERVICE IMPLEMENTS THIS ──────────────────────────
export interface ServiceDefinition {
  id: string
  name: string
  icon: string
  category: string
  description: string
  
  // AI context
  keywords: string[]           // Từ khóa để AI nhận diện service này
  requiredSkills: string[]
  typicalPricing: PriceRange
  
  // UI Hints
  questions: string[]          // Câu hỏi AI nên hỏi user
  quickActions: ServiceAction[]
  
  // Diagnosis hints
  diagnosisFields: Array<{
    key: string
    label: string
    type: 'text' | 'image' | 'location' | 'choice'
    options?: string[]
    required: boolean
  }>

  // Optional lifecycle hooks
  onDiagnose?: (input: any) => Promise<any>
  onQuote?: (diagnosis: any) => Promise<any>
  onMatch?: (quote: any, providers: ServiceProvider[]) => Promise<any>
  onComplete?: (order: any) => Promise<any>
}

// ─── SERVICE PLUGIN REGISTRY ────────────────────────────────

class ServiceRegistry {
  private services = new Map<string, ServiceDefinition>()
  
  register(service: ServiceDefinition) {
    this.services.set(service.id, service)
    logVifixa('service-registry', 'registered', { icon: service.icon, name: service.name })
  }
  
  get(id: string): ServiceDefinition | undefined {
    return this.services.get(id)
  }
  
  getAll(): ServiceDefinition[] {
    return Array.from(this.services.values())
  }
  
  detect(text: string): ServiceDefinition[] {
    const lower = text.toLowerCase()
    const matched: Array<{ service: ServiceDefinition; score: number }> = []
    
    for (const service of this.services.values()) {
      let score = 0
      for (const kw of service.keywords) {
        if (lower.includes(kw.toLowerCase())) score += 10
      }
      if (score > 0) matched.push({ service, score })
    }
    
    return matched.sort((a, b) => b.score - a.score).map(m => m.service)
  }
  
  // Future: dynamic loading from DB
  async loadFromDatabase(supabase: any) {
    const { data } = await supabase.from('service_definitions').select('*')
    if (data) {
      for (const def of data) {
        this.register(def as ServiceDefinition)
      }
    }
  }
}

export const serviceRegistry = new ServiceRegistry()

// ─── BUILT-IN SERVICES (khởi đầu với thợ sửa chữa) ─────────

serviceRegistry.register({
  id: 'repair',
  name: 'Sửa chữa thiết bị',
  icon: '🔧',
  category: 'home_services',
  description: 'Sửa máy lạnh, điện nước, camera, đồ gia dụng...',
  
  keywords: [
    'sửa', 'chữa', 'hỏng', 'hư', 'máy lạnh', 'điều hòa', 'điện',
    'nước', 'rò rỉ', 'camera', 'tủ lạnh', 'máy giặt', 'bếp',
    'lò vi sóng', 'bình nóng lạnh', 'bồn cầu', 'ống nước',
    'không mát', 'không lạnh', 'không chạy', 'chập', 'cháy',
  ],
  requiredSkills: ['sửa chữa', 'bảo trì', 'kỹ thuật'],
  typicalPricing: { min: 150000, max: 2000000, currency: 'VND' },
  
  questions: [
    'Thiết bị nào đang gặp vấn đề?',
    'Vấn đề cụ thể là gì?',
    'Đã bao lâu từ khi mua?',
    'Có thể gửi ảnh không?',
  ],
  quickActions: [
    { type: 'diagnose', label: '🔍 Chẩn đoán', icon: '🔍' },
    { type: 'estimate_price', label: '💰 Báo giá', icon: '💰' },
    { type: 'match_worker', label: '🔧 Tìm thợ', icon: '🔧' },
    { type: 'track_order', label: '🗺️ Theo dõi', icon: '🗺️' },
  ],
  
  diagnosisFields: [
    { key: 'device_type', label: 'Loại thiết bị', type: 'choice',
      options: ['Máy lạnh', 'Tủ lạnh', 'Máy giặt', 'Bình nóng lạnh', 'Camera', 'Khác'],
      required: true },
    { key: 'problem', label: 'Vấn đề', type: 'text', required: true },
    { key: 'images', label: 'Ảnh sự cố', type: 'image', required: false },
    { key: 'location', label: 'Vị trí', type: 'location', required: true },
  ],
})

// ─── MULTI-SERVICE EXPANSION (8 services) ─────────────────

serviceRegistry.register({
  id: 'cleaning',
  name: 'Dọn dẹp nhà cửa',
  icon: '🧹',
  category: 'home_services',
  description: 'Dọn nhà, lau kính, tổng vệ sinh, giặt ủi...',
  keywords: ['dọn', 'lau', 'vệ sinh', 'sạch', 'nhà cửa', 'phòng', 'bếp', 'toilet', 'tổng vệ sinh', 'giặt ủi', 'dọn văn phòng'],
  requiredSkills: ['dọn dẹp', 'vệ sinh', 'lau chùi'],
  typicalPricing: { min: 90000, max: 480000, currency: 'VND' },
  questions: ['Diện tích bao nhiêu m²?', 'Loại dọn dẹp (cơ bản hay tổng vệ sinh)?', 'Có mấy phòng?', 'Thời gian mong muốn?'],
  quickActions: [
    { type: 'diagnose', label: '🧹 Đánh giá', icon: '🧹' },
    { type: 'estimate_price', label: '💰 Báo giá', icon: '💰' },
    { type: 'match_worker', label: '🔧 Tìm thợ dọn', icon: '🔧' },
  ],
  diagnosisFields: [
    { key: 'property_type', label: 'Loại nhà', type: 'choice', options: ['Căn hộ', 'Nhà phố', 'Văn phòng'], required: true },
    { key: 'area_sqm', label: 'Diện tích (m²)', type: 'text', required: true },
    { key: 'cleaning_type', label: 'Loại dọn', type: 'choice', options: ['Cơ bản', 'Tổng vệ sinh', 'Sau xây dựng'], required: true },
    { key: 'location', label: 'Vị trí', type: 'location', required: true },
  ],
})

serviceRegistry.register({
  id: 'delivery',
  name: 'Giao hàng',
  icon: '📦',
  category: 'logistics',
  description: 'Giao hàng xe máy, hỏa tốc, mua hộ...',
  keywords: ['giao', 'ship', 'vận chuyển', 'chuyển đồ', 'mua hộ', 'giao hàng', 'hỏa tốc', 'siêu tốc', 'xe máy'],
  requiredSkills: ['giao hàng', 'shipper', 'vận chuyển'],
  typicalPricing: { min: 15000, max: 250000, currency: 'VND' },
  questions: ['Lấy hàng ở đâu?', 'Giao đến đâu?', 'Món đồ gì, nặng bao nhiêu?', 'Cần gấp không?'],
  quickActions: [
    { type: 'estimate_price', label: '💰 Báo giá', icon: '💰' },
    { type: 'match_worker', label: '📦 Tìm shipper', icon: '📦' },
  ],
  diagnosisFields: [
    { key: 'pickup_address', label: 'Địa chỉ lấy hàng', type: 'text', required: true },
    { key: 'dropoff_address', label: 'Địa chỉ giao', type: 'text', required: true },
    { key: 'package_weight', label: 'Cân nặng (kg)', type: 'text', required: true },
    { key: 'delivery_type', label: 'Loại giao', type: 'choice', options: ['Tiêu chuẩn', 'Hỏa tốc', 'Siêu tốc'], required: true },
  ],
})

serviceRegistry.register({
  id: 'moving',
  name: 'Chuyển nhà',
  icon: '🚚',
  category: 'logistics',
  description: 'Chuyển nhà trọn gói, xe tải các loại...',
  keywords: ['chuyển nhà', 'dọn nhà', 'chuyển văn phòng', 'xe tải', 'ba gác', 'chuyển đồ'],
  requiredSkills: ['chuyển nhà', 'vận chuyển', 'bốc xếp'],
  typicalPricing: { min: 1200000, max: 5000000, currency: 'VND' },
  questions: ['Từ đâu đến đâu?', 'Nhà mấy phòng ngủ?', 'Cần xe tải bao nhiêu tấn?', 'Có đồ cồng kềnh không?'],
  quickActions: [
    { type: 'estimate_price', label: '💰 Báo giá', icon: '💰' },
    { type: 'match_worker', label: '🚚 Tìm đội', icon: '🚚' },
  ],
  diagnosisFields: [
    { key: 'property_type', label: 'Loại nhà', type: 'choice', options: ['1 phòng ngủ', '2 phòng ngủ', '3+ phòng ngủ', 'Văn phòng'], required: true },
    { key: 'from_address', label: 'Địa chỉ đi', type: 'text', required: true },
    { key: 'to_address', label: 'Địa chỉ đến', type: 'text', required: true },
    { key: 'location', label: 'Vị trí', type: 'location', required: false },
  ],
})

serviceRegistry.register({
  id: 'elder_care',
  name: 'Chăm sóc người già',
  icon: '👴',
  category: 'care',
  description: 'Chăm sóc người cao tuổi, điều dưỡng tại nhà...',
  keywords: ['chăm sóc', 'người già', 'cao tuổi', 'điều dưỡng', 'bệnh nền', 'trông người'],
  requiredSkills: ['chăm sóc người già', 'điều dưỡng', 'y tế cơ bản'],
  typicalPricing: { min: 120000, max: 1800000, currency: 'VND' },
  questions: ['Người cần chăm bao nhiêu tuổi?', 'Có bệnh nền gì không?', 'Cần chăm mấy giờ/ngày?', 'Cần qua đêm không?'],
  quickActions: [
    { type: 'diagnose', label: '🩺 Đánh giá', icon: '🩺' },
    { type: 'estimate_price', label: '💰 Báo giá', icon: '💰' },
    { type: 'match_worker', label: '👴 Tìm điều dưỡng', icon: '👴' },
  ],
  diagnosisFields: [
    { key: 'care_type', label: 'Loại chăm sóc', type: 'choice', options: ['Cơ bản', 'Có bệnh nền', 'Qua đêm'], required: true },
    { key: 'hours_per_day', label: 'Số giờ/ngày', type: 'text', required: true },
    { key: 'medical_condition', label: 'Tình trạng sức khỏe', type: 'text', required: false },
    { key: 'location', label: 'Vị trí', type: 'location', required: true },
  ],
})

serviceRegistry.register({
  id: 'child_care',
  name: 'Trông trẻ',
  icon: '👶',
  category: 'care',
  description: 'Trông trẻ, dạy kèm, bảo mẫu tại nhà...',
  keywords: ['trông trẻ', 'giữ trẻ', 'bảo mẫu', 'trông bé', 'babysit', 'dạy trẻ'],
  requiredSkills: ['trông trẻ', 'giáo dục mầm non', 'bảo mẫu'],
  typicalPricing: { min: 100000, max: 250000, currency: 'VND' },
  questions: ['Bé bao nhiêu tuổi?', 'Cần trông mấy giờ?', 'Có cần dạy kèm không?'],
  quickActions: [
    { type: 'estimate_price', label: '💰 Báo giá', icon: '💰' },
    { type: 'match_worker', label: '👶 Tìm bảo mẫu', icon: '👶' },
  ],
  diagnosisFields: [
    { key: 'child_age', label: 'Tuổi của bé', type: 'text', required: true },
    { key: 'hours', label: 'Số giờ', type: 'text', required: true },
    { key: 'tutoring_needed', label: 'Cần dạy kèm?', type: 'choice', options: ['Có', 'Không'], required: true },
    { key: 'location', label: 'Vị trí', type: 'location', required: true },
  ],
})

serviceRegistry.register({
  id: 'pet_care',
  name: 'Chăm thú cưng',
  icon: '🐾',
  category: 'care',
  description: 'Tắm, cắt tỉa, dắt đi dạo, trông thú cưng...',
  keywords: ['chó', 'mèo', 'thú cưng', 'tắm chó', 'cắt lông', 'dắt đi dạo', 'trông thú', 'pet'],
  requiredSkills: ['chăm thú cưng', 'cắt tỉa', 'tắm chó mèo'],
  typicalPricing: { min: 80000, max: 500000, currency: 'VND' },
  questions: ['Thú cưng loại gì?', 'Cân nặng bao nhiêu?', 'Cần dịch vụ gì (tắm, cắt, dạo)?'],
  quickActions: [
    { type: 'estimate_price', label: '💰 Báo giá', icon: '💰' },
    { type: 'match_worker', label: '🐾 Tìm người chăm', icon: '🐾' },
  ],
  diagnosisFields: [
    { key: 'pet_type', label: 'Loài', type: 'choice', options: ['Chó', 'Mèo', 'Khác'], required: true },
    { key: 'pet_weight', label: 'Cân nặng (kg)', type: 'text', required: true },
    { key: 'service_type', label: 'Dịch vụ', type: 'choice', options: ['Tắm', 'Cắt tỉa', 'Dắt đi dạo', 'Trông'], required: true },
    { key: 'location', label: 'Vị trí', type: 'location', required: true },
  ],
})

serviceRegistry.register({
  id: 'tutoring',
  name: 'Gia sư',
  icon: '📚',
  category: 'education',
  description: 'Gia sư các môn, luyện thi, ngoại ngữ, lập trình...',
  keywords: ['gia sư', 'dạy', 'học', 'kèm', 'luyện thi', 'ngoại ngữ', 'toán', 'văn', 'anh', 'lập trình', 'tiếng'],
  requiredSkills: ['sư phạm', 'giảng dạy', 'ngoại ngữ'],
  typicalPricing: { min: 150000, max: 500000, currency: 'VND' },
  questions: ['Học môn gì?', 'Lớp mấy / trình độ?', 'Học bao nhiêu buổi/tuần?'],
  quickActions: [
    { type: 'diagnose', label: '📚 Đánh giá', icon: '📚' },
    { type: 'estimate_price', label: '💰 Báo giá', icon: '💰' },
    { type: 'match_worker', label: '👨‍🏫 Tìm gia sư', icon: '👨‍🏫' },
  ],
  diagnosisFields: [
    { key: 'subject', label: 'Môn học', type: 'choice', options: ['Toán', 'Văn', 'Anh', 'Lý', 'Hóa', 'Lập trình', 'Khác'], required: true },
    { key: 'grade_level', label: 'Trình độ', type: 'choice', options: ['Tiểu học', 'THCS', 'THPT', 'Đại học', 'Người đi làm'], required: true },
    { key: 'hours', label: 'Số giờ/buổi', type: 'text', required: true },
    { key: 'location', label: 'Vị trí', type: 'location', required: true },
  ],
})

serviceRegistry.register({
  id: 'massage',
  name: 'Massage tại nhà',
  icon: '💆',
  category: 'beauty_health',
  description: 'Massage thư giãn, bấm huyệt, vật lý trị liệu tại nhà...',
  keywords: ['massage', 'bấm huyệt', 'thư giãn', 'trị liệu', 'vật lý trị liệu', 'đau lưng', 'mỏi', 'spa'],
  requiredSkills: ['massage', 'bấm huyệt', 'vật lý trị liệu'],
  typicalPricing: { min: 250000, max: 600000, currency: 'VND' },
  questions: ['Loại massage nào?', 'Bao nhiêu phút?', 'Có vấn đề sức khỏe gì không?'],
  quickActions: [
    { type: 'estimate_price', label: '💰 Báo giá', icon: '💰' },
    { type: 'match_worker', label: '💆 Tìm KTV', icon: '💆' },
  ],
  diagnosisFields: [
    { key: 'massage_type', label: 'Loại massage', type: 'choice', options: ['Thư giãn 60ph', 'Thư giãn 90ph', 'Bấm huyệt 60ph', 'Thể thao 60ph', 'Vật lý trị liệu'], required: true },
    { key: 'duration', label: 'Thời lượng', type: 'text', required: false },
    { key: 'health_notes', label: 'Ghi chú sức khỏe', type: 'text', required: false },
    { key: 'location', label: 'Vị trí', type: 'location', required: true },
  ],
})

// ─── HELPER ─────────────────────────────────────────────────

export function formatPrice(amount: number, currency: 'VND' | 'USD' = 'VND'): string {
  if (currency === 'VND') return amount.toLocaleString('vi-VN') + '₫'
  return '$' + amount.toLocaleString('en-US')
}
