import type { ChatContext, ChatState } from './types.ts';

export interface GoldenCase {
  name: string;
  message: string;
  context?: Partial<ChatContext>;
  expected: {
    category?: string;
    urgency?: ChatContext['urgency'];
    intent?: ChatContext['intent'];
    customer_confirmation?: boolean;
    state?: ChatState;
    missingIncludes?: string[];
    missingExcludes?: string[];
    actionTypes?: string[];
    riskFlags?: string[];
  };
}

const fullBookingContext: Partial<ChatContext> = {
  category: 'air_conditioning',
  description: 'Máy lạnh không mát',
  location: { lat: 10.77, lng: 106.69 },
  urgency: 'high',
  preferred_time: 'chiều nay',
  diagnosis: { diagnosis: 'Có thể thiếu gas hoặc dàn lạnh bẩn', severity: 'high' },
  quote: { estimated_price: 450000, confidence: 0.7 },
};

export const goldenCases: GoldenCase[] = [
  {
    name: 'air conditioner without location asks for location',
    message: 'Máy lạnh không mát cần sửa hôm nay',
    expected: {
      category: 'air_conditioning',
      urgency: 'high',
      state: 'slot_filling',
      missingIncludes: ['location', 'customer_confirmation'],
      actionTypes: ['share_location'],
    },
  },
  {
    name: 'air conditioner leaking with location still asks preferred time',
    message: 'Máy lạnh chảy nước ở quận 1 cần gấp',
    context: { location: { lat: 10.77, lng: 106.69 } },
    expected: {
      category: 'air_conditioning',
      urgency: 'high',
      state: 'slot_filling',
      missingIncludes: ['preferred_time'],
      missingExcludes: ['location'],
    },
  },
  {
    name: 'plumbing full slots without confirmation enters diagnosis',
    message: 'Vòi nước rò rỉ chiều nay',
    context: { location: { lat: 10.77, lng: 106.69 }, urgency: 'medium' },
    expected: {
      category: 'plumbing',
      state: 'diagnosis',
      missingIncludes: ['customer_confirmation'],
      missingExcludes: ['location', 'preferred_time'],
    },
  },
  {
    name: 'confirmed full booking creates order state',
    message: 'Tôi xác nhận tạo đơn',
    context: fullBookingContext,
    expected: {
      intent: 'confirm',
      customer_confirmation: true,
      state: 'order_creation',
      missingExcludes: ['customer_confirmation'],
    },
  },
  {
    name: 'negative confirmation does not create order',
    message: 'Chưa chốt nhé',
    context: fullBookingContext,
    expected: {
      customer_confirmation: false,
      state: 'confirmation',
      missingIncludes: ['customer_confirmation'],
    },
  },
  {
    name: 'explicit disagreement does not create order',
    message: 'Không đồng ý tạo đơn',
    context: fullBookingContext,
    expected: {
      customer_confirmation: false,
      state: 'confirmation',
      missingIncludes: ['customer_confirmation'],
    },
  },
  {
    name: 'gas leak escalates',
    message: 'Bếp có mùi rò gas rất nguy hiểm',
    context: { location: { lat: 10.77, lng: 106.69 }, preferred_time: 'ngay' },
    expected: {
      urgency: 'emergency',
      state: 'escalated',
      riskFlags: ['safety'],
      actionTypes: ['talk_to_human'],
    },
  },
  {
    name: 'burning electrical issue escalates',
    message: 'Ổ cắm chập điện có mùi khét cần sửa ngay',
    context: { location: { lat: 10.77, lng: 106.69 }, preferred_time: 'ngay' },
    expected: {
      category: 'electricity',
      urgency: 'emergency',
      state: 'escalated',
      riskFlags: ['safety'],
    },
  },
  {
    name: 'price question detects quote intent',
    message: 'Sửa máy lạnh giá bao nhiêu?',
    expected: {
      category: 'air_conditioning',
      intent: 'quote',
      state: 'slot_filling',
    },
  },
  {
    name: 'warranty question detects warranty intent',
    message: 'Tôi muốn hỏi bảo hành đơn sửa máy giặt',
    expected: {
      category: 'appliance',
      intent: 'warranty',
    },
  },
  {
    name: 'complaint question detects complaint intent',
    message: 'Tôi muốn khiếu nại chất lượng sửa chữa',
    expected: {
      intent: 'complaint',
    },
  },
  {
    name: 'web geolocation context satisfies location slot',
    message: 'Tôi đã gửi vị trí hiện tại',
    context: { category: 'plumbing', description: 'Nước rò rỉ', location: { lat: 10.77, lng: 106.69 }, urgency: 'high', preferred_time: 'chiều nay' },
    expected: {
      state: 'diagnosis',
      missingExcludes: ['location'],
    },
  },
  {
    name: 'mobile location context satisfies location slot',
    message: 'Tôi ở đây',
    context: { category: 'camera', description: 'Lắp camera', location: { lat: 10.8, lng: 106.7 }, urgency: 'medium', preferred_time: 'ngày mai' },
    expected: {
      state: 'diagnosis',
      missingExcludes: ['location'],
    },
  },
  {
    name: 'no message category asks problem capture',
    message: 'Xin chào',
    expected: {
      state: 'problem_capture',
      missingIncludes: ['category'],
    },
  },
  {
    name: 'tomorrow maps medium urgency and preferred time',
    message: 'Ngày mai qua sửa tủ lạnh không lạnh giúp tôi',
    context: { location: { lat: 10.77, lng: 106.69 } },
    expected: {
      category: 'appliance',
      urgency: 'medium',
      state: 'diagnosis',
      missingExcludes: ['preferred_time'],
    },
  },
  {
    name: 'low urgency maintenance',
    message: 'Tôi muốn bảo trì máy lạnh khi nào cũng được',
    expected: {
      category: 'air_conditioning',
      urgency: 'low',
    },
  },
  {
    name: 'price sensitive adds risk flag',
    message: 'Sửa camera giá rẻ nhất được không',
    expected: {
      category: 'camera',
      intent: 'quote',
      riskFlags: ['price_sensitive'],
    },
  },
  {
    name: 'confirmation card action appears when quote exists and only confirmation missing',
    message: 'Báo giá ok không?',
    context: fullBookingContext,
    expected: {
      state: 'confirmation',
      actionTypes: ['confirmation_card', 'quote_card'],
    },
  },
  {
    name: 'view order action appears after handoff',
    message: 'Tôi xác nhận tạo đơn',
    context: fullBookingContext,
    expected: {
      state: 'order_creation',
      customer_confirmation: true,
    },
  },
  {
    name: 'location text alone does not satisfy geolocation slot',
    message: 'Tôi ở quận 3 sửa điện hôm nay',
    expected: {
      category: 'electricity',
      state: 'slot_filling',
      missingIncludes: ['location'],
    },
  },
];
