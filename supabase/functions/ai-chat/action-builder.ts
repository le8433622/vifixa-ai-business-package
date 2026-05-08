import type { ChatAction, ChatContext, ChatState } from './types.ts';

export function buildActions(state: ChatState, missingSlots: string[], context: ChatContext, orderId?: string): ChatAction[] {
  if (orderId) return [{ type: 'view_order', label: 'Xem đơn hàng', value: orderId }];

  const actions: ChatAction[] = [];
  if (missingSlots.includes('location')) {
    actions.push({ type: 'share_location', label: 'Gửi vị trí', value: 'share_location' });
  }
  if (!context.media_urls?.length) {
    actions.push({ type: 'upload_media', label: 'Gửi ảnh/video', value: 'upload_media' });
  }
  if (missingSlots.includes('urgency')) {
    actions.push(
      { type: 'quick_reply', label: 'Cần gấp hôm nay', value: 'Cần gấp hôm nay' },
      { type: 'quick_reply', label: 'Đặt ngày mai', value: 'Đặt lịch ngày mai' },
    );
  }
  if ((state === 'quote' || state === 'confirmation') && context.quote) {
    actions.push({ type: 'quote_card', label: 'Xem báo giá dự kiến', data: context.quote });
  }
  if (state === 'confirmation') {
    actions.push({
      type: 'confirmation_card',
      label: 'Xác nhận tạo đơn',
      value: 'Tôi xác nhận tạo đơn dịch vụ',
      data: {
        category: context.category,
        preferred_time: context.preferred_time,
        location: context.location_text || context.location,
        quote: context.quote,
      },
    });
  }
  if (state === 'approval_required') actions.push({ type: 'approval_pending', label: 'Đang chờ duyệt', value: 'approval_pending' });
  if (state === 'escalated') actions.push({ type: 'talk_to_human', label: 'Gặp hỗ trợ viên', value: 'talk_to_human' });
  return actions.slice(0, 4);
}
