// 📐 Vifixa Service Registry — Plugin Architecture
// Core system: minimal, stable
// Plugins: mọi dịch vụ trong cuộc sống (🔧🧹👨‍🏫👩‍⚕️🚗...)

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
    console.log(`[ServiceRegistry] Registered: ${service.icon} ${service.name}`)
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

// ─── FUTURE SERVICES (chỉ cần thêm 1 block) ─────────────────

/*
serviceRegistry.register({
  id: 'cleaning',
  name: 'Dọn dẹp nhà cửa',
  icon: '🧹',
  category: 'home_services',
  description: 'Dọn nhà, lau kính, vệ sinh...',
  keywords: ['dọn', 'lau', 'vệ sinh', 'sạch', 'nhà cửa'],
  ...
})

serviceRegistry.register({
  id: 'tutoring',
  name: 'Gia sư',
  icon: '👨‍🏫',
  category: 'education',
  ...
})

serviceRegistry.register({
  id: 'healthcare',
  name: 'Chăm sóc sức khỏe',
  icon: '👩‍⚕️',
  category: 'health',
  ...
})
*/

// ─── HELPER ─────────────────────────────────────────────────

export function formatPrice(amount: number, currency: 'VND' | 'USD' = 'VND'): string {
  if (currency === 'VND') return amount.toLocaleString('vi-VN') + '₫'
  return '$' + amount.toLocaleString('en-US')
}
