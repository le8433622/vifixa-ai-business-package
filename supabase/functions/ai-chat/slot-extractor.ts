import type { ChatContext, ChatIntent, ChatSlots, GeoLocation } from './types.ts';

export interface LocationData {
  districtNames: string[];
  provinceNames: string[];
  allNames: string[];
}

export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  air_conditioning: ['máy lạnh', 'điều hòa', 'aircon', 'ac', 'không mát', 'chảy nước máy lạnh', 'bơm gas', 'không lạnh', 'yếu lạnh', 'vệ sinh máy lạnh', 'máy lanh'],
  plumbing: ['rò nước', 'ống nước', 'vòi', 'bồn cầu', 'nghẹt', 'thông tắc', 'nước chảy', 'rỉ nước', 'bồn rửa', 'lavabo', 'nước rò', 'ống rò'],
  electricity: ['mất điện', 'chập điện', 'ổ cắm', 'cầu dao', 'đèn', 'dây điện', 'aptomat', 'sửa điện', 'điện yếu', 'nhấp nháy', 'chập cháy', 'cháy dây'],
  appliance: ['tủ lạnh', 'máy giặt', 'bếp', 'lò vi sóng', 'máy nước nóng', 'gia dụng', 'bình nóng lạnh', 'máy sấy', 'quạt', 'quạt trần'],
  camera: ['camera', 'cctv', 'an ninh', 'đầu ghi', 'lắp camera', 'camera wifi'],
  painting: ['sơn', 'sơn nhà', 'sơn tường', 'chống thấm', 'trát tường', 'trám vá', 'nứt tường'],
  lock_smith: ['khóa', 'khóa cửa', 'mất chìa', 'khóa thông minh', 'sửa khóa'],
};

export const URGENCY_KEYWORDS: Record<NonNullable<ChatSlots['urgency']>, string[]> = {
  emergency: ['cháy', 'khét', 'rò gas', 'giật điện', 'ngập', 'cấp cứu', 'nguy hiểm', 'nước ngập', 'chập cháy'],
  high: ['gấp', 'ngay', 'hôm nay', 'càng sớm', 'khẩn', 'bây giờ', 'ngay bây giờ', 'gấp lắm'],
  medium: ['ngày mai', 'tuần này', 'sớm', 'mai', 'trong tuần'],
  low: ['không gấp', 'khi nào cũng được', 'bảo trì', 'kiểm tra định kỳ', 'rảnh', 'cuối tuần'],
};

export const CONFIRM_KEYWORDS = ['chốt', 'đồng ý', 'xác nhận', 'đặt lịch', 'tạo đơn', 'ok chốt', 'book', 'confirm', 'ok', 'oke', 'được', 'chốt đơn', 'đặt ngay', 'đặt đi', 'làm đi'];
export const NEGATIVE_KEYWORDS = ['không chốt', 'chưa chốt', 'để sau', 'không đồng ý', 'hủy', 'thôi', 'không cần', 'chưa cần'];

const FALLBACK_DISTRICTS: string[] = [
  'quận 1', 'quận 2', 'quận 3', 'quận 4', 'quận 5', 'quận 6', 'quận 7', 'quận 8', 'quận 9', 'quận 10', 'quận 11', 'quận 12',
  'thủ đức', 'bình thạnh', 'gò vấp', 'tân bình', 'tân phú', 'phú nhuận', 'bình tân',
  'nhà bè', 'bình chánh', 'hóc môn', 'củ chi', 'cần giờ',
  'hoàn kiếm', 'ba đình', 'đống đa', 'hai bà trưng', 'hoàng mai', 'thanh xuân',
  'cầu giấy', 'nam từ liêm', 'bắc từ liêm', 'long biên', 'tây hồ', 'hà đông',
  'hải châu', 'thanh khê', 'sơn trà', 'ngũ hành sơn', 'liên chiểu', 'cẩm lệ', 'hòa vang',
  'ninh kiều', 'bình thủy', 'cái răng', 'ô môn', 'thốt nốt', 'vĩnh thạnh', 'cờ đỏ', 'phong điền',
  'hồng bàng', 'ngô quyền', 'lê chân', 'hải an', 'kiến an', 'đồ sơn', 'dương kinh', 'thủy nguyên', 'an dương',
];

const FALLBACK_PROVINCES: string[] = [
  'hồ chí minh', 'hà nội', 'đà nẵng', 'cần thơ', 'hải phòng',
  'bình dương', 'đồng nai', 'bà rịa vũng tàu', 'long an', 'tây ninh',
  'bắc ninh', 'hưng yên', 'hải dương', 'vĩnh phúc', 'quảng ninh',
  'quảng nam', 'khánh hòa', 'bình thuận',
  'an giang', 'kiên giang', 'tiền giang', 'bến tre', 'vĩnh long', 'đồng tháp', 'cà mau', 'sóc trăng', 'bạc liêu',
  'lâm đồng', 'đắk lắk', 'gia lai', 'kon tum',
  'nghệ an', 'thanh hóa', 'thừa thiên huế',
];

export const FALLBACK_LOCATION_DATA: LocationData = {
  districtNames: FALLBACK_DISTRICTS,
  provinceNames: FALLBACK_PROVINCES,
  allNames: [...FALLBACK_DISTRICTS, ...FALLBACK_PROVINCES],
};

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
  // Specific time patterns
  if (text.includes('chiều nay')) return 'chiều nay';
  if (text.includes('sáng nay')) return 'sáng nay';
  if (text.includes('tối nay')) return 'tối nay';
  if (text.includes('trưa nay')) return 'trưa nay';
  if (text.includes('hôm nay')) return 'hôm nay';
  if (text.includes('ngày mai') || text.includes('mai')) return 'ngày mai';
  if (text.includes('sáng mai')) return 'sáng mai';
  if (text.includes('chiều mai')) return 'chiều mai';
  if (text.includes('cuối tuần')) return 'cuối tuần';
  // Hour patterns: "9h", "9 giờ", "lúc 9h sáng"
  const hourMatch = text.match(/(?:lúc\s*)?(\d{1,2})\s*(h|giờ)\s*(sáng|chiều|tối)?/);
  if (hourMatch) {
    const h = parseInt(hourMatch[1]);
    const period = hourMatch[3] || (h < 12 ? 'sáng' : 'chiều');
    return `${h} giờ ${period}`;
  }
  return undefined;
}

export function detectLocationText(message: string, locationData?: LocationData): string | undefined {
  const text = normalizeMessage(message);

  // Explicit location patterns: "ở quận 7", "tại Bình Thạnh"
  const locationMatch = text.match(/(?:ở|tai|tại|dia chi|địa chỉ|nhà ở|khu vực)\s+(.{3,120})/i);
  if (locationMatch?.[1]) return locationMatch[1].trim();

  // Short form: Q7, Q.7, q7
  const districtShort = text.match(/(?:^|\s)q\.?\s*(\d{1,2})(?:\s|$|,)/);
  if (districtShort) return `quận ${districtShort[1]}`;

  const data = locationData || FALLBACK_LOCATION_DATA;

  for (const name of data.allNames) {
    if (text.includes(name)) return name;
  }

  return undefined;
}

export async function loadLocationData(supabase: any): Promise<LocationData> {
  try {
    const { data: districts } = await supabase
      .from('vietnam_administrative_divisions')
      .select('name')
      .eq('type', 'district');

    const { data: provincesShort } = await supabase
      .from('vietnam_administrative_divisions')
      .select('name_short')
      .eq('type', 'province');

    const { data: provincesFull } = await supabase
      .from('vietnam_administrative_divisions')
      .select('name')
      .eq('type', 'province');

    if (districts?.length && provincesShort?.length) {
      const districtNames = districts.map((d: { name: string }) => d.name.toLowerCase());
      const provinceNames = provincesShort.map((p: { name_short: string }) => p.name_short.toLowerCase());
      const fullProvinceNames = provincesFull?.map((p: { name: string }) => p.name.toLowerCase()) || [];
      return {
        districtNames,
        provinceNames,
        allNames: [...districtNames, ...provinceNames, ...fullProvinceNames],
      };
    }
  } catch (e) {
    console.warn('Failed to load location data from DB, using fallback:', e);
  }
  return FALLBACK_LOCATION_DATA;
}

/**
 * SMART EXTRACTION: Extract ALL possible entities from a single message.
 * User can say "Máy lạnh hư, ở quận 7, mai sáng 9h" and we extract everything.
 */
export async function extractSlots(message: string, context: Partial<ChatContext>, locationData?: LocationData): Promise<ChatContext> {
  const incomingLocation = context.location;
  const next: ChatContext = {
    ...context,
    media_urls: Array.isArray(context.media_urls) ? context.media_urls : [],
    risk_flags: Array.isArray(context.risk_flags) ? context.risk_flags : [],
  };

  // Extract ALL entities from the message simultaneously (mixed-initiative)
  const detectedCategory = detectCategory(message);
  const detectedUrgency = detectUrgency(message);
  const detectedTime = detectPreferredTime(message);
  const detectedLocation = detectLocationText(message, locationData);

  // Only override if not already set (preserve earlier context)
  next.category ||= detectedCategory;
  next.urgency ||= detectedUrgency;
  next.preferred_time ||= detectedTime;

  // Description: use message if it's descriptive enough
  if (!next.description && message.length >= 8) {
    next.description = message;
  } else if (next.description && message.length >= 15 && !CONFIRM_KEYWORDS.some(k => normalizeMessage(message).includes(k))) {
    // Append additional context if user provides more details
    next.description = next.description + '. ' + message;
  }

  if (isGeoLocation(incomingLocation)) next.location = incomingLocation;
  if (detectedLocation) next.location_text = detectedLocation;
  // If we have location_text but no geo, treat location_text as sufficient
  if (next.location_text && !next.location) {
    next.location = next.location_text as any;
  }

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

