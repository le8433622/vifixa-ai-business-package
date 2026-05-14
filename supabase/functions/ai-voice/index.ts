import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createAICore } from '../_shared/ai-core.ts'
import { createAIAudit } from '../_shared/ai-audit.ts'
import { jsonResponse, handleOptions } from '../_shared/auth-helper.ts'

// Twilio Voice Webhook — STT → AICore → TTS → Response
// Deploy: supabase functions deploy ai-voice
// Twilio Console: set Voice webhook to {supabase_url}/functions/v1/ai-voice

Deno.serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const formData = await req.formData()
    const callerNumber = formData.get('From')?.toString() || ''
    const speechResult = formData.get('SpeechResult')?.toString() || ''
    const digits = formData.get('Digits')?.toString() || ''
    const callSid = formData.get('CallSid')?.toString() || crypto.randomUUID()

    // Lookup caller
    const { data: caller } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone', callerNumber.replace('+84', '0').replace('+', ''))
      .maybeSingle()

    // Build TwiML response
    const requestId = crypto.randomUUID()
    const ai = createAICore(supabase, { requestId, userId: caller?.id })

    let responseText = ''
    let shouldHangup = false

    if (!speechResult && !digits) {
      // First call — greet + prompt
      responseText = `Xin chào, đây là trợ lý AI của Vifixa. Bạn gặp sự cố gì?
        Có thể nói: "máy lạnh không mát", "rò nước", "mất điện",
        hoặc nhấn phím 1 để nói chuyện với nhân viên.`
    } else {
      const input = speechResult || digits
      const result = await ai.orchestrateInternal('diagnosis', async () => ({
        systemPrompt: `Bạn là trợ lý giọng nói của Vifixa — dịch vụ sửa chữa nhà cửa tại Việt Nam.
Người dùng gọi điện và mô tả sự cố. Trả lời NGẮN GỌN (dưới 100 từ), giọng nói tự nhiên.
Nếu là sự cố khẩn cấp (cháy, rò gas, chập điện, nguy hiểm), trả về JSON: {emergency: true, message: "..."}
Nếu không khẩn cấp, trả về JSON: {emergency: false, diagnosis: "...", price_estimate: "...", message: "..."}`,
        userPrompt: `Khách hàng nói: "${input}"`,
      }))

      if (result.success && result.data?.emergency) {
        responseText = result.data.message || 'Đây là tình huống khẩn cấp! Chúng tôi sẽ kết nối bạn với nhân viên hỗ trợ ngay lập tức.'
        shouldHangup = false

        await supabase.from('in_app_notifications').insert({
          user_id: null, title: '🚨 Emergency Call', category: 'ai_alert',
          body: `Cuộc gọi khẩn từ ${callerNumber}: ${input}`,
          priority: 'high', metadata: { call_sid: callSid, type: 'emergency_call' },
        })
      } else if (result.success) {
        responseText = result.data.message || 'Cảm ơn bạn. Chúng tôi đã ghi nhận thông tin. Nhân viên sẽ liên hệ lại trong ít phút.'
      } else {
        responseText = 'Xin lỗi, tôi chưa hiểu rõ. Bạn có thể nói lại hoặc nhấn phím 0 để gặp nhân viên hỗ trợ.'
      }
    }

    const audit = createAIAudit(supabase)
    await audit.log({
      agentType: 'voice', requestId,
      input: { caller: callerNumber, speech: speechResult, digits },
      output: { response: responseText, hangup: shouldHangup },
      metadata: { call_sid: callSid },
    })

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="google:vi-VN-Wavenet-A" language="vi-VN">${escapeXml(responseText)}</Say>
  ${shouldHangup ? '<Hangup/>' : `<Gather input="speech dtmf" speechTimeout="auto" numDigits="1" timeout="5">
    <Say voice="google:vi-VN-Wavenet-A" language="vi-VN">Bạn có thể nói tiếp hoặc nhấn phím 0 để gặp nhân viên.</Say>
  </Gather>`}
</Response>`

    return new Response(twiml, {
      headers: { 'Content-Type': 'text/xml', 'Access-Control-Allow-Origin': '*' },
    })
  } catch (error: any) {
    const fallbackTwiML = `<?xml version="1.0" encoding="UTF-8"?>
<Response><Say voice="google:vi-VN-Wavenet-A" language="vi-VN">Xin lỗi, hệ thống đang bận. Vui lòng gọi lại sau.</Say></Response>`
    return new Response(fallbackTwiML, {
      headers: { 'Content-Type': 'text/xml', 'Access-Control-Allow-Origin': '*' },
    })
  }
})

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}