import type { ChatContext, ChatState } from './types.ts';

// Upselling suggestions based on category
const UPSELL_MAP: Record<string, { service: string; reason: string }> = {
  air_conditioning: { service: 'vệ sinh máy lạnh', reason: 'Vệ sinh định kỳ giúp máy lạnh hoạt động hiệu quả hơn và tiết kiệm đến 30% điện. Đặt combo sửa + vệ sinh tiết kiệm 15%!' },
  plumbing: { service: 'kiểm tra hệ thống nước', reason: 'Khi thợ đến, nên kiểm tra luôn toàn bộ hệ thống ống nước để phát hiện sớm các điểm yếu. Combo kiểm tra chỉ thêm 20%!' },
  electricity: { service: 'kiểm tra an toàn điện', reason: 'Nên kiểm tra luôn toàn bộ hệ thống điện để đảm bảo an toàn. Combo kiểm tra tiết kiệm 15%!' },
  appliance: { service: 'bảo dưỡng thiết bị', reason: 'Bảo dưỡng định kỳ giúp kéo dài tuổi thọ thiết bị lên 2-3 năm. Đặt thêm dịch vụ bảo dưỡng giảm 10%!' },
  camera: { service: 'nâng cấp hệ thống an ninh', reason: 'Nếu bạn đang dùng camera cũ, nâng cấp lên camera AI sẽ hiệu quả hơn rất nhiều.' },
};

// Random friendly greetings for variety
const CATEGORY_NAMES: Record<string, string> = {
  air_conditioning: 'Máy lạnh/Điều hòa',
  plumbing: 'Ống nước/Thông tắc',
  electricity: 'Điện dân dụng',
  appliance: 'Thiết bị gia dụng',
  camera: 'Camera/An ninh',
  painting: 'Sơn/Chống thấm',
  lock_smith: 'Khóa cửa',
};

export function buildReply(state: ChatState, missingSlots: string[], context: ChatContext, orderId?: string): string {
  if (orderId) {
    return `🎉 Tuyệt vời! Đã tạo đơn thành công!\n\nMã đơn: #${orderId.substring(0, 8)}\n${context.handoff_summary}\n\nVifixa sẽ ghép thợ phù hợp nhất cho bạn và cập nhật tiến độ realtime. Bạn có thể theo dõi đơn hàng trong mục "Đơn hàng" nhé! 🔔`;
  }

  if (state === 'approval_required') {
    return '📋 Yêu cầu của bạn đã được ghi nhận đầy đủ!\n\nDo giá trị đơn hàng hoặc tính chất dịch vụ, mình cần xác nhận nhanh với đội vận hành trước khi tạo đơn. Thường chỉ mất 5-10 phút thôi.\n\nBạn sẽ nhận được thông báo ngay khi đơn được duyệt! ⏳';
  }

  if (state === 'escalated') {
    return '⚠️ Mình phát hiện sự cố có dấu hiệu nguy hiểm!\n\n🔴 Ưu tiên an toàn: Hãy ngắt nguồn điện/khóa van nước/gas ngay nếu có thể.\n\nMình sẽ chuyển cho nhân viên hỗ trợ xử lý trực tiếp để đảm bảo an toàn tối đa cho bạn. Đừng tự ý sửa chữa nhé!';
  }

  // Smart slot filling — ask naturally based on what's missing
  if (missingSlots.includes('category') || missingSlots.includes('description')) {
    return '👋 Chào bạn! Mình là trợ lý AI của Vifixa.\n\nBạn đang gặp sự cố gì ạ? Mô tả càng chi tiết (kèm ảnh nếu có) mình sẽ chẩn đoán và báo giá càng chính xác!\n\n💡 Mẹo: Bạn có thể nói tất cả trong 1 câu, ví dụ: "Máy lạnh không mát, ở quận 7, mai sáng 9h" — mình hiểu hết!';
  }

  // If only location is missing — recognize what we already have
  if (missingSlots.includes('location') && !missingSlots.includes('category')) {
    const categoryName = CATEGORY_NAMES[context.category || ''] || context.category;
    const urgencyText = context.urgency === 'high' ? ' (gấp)' : context.urgency === 'emergency' ? ' (KHẨN CẤP)' : '';
    return `✅ Mình đã ghi nhận: ${categoryName}${urgencyText}\n\n📍 Để báo giá và ghép thợ gần nhất, bạn cho mình biết vị trí nhé!\n\n• Bấm "Gửi vị trí" để gửi GPS tự động\n• Hoặc nhập khu vực: VD "quận 7", "Bình Thạnh"`;
  }

  // If only urgency/time missing
  if (missingSlots.includes('urgency') || missingSlots.includes('preferred_time')) {
    const categoryName = CATEGORY_NAMES[context.category || ''] || context.category;
    const locationText = context.location_text ? ` tại ${context.location_text}` : '';
    return `✅ ${categoryName}${locationText} — đã ghi nhận!\n\n⏰ Bạn cần thợ đến khi nào ạ?\n\n• "Hôm nay" / "Gấp" — có thợ trong 30-60 phút\n• "Ngày mai 9h sáng" — đặt lịch cụ thể\n• "Cuối tuần" — linh hoạt hơn`;
  }

  if (state === 'diagnosis') {
    return '🤖 Mình đã đủ thông tin! Đang phân tích và chẩn đoán sơ bộ...\n\nVui lòng đợi mình vài giây nhé!';
  }

  if (state === 'quote' || state === 'confirmation') {
    const quote = context.quote as { estimated_price?: number; price_breakdown?: { item: string; cost: number }[]; confidence?: number } | undefined;
    const price = quote?.estimated_price ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(quote.estimated_price) : 'đang tính';
    const categoryName = CATEGORY_NAMES[context.category || ''] || context.category;
    const upsell = UPSELL_MAP[context.category || ''];
    const aiUpsell = context.upsell_result as { suggestion?: string; product_type?: string; discount_percent?: number } | undefined;

    let reply = `📊 Kết quả chẩn đoán AI:\n\n`;
    reply += `🔧 Dịch vụ: ${categoryName}\n`;
    reply += `💰 Giá dự kiến: ${price}\n`;
    if (context.preferred_time) reply += `⏰ Thời gian: ${context.preferred_time}\n`;
    if (context.location_text) reply += `📍 Khu vực: ${context.location_text}\n`;
    reply += `\n⚠️ Giá trên là ước tính. Giá cuối sẽ xác nhận sau khi thợ khảo sát thực tế.\n`;

    if (aiUpsell?.suggestion && aiUpsell?.product_type) {
      const discountText = aiUpsell.discount_percent ? ` (giảm ${aiUpsell.discount_percent}%)` : ''
      reply += `\n💡 Gợi ý đặc biệt: ${aiUpsell.suggestion}${discountText}\n`
    } else if (upsell) {
      reply += `\n💡 Gợi ý: ${upsell.reason}\n`
    }

    reply += `\n👉 Bấm "Xác nhận tạo đơn" hoặc nhắn "Chốt đơn" để Vifixa ghép thợ ngay!`;
    return reply;
  }

  return 'Mình đang xử lý yêu cầu. Bạn vui lòng đợi chút nhé! 😊';
}

export function buildHandoffSummary(context: ChatContext): string {
  return [
    `Dịch vụ: ${CATEGORY_NAMES[context.category || ''] || context.category || 'chưa rõ'}`,
    `Sự cố: ${context.description || 'chưa rõ'}`,
    `Mức độ: ${context.urgency || 'chưa rõ'}`,
    `Khung giờ: ${context.preferred_time || 'chưa rõ'}`,
    `Khu vực: ${context.location_text || 'đã có tọa độ'}`,
    context.risk_flags?.length ? `Lưu ý: ${context.risk_flags.join(', ')}` : undefined,
  ].filter(Boolean).join(' | ');
}
