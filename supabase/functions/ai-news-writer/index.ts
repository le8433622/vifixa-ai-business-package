// AI News Writer — Generates broadcast/news content using AI
// Accepts topic, category, target_role, priority and returns draft broadcast

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { jsonResponse, handleOptions, verifyAuth, AuthError } from '../_shared/auth-helper.ts';

interface WriteRequest {
  topic: string;
  category: 'promotion' | 'news' | 'technology' | 'maintenance_tip' | 'policy_update' | 'system_announcement' | 'worker_tip' | 'community' | 'event';
  target_role: 'all' | 'workers' | 'customers';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  tone?: 'formal' | 'friendly' | 'urgent';
  length?: 'short' | 'medium' | 'long';
  additional_context?: string;
}

interface WriteResponse {
  title: string;
  summary: string;
  body: string;
  category: string;
  priority: string;
  target_role: string;
  suggested_slug: string;
  is_ai_generated: boolean;
}

async function callNvidiaAI(
  systemPrompt: string,
  userPrompt: string,
  maxRetries = 2,
): Promise<any> {
  const apiKey = Deno.env.get('NVIDIA_API_KEY') || '';
  const model = Deno.env.get('NVIDIA_MODEL') || 'meta/llama-3.1-8b-instruct';
  const baseUrl = 'https://integrate.api.nvidia.com/v1';

  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: 2048,
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`NVIDIA API error ${response.status}: ${text.substring(0, 200)}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('AI response missing content');
      }

      try {
        return JSON.parse(content);
      } catch {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) return JSON.parse(jsonMatch[0]);
        return { text: content };
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.error(`ai-news-writer attempt ${attempt + 1}/${maxRetries} failed:`, lastError.message);
      if (attempt < maxRetries - 1) {
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
      }
    }
  }

  throw lastError!;
}

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const user = await verifyAuth(req);
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return jsonResponse({ error: 'Forbidden: admin only' }, 403);
    }

    const body: WriteRequest = await req.json();
    const { topic, category, target_role, priority, tone = 'friendly', length = 'medium', additional_context } = body;

    if (!topic || !category || !target_role || !priority) {
      return jsonResponse({ error: 'Missing required fields: topic, category, target_role, priority' }, 400);
    }

    const lengthGuide: Record<string, string> = {
      short: '2-3 paragraphs, about 150 words',
      medium: '3-5 paragraphs, about 300 words',
      long: '5-8 paragraphs, about 500 words',
    };

    const toneGuide: Record<string, string> = {
      formal: 'Professional and courteous, maintain a formal tone suitable for official announcements',
      friendly: 'Warm and approachable, use conversational Vietnamese with a helpful tone',
      urgent: 'Direct and clear, emphasize importance and urgency',
    };

    const categoryNames: Record<string, string> = {
      promotion: '🎉 Khuyến mãi',
      news: '📢 Tin tức',
      technology: '🚀 Công nghệ',
      maintenance_tip: '🏠 Mẹo bảo trì',
      policy_update: '📋 Cập nhật chính sách',
      system_announcement: '🔔 Thông báo hệ thống',
      worker_tip: '🔧 Mẹo cho thợ',
      community: '👥 Cộng đồng',
      event: '📅 Sự kiện',
    };

    const systemPrompt = `Bạn là chuyên gia viết tin tức và nội dung cho Vifixa — nền tảng dịch vụ sửa chữa nhà cửa tại Việt Nam.

Nhiệm vụ: Viết bài đăng dạng broadcast/tin tức dựa trên chủ đề được cung cấp.

Trả về JSON hợp lệ với cấu trúc:
{
  "title": "Tiêu đề bài viết (hấp dẫn, có thể có emoji phù hợp)",
  "summary": "Tóm tắt ngắn 1-2 câu, hiển thị trong push notification (tối đa 120 ký tự)",
  "body": "Nội dung bài viết đầy đủ bằng tiếng Việt",
  "suggested_slug": "slug-tu-chan-khong-dau"
}

Yêu cầu:
- Viết bằng tiếng Việt tự nhiên, dễ đọc
- Tiêu đề hấp dẫn, có thể kèm emoji phù hợp
- Body có thể dùng Markdown cơ bản (**, -, ##)
- Phù hợp với đối tượng: ${target_role === 'workers' ? 'thợ sửa chữa' : target_role === 'customers' ? 'khách hàng' : 'tất cả người dùng'}
- Phong cách: ${toneGuide[tone] || toneGuide.friendly}
- Độ dài: ${lengthGuide[length] || lengthGuide.medium}`;

    const userPrompt = `Hãy tạo một bài viết cho danh mục "${categoryNames[category] || category}" với chủ đề sau:

CHỦ ĐỀ: ${topic}

${additional_context ? `THÔNG TIN THÊM:\n${additional_context}\n\n` : ''}
MỤC TIÊU: ${target_role === 'all' ? 'Tất cả người dùng' : target_role === 'workers' ? 'Thợ sửa chữa' : 'Khách hàng'}

Viết nội dung broadcast cho Vifixa:`;

    const content = await callNvidiaAI(systemPrompt, userPrompt);

    const result: WriteResponse = {
      title: content.title || `Vifixa - ${topic}`,
      summary: content.summary || '',
      body: content.body || '',
      category,
      priority,
      target_role,
      suggested_slug: content.suggested_slug || topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      is_ai_generated: true,
    };

    return jsonResponse(result);
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonResponse({ error: err.message }, 401);
    }
    console.error('ai-news-writer error:', err);
    return jsonResponse({ error: err instanceof Error ? err.message : 'Unknown error' }, 500);
  }
});
