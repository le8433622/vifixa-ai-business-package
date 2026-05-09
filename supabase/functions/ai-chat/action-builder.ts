import type { ChatAction, ChatContext, ChatState } from './types.ts';

export function buildActions(state: ChatState, missingSlots: string[], context: ChatContext, orderId?: string): ChatAction[] {
  if (orderId) return [{ type: 'view_order', label: '📋 Xem đơn hàng', value: orderId }];

  const actions: ChatAction[] = [];

  // Location sharing
  if (missingSlots.includes('location')) {
    actions.push({ type: 'share_location', label: '📍 Gửi vị trí', value: 'share_location' });
  }

  // Media upload — always available if no media yet
  if (!context.media_urls?.length && state !== 'confirmation' && state !== 'handoff') {
    actions.push({ type: 'upload_media', label: '📸 Gửi ảnh/video', value: 'upload_media' });
  }

  // Urgency quick replies
  if (missingSlots.includes('urgency') || missingSlots.includes('preferred_time')) {
    actions.push(
      { type: 'quick_reply', label: '🔴 Gấp — hôm nay', value: 'Cần sửa gấp hôm nay' },
      { type: 'quick_reply', label: '🟡 Ngày mai', value: 'Đặt lịch sáng ngày mai' },
      { type: 'quick_reply', label: '🟢 Cuối tuần', value: 'Cuối tuần nào cũng được' },
    );
  }

  // Quote card
  if ((state === 'quote' || state === 'confirmation') && context.quote) {
    actions.push({ type: 'quote_card', label: '💰 Xem báo giá', data: context.quote });
  }

  // Confirmation card with full summary
  if (state === 'confirmation') {
    actions.push({
      type: 'confirmation_card',
      label: '✅ Xác nhận tạo đơn',
      value: 'Tôi xác nhận tạo đơn dịch vụ',
      data: {
        category: context.category,
        preferred_time: context.preferred_time || 'Sớm nhất có thể',
        location: context.location_text || context.location,
        quote: context.quote,
        urgency: context.urgency,
      },
    });
  }

  // Service suggestions for initial state
  if (state === 'problem_capture' && !context.category) {
    actions.push(
      { type: 'quick_reply', label: '❄️ Máy lạnh', value: 'Máy lạnh nhà tôi bị hư' },
      { type: 'quick_reply', label: '⚡ Sửa điện', value: 'Tôi cần sửa điện' },
      { type: 'quick_reply', label: '🚿 Nước rò', value: 'Nhà tôi bị rò nước' },
    );
  }

  if (state === 'approval_required') actions.push({ type: 'approval_pending', label: '⏳ Đang chờ duyệt', value: 'approval_pending' });
  if (state === 'escalated') actions.push({ type: 'talk_to_human', label: '🆘 Gặp hỗ trợ viên', value: 'talk_to_human' });

  return actions.slice(0, 5);
}
