import type { ChatContext, ChatIntent, ChatSlots, GeoLocation } from './types.ts'
import { createAICore } from '../_shared/ai-core.ts'

// ---- KEYWORD-BASED EXTRACTION (fast path) ----

export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  air_conditioning: ['máy lạnh', 'điều hòa', 'aircon', 'ac', 'không mát', 'chảy nước máy lạnh', 'bơm gas', 'không lạnh', 'yếu lạnh', 'vệ sinh máy lạnh', 'máy lanh'],
  plumbing: ['rò nước', 'ống nước', 'vòi', 'bồn cầu', 'nghẹt', 'thông tắc', 'nước chảy', 'rỉ nước', 'bồn rửa', 'lavabo', 'nước rò', 'ống rò'],
  electricity: ['mất điện', 'chập điện', 'ổ cắm', 'cầu dao', 'đèn', 'dây điện', 'aptomat', 'sửa điện', 'điện yếu', 'nhấp nháy', 'chập cháy', 'cháy dây'],
  appliance: ['tủ lạnh', 'máy giặt', 'bếp', 'lò vi sóng', 'máy nước nóng', 'bình nóng lạnh', 'máy sấy', 'quạt', 'quạt trần', 'gia dụng'],
  camera: ['camera', 'cctv', 'an ninh', 'đầu ghi', 'lắp camera', 'camera wifi'],
  painting: ['sơn', 'sơn nhà', 'sơn tường', 'chống thấm', 'trát tường', 'nứt tường'],
  lock_smith: ['khóa', 'khóa cửa', 'mất chìa', 'khóa thông minh', 'sửa khóa'],
}

export const URGENCY_KEYWORDS: Record<NonNullable<ChatSlots['urgency']>, string[]> = {
  emergency: ['cháy', 'khét', 'rò gas', 'giật điện', 'ngập', 'cấp cứu', 'nguy hiểm', 'nước ngập', 'chập cháy'],
  high: ['gấp', 'ngay', 'hôm nay', 'càng sớm', 'khẩn', 'bây giờ', 'ngay bây giờ', 'gấp lắm'],
  medium: ['ngày mai', 'tuần này', 'sớm', 'mai', 'trong tuần'],
  low: ['không gấp', 'khi nào cũng được', 'bảo trì', 'kiểm tra định kỳ', 'rảnh', 'cuối tuần'],
}

export const CONFIRM_KEYWORDS = ['chốt', 'đồng ý', 'xác nhận', 'đặt lịch', 'tạo đơn', 'ok chốt', 'book', 'confirm', 'ok', 'oke', 'được', 'chốt đơn', 'đặt ngay', 'làm đi']
export const NEGATIVE_KEYWORDS = ['không chốt', 'chưa chốt', 'để sau', 'không đồng ý', 'hủy', 'thôi', 'không cần']

const FALLBACK_LOCATIONS = {
  districts: ['quận 1', 'quận 2', 'quận 3', 'quận 4', 'quận 5', 'quận 6', 'quận 7', 'quận 8', 'quận 9', 'quận 10', 'quận 11', 'quận 12', 'thủ đức', 'bình thạnh', 'gò vấp', 'tân bình', 'tân phú', 'phú nhuận', 'bình tân', 'nhà bè', 'bình chánh', 'hóc môn', 'củ chi', 'cần giờ'],
  provinces: ['hồ chí minh', 'hà nội', 'đà nẵng', 'cần thơ', 'hải phòng', 'bình dương', 'đồng nai', 'bà rịa vũng tàu', 'long an'],
}

export function detectCategory(message: string): string | undefined {
  const text = message.toLowerCase().trim()
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(k => text.includes(k))) return category
  }
  return undefined
}

export function detectUrgency(message: string): ChatSlots['urgency'] | undefined {
  const text = message.toLowerCase().trim()
  for (const urgency of ['emergency', 'high', 'medium', 'low'] as const) {
    if (URGENCY_KEYWORDS[urgency]?.some(k => text.includes(k))) return urgency
  }
  return undefined
}

export function detectIntent(message: string): ChatIntent {
  const text = message.toLowerCase().trim()
  if (CONFIRM_KEYWORDS.some(k => text.includes(k)) && !NEGATIVE_KEYWORDS.some(k => text.includes(k))) return 'confirm'
  if (text.includes('bảo hành')) return 'warranty'
  if (text.includes('khiếu nại') || text.includes('phàn nàn')) return 'complaint'
  if (text.includes('tình trạng') || text.includes('đơn của tôi')) return 'status'
  if (text.includes('giá') || text.includes('bao nhiêu') || text.includes('báo giá')) return 'quote'
  return 'book'
}

export function detectPreferredTime(message: string): string | undefined {
  const text = message.toLowerCase().trim()
  if (text.includes('chiều nay')) return 'chiều nay'
  if (text.includes('sáng nay')) return 'sáng nay'
  if (text.includes('tối nay')) return 'tối nay'
  if (text.includes('trưa nay')) return 'trưa nay'
  if (text.includes('hôm nay')) return 'hôm nay'
  if (text.includes('ngày mai') || text.includes('mai')) return 'ngày mai'
  if (text.includes('cuối tuần')) return 'cuối tuần'
  const hourMatch = text.match(/(?:lúc\s*)?(\d{1,2})\s*(h|giờ)\s*(sáng|chiều|tối)?/)
  if (hourMatch) {
    const h = parseInt(hourMatch[1])
    const period = hourMatch[3] || (h < 12 ? 'sáng' : 'chiều')
    return `${h} giờ ${period}`
  }
  return undefined
}

export function detectLocationText(message: string): string | undefined {
  const text = message.toLowerCase().trim()
  const locationMatch = text.match(/(?:ở|tai|tại|địa chỉ|nhà ở|khu vực)\s+(.{3,120})/i)
  if (locationMatch?.[1]) return locationMatch[1].trim()
  const districtShort = text.match(/(?:^|\s)q\.?\s*(\d{1,2})(?:\s|$|,)/)
  if (districtShort) return `quận ${districtShort[1]}`
  for (const name of [...FALLBACK_LOCATIONS.districts, ...FALLBACK_LOCATIONS.provinces]) {
    if (text.includes(name)) return name
  }
  return undefined
}

// ---- AI-POWERED EXTRACTION (slow path, higher accuracy) ----

export async function aiExtractSlots(
  supabase: any,
  message: string,
  context: Partial<ChatContext>,
): Promise<ChatContext> {
  try {
    const ai = createAICore(supabase)
    const result = await ai.orchestrateInternal('chat', async () => ({
      systemPrompt: `Bạn là chuyên gia trích xuất thông tin từ tin nhắn khách hàng.
Phân tích tin nhắn và trả về JSON với các trường:
- category: loại dịch vụ (air_conditioning|plumbing|electricity|appliance|camera|painting|lock_smith|general)
- urgency: độ khẩn cấp (low|medium|high|emergency) 
- description: mô tả sự cố
- location_text: địa điểm nếu có
- preferred_time: thời gian mong muốn nếu có
- intent: ý định (book|quote|confirm|complaint|warranty|status)
Chỉ trích xuất thông tin MỚI từ tin nhắn này. Các trường không có thì để null.`,
      userPrompt: `Tin nhắn: "${message}"
Context hiện tại: ${JSON.stringify({ category: context.category, location_text: context.location_text, urgency: context.urgency })}

Trả về JSON:`,
    }))

    if (!result.success) return {}

    const aiData = result.data
    const extracted: ChatContext = {}

    if (aiData.category && aiData.category !== 'general' && !context.category) extracted.category = aiData.category
    if (aiData.urgency && !context.urgency) extracted.urgency = aiData.urgency
    if (aiData.description && message.length >= 8 && !context.description) extracted.description = aiData.description
    if (aiData.location_text && !context.location_text) extracted.location_text = aiData.location_text
    if (aiData.preferred_time && !context.preferred_time) extracted.preferred_time = aiData.preferred_time
    if (aiData.intent && !context.intent) extracted.intent = aiData.intent

    return extracted
  } catch {
    return {}
  }
}

// ---- MAIN EXTRACTION PIPELINE ----

export async function extractSlots(
  message: string,
  context: Partial<ChatContext>,
  _locationData?: any,
  supabase?: any,
): Promise<ChatContext> {
  const next: ChatContext = {
    ...context,
    media_urls: Array.isArray(context.media_urls) ? context.media_urls : [],
    risk_flags: Array.isArray(context.risk_flags) ? context.risk_flags : [],
  }

  // 1. Fast keyword-based extraction
  const kwCategory = detectCategory(message)
  const kwUrgency = detectUrgency(message)
  const kwTime = detectPreferredTime(message)
  const kwLocation = detectLocationText(message)

  next.category ||= kwCategory
  next.urgency ||= kwUrgency
  next.preferred_time ||= kwTime
  if (kwLocation && !next.location_text) next.location_text = kwLocation

  // 2. Description: use message if descriptive enough
  if (!next.description && message.length >= 8) {
    next.description = message
  } else if (next.description && message.length >= 15 && !CONFIRM_KEYWORDS.some(k => message.toLowerCase().includes(k))) {
    next.description += '. ' + message
  }

  // 3. Confirmation detection
  const text = message.toLowerCase().trim()
  const hasNegative = NEGATIVE_KEYWORDS.some(k => text.includes(k))
  const hasConfirm = CONFIRM_KEYWORDS.some(k => text.includes(k))
  if (hasConfirm && !hasNegative) next.customer_confirmation = true
  if (hasNegative) next.customer_confirmation = false

  // 4. Risk flags
  const riskFlags = new Set(next.risk_flags || [])
  if (next.urgency === 'emergency') riskFlags.add('safety')
  if (text.includes('rẻ nhất') || text.includes('quá mắc') || text.includes('quá đắt')) riskFlags.add('price_sensitive')
  next.risk_flags = [...riskFlags]
  next.intent = detectIntent(message)

  // 5. AI-powered enrichment (async, non-blocking)
  if (supabase && (!next.category || !next.description || !next.location_text)) {
    try {
      const aiSlots = await aiExtractSlots(supabase, message, context)
      next.category ||= aiSlots.category
      next.urgency ||= aiSlots.urgency
      next.description ||= aiSlots.description
      next.location_text ||= aiSlots.location_text
      next.preferred_time ||= aiSlots.preferred_time
      next.intent ||= aiSlots.intent
    } catch { /* AI enrichment is best-effort */ }
  }

  return next
}