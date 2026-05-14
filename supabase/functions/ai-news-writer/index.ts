import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createAICore } from '../_shared/ai-core.ts'
import { createAIAudit } from '../_shared/ai-audit.ts'
import { jsonResponse, handleOptions, verifyAuth } from '../_shared/auth-helper.ts'

interface WriteRequest {
  topic: string
  category: 'promotion' | 'news' | 'technology' | 'maintenance_tip' | 'policy_update' | 'system_announcement' | 'worker_tip' | 'community' | 'event'
  target_role: 'all' | 'workers' | 'customers'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  tone?: 'formal' | 'friendly' | 'urgent'
  length?: 'short' | 'medium' | 'long'
  additional_context?: string
}

Deno.serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt

  try {
    const user = await verifyAuth(req)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!profile || profile.role !== 'admin') return jsonResponse({ error: 'Forbidden: admin only' }, 403)

    const body: WriteRequest = await req.json()
    const { topic, category, target_role, priority, tone = 'friendly', length = 'medium', additional_context } = body
    if (!topic || !category || !target_role || !priority) return jsonResponse({ error: 'Missing required fields' }, 400)

    const requestId = crypto.randomUUID()
    const ai = createAICore(supabase, { requestId, userId: user.id })

    const toneGuide: Record<string, string> = {
      formal: 'Professional and courteous, maintain a formal tone',
      friendly: 'Warm and approachable, use conversational Vietnamese',
      urgent: 'Direct and clear, emphasize importance and urgency',
    }
    const lengthGuide: Record<string, string> = {
      short: '2-3 paragraphs, about 150 words',
      medium: '3-5 paragraphs, about 300 words',
      long: '5-8 paragraphs, about 500 words',
    }

    const result = await ai.orchestrateInternal('news_writer', async () => ({
      systemPrompt: `Bạn là chuyên gia viết nội dung cho Vifixa.
Trả về JSON: { title, summary (max 120 chars), body (markdown), suggested_slug }
Viết tiếng Việt tự nhiên.
Phong cách: ${toneGuide[tone] || toneGuide.friendly}
Độ dài: ${lengthGuide[length] || lengthGuide.medium}
Đối tượng: ${target_role === 'workers' ? 'thợ sửa chữa' : target_role === 'customers' ? 'khách hàng' : 'tất cả người dùng'}`,
      userPrompt: `Danh mục: ${category}
Chủ đề: ${topic}
${additional_context ? `Thông tin thêm: ${additional_context}` : ''}
Viết nội dung broadcast:`,
    }))

    const output = {
      title: result.success ? result.data.title || `Vifixa - ${topic}` : `Vifixa - ${topic}`,
      summary: result.success ? result.data.summary || '' : '',
      body: result.success ? result.data.body || '' : 'Nội dung đang được tạo...',
      category, priority, target_role,
      suggested_slug: result.success ? result.data.suggested_slug || topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : topic.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      is_ai_generated: true,
    }

    const audit = createAIAudit(supabase)
    await audit.log({ agentType: 'news_writer', input: body, output, userId: user.id, requestId })

    return jsonResponse(output)
  } catch (err: any) {
    console.error('News writer error:', err)
    return jsonResponse({ error: err.message || 'Internal server error' }, 500)
  }
})