import type { ChatContext, ChatIntent, ChatSlots, GeoLocation } from './types.ts';

export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  air_conditioning: ['máy lạnh', 'điều hòa', 'aircon', 'ac', 'không mát', 'chảy nước máy lạnh', 'bơm gas'],
  plumbing: ['rò nước', 'ống nước', 'vòi', 'bồn cầu', 'nghẹt', 'thông tắc', 'nước chảy'],
  electricity: ['mất điện', 'chập điện', 'ổ cắm', 'cầu dao', 'đèn', 'dây điện', 'aptomat', 'sửa điện'],
  appliance: ['tủ lạnh', 'máy giặt', 'bếp', 'lò vi sóng', 'máy nước nóng', 'gia dụng'],
  camera: ['camera', 'cctv', 'an ninh', 'đầu ghi'],
};

export const URGENCY_KEYWORDS: Record<NonNullable<ChatSlots['urgency']>, string[]> = {
  emergency: ['cháy', 'khét', 'rò gas', 'giật điện', 'ngập', 'cấp cứu', 'nguy hiểm'],
  high: ['gấp', 'ngay', 'hôm nay', 'càng sớm', 'khẩn'],
  medium: ['ngày mai', 'tuần này', 'sớm'],
  low: ['không gấp', 'khi nào cũng được', 'bảo trì', 'kiểm tra định kỳ'],
};

export const CONFIRM_KEYWORDS = ['chốt', 'đồng ý', 'xác nhận', 'đặt lịch', 'tạo đơn', 'ok chốt', 'book', 'confirm'];
export const NEGATIVE_KEYWORDS = ['không chốt', 'chưa chốt', 'để sau', 'không đồng ý', 'hủy'];

export function isGeoLocation(value: unknown): value is GeoLocation {
  if (!value || typeof value !== 'object') return false;
  const maybe = value as Record<string, unknown>;
  return typeof maybe.lat === 'number' && typeof maybe.lng === 'number'
    && Number.isFinite(maybe.lat) && Number.isFinite(maybe.lng);
}

export function normalizeMessage(message: string) {
  return message.toLowerCase().trim();
}

export function detectCategory(message: string): string | undefined {
  const text = normalizeMessage(message);
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(keyword => text.includes(keyword))) return category;
  }
  return undefined;
}

export function detectUrgency(message: string): ChatSlots['urgency'] | undefined {
  const text = normalizeMessage(message);
  for (const urgency of ['emergency', 'high', 'medium', 'low'] as const) {
    if (URGENCY_KEYWORDS[urgency]?.some(keyword => text.includes(keyword))) return urgency;
  }
  return undefined;
}

export function detectIntent(message: string): ChatIntent {
  const text = normalizeMessage(message);
  if (CONFIRM_KEYWORDS.some(keyword => text.includes(keyword)) && !NEGATIVE_KEYWORDS.some(keyword => text.includes(keyword))) return 'confirm';
  if (text.includes('bảo hành')) return 'warranty';
  if (text.includes('khiếu nại') || text.includes('phàn nàn')) return 'complaint';
  if (text.includes('tình trạng') || text.includes('đơn của tôi')) return 'status';
  if (text.includes('giá') || text.includes('bao nhiêu') || text.includes('báo giá')) return 'quote';
  return 'book';
}

export function detectPreferredTime(message: string): string | undefined {
  const text = normalizeMessage(message);
  if (text.includes('chiều nay')) return 'chiều nay';
  if (text.includes('sáng nay')) return 'sáng nay';
  if (text.includes('tối nay')) return 'tối nay';
  if (text.includes('hôm nay')) return 'hôm nay';
  if (text.includes('ngày mai')) return 'ngày mai';
  const hourMatch = text.match(/(\d{1,2})\s*(h|giờ)/);
  if (hourMatch) return `${hourMatch[1]} giờ`;
  return undefined;
}

export function detectLocationText(message: string): string | undefined {
  const text = message.trim();
  const locationMatch = text.match(/(?:ở|tai|tại|dia chi|địa chỉ)\s+(.{3,120})/i);
  if (locationMatch?.[1]) return locationMatch[1].trim();
  const districtMatch = text.match(/(quận\s*\d+|q\.?\s*\d+|thủ đức|bình thạnh|gò vấp|tân bình|phú nhuận|nhà bè|bình chánh)/i);
  if (districtMatch?.[1]) return districtMatch[1].trim();
  return undefined;
}

export function extractSlots(message: string, context: Partial<ChatContext>): ChatContext {
  const incomingLocation = context.location;
  const next: ChatContext = {
    ...context,
    media_urls: Array.isArray(context.media_urls) ? context.media_urls : [],
    risk_flags: Array.isArray(context.risk_flags) ? context.risk_flags : [],
  };

  next.category ||= detectCategory(message);
  next.description ||= message.length >= 8 ? message : undefined;
  next.urgency ||= detectUrgency(message);
  next.preferred_time ||= detectPreferredTime(message);

  if (isGeoLocation(incomingLocation)) next.location = incomingLocation;
  next.location_text ||= detectLocationText(message);

  const text = normalizeMessage(message);
  const hasNegative = NEGATIVE_KEYWORDS.some(keyword => text.includes(keyword));
  const hasConfirm = CONFIRM_KEYWORDS.some(keyword => text.includes(keyword));
  if (hasConfirm && !hasNegative) next.customer_confirmation = true;
  if (hasNegative) next.customer_confirmation = false;

  const riskFlags = new Set(next.risk_flags || []);
  if (next.urgency === 'emergency') riskFlags.add('safety');
  if (text.includes('rẻ nhất') || text.includes('quá mắc') || text.includes('quá đắt')) riskFlags.add('price_sensitive');
  next.risk_flags = [...riskFlags];
  next.intent = detectIntent(message);

  return next;
}
