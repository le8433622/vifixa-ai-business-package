import type { ChatContext, ChatState } from './types.ts';

export function buildReply(state: ChatState, missingSlots: string[], context: ChatContext, orderId?: string): string {
  if (orderId) {
    return `Đã chốt đơn thành công 🎉\nMã đơn: ${orderId}\nTóm tắt: ${context.handoff_summary}\nVifixa sẽ tiếp tục ghép thợ phù hợp và cập nhật trạng thái cho bạn.`;
  }

  if (state === 'approval_required') {
    return 'Yêu cầu của bạn đã đủ thông tin nhưng cần được duyệt trước khi AI tự động tạo đơn. Vifixa đã đưa yêu cầu vào hàng đợi duyệt để đảm bảo an toàn, giá và chất lượng vận hành.';
  }

  if (state === 'escalated') {
    return 'Mình thấy sự cố có dấu hiệu rủi ro an toàn. Bạn vui lòng ưu tiên ngắt nguồn/khóa van nếu an toàn để làm vậy, tránh tự xử lý sâu. Mình sẽ chuyển ca này sang hỗ trợ viên/thợ phù hợp thay vì tự động chốt đơn.';
  }

  if (missingSlots.includes('category') || missingSlots.includes('description')) {
    return 'Bạn mô tả giúp mình sự cố đang gặp là gì nhé? Ví dụ: máy lạnh chảy nước, mất điện một phần, vòi nước rò rỉ. Mình sẽ hỏi tối đa vài câu để chẩn đoán và chốt lịch nhanh.';
  }

  if (missingSlots.includes('location')) {
    const locationHint = context.location_text ? `Mình đã ghi nhận khu vực: ${context.location_text}. ` : '';
    return `${locationHint}Để báo giá và ghép thợ chính xác, bạn vui lòng bấm “Gửi vị trí” hoặc nhập vị trí cụ thể hơn. Mình sẽ không tạo đơn khi chưa có vị trí hợp lệ.`;
  }

  if (missingSlots.includes('urgency')) {
    return 'Sự cố này cần xử lý gấp hôm nay, ngày mai hay có thể đặt lịch sau? Nếu có điện/gas/nước rò mạnh, hãy nói “cần gấp”.';
  }

  if (missingSlots.includes('preferred_time')) {
    return 'Bạn muốn thợ qua vào khung giờ nào? Ví dụ: chiều nay, sáng mai, hoặc 18 giờ.';
  }

  if (state === 'diagnosis') {
    return 'Mình đã đủ thông tin cơ bản và đang chuẩn bị chẩn đoán sơ bộ trước khi báo giá dự kiến.';
  }

  if (state === 'quote') {
    const quote = context.quote as { estimated_price?: number; price_breakdown?: { item: string; cost: number }[]; confidence?: number } | undefined;
    const price = quote?.estimated_price ? `${quote.estimated_price.toLocaleString('vi-VN')}đ` : 'đang tính';
    return `Báo giá dự kiến: khoảng ${price}. Đây chưa phải giá cuối vì còn phụ thuộc tình trạng thực tế, vật tư và khảo sát onsite. Nếu bạn đồng ý, hãy bấm “Xác nhận tạo đơn” hoặc nhắn “Tôi xác nhận tạo đơn”.`;
  }

  if (state === 'confirmation') {
    const quote = context.quote as { estimated_price?: number; confidence?: number } | undefined;
    const priceLine = quote?.estimated_price
      ? `\nBáo giá dự kiến: khoảng ${quote.estimated_price.toLocaleString('vi-VN')}đ, chưa phải giá cuối nếu phát sinh vật tư/khảo sát thực tế.`
      : '';
    return `Mình đã có đủ thông tin để tạo đơn.${priceLine}\nVui lòng xác nhận lần cuối: bạn đồng ý tạo đơn dịch vụ theo thông tin đã cung cấp chứ?`;
  }

  return 'Mình đang xử lý yêu cầu của bạn.';
}

export function buildHandoffSummary(context: ChatContext): string {
  return [
    `Dịch vụ: ${context.category || 'chưa rõ'}`,
    `Sự cố: ${context.description || 'chưa rõ'}`,
    `Mức độ: ${context.urgency || 'chưa rõ'}`,
    `Khung giờ: ${context.preferred_time || 'chưa rõ'}`,
    `Khu vực: ${context.location_text || 'đã có tọa độ'}`,
    context.risk_flags?.length ? `Lưu ý rủi ro: ${context.risk_flags.join(', ')}` : undefined,
  ].filter(Boolean).join(' | ');
}
