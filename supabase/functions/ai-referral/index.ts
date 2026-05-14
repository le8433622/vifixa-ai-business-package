import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createAICore } from '../_shared/ai-core.ts'
import { createAIAudit } from '../_shared/ai-audit.ts'
import { jsonResponse, handleOptions } from '../_shared/auth-helper.ts'

// Smart Referral — AI tối ưu rewards dựa trên LTV của từng user

Deno.serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { user_id } = await req.json()
    if (!user_id) return jsonResponse({ error: 'Missing user_id' }, 400)

    const requestId = crypto.randomUUID()
    const ai = createAICore(supabase, { requestId, userId: user_id })

    // Get user LTV data
    const { data: orders } = await supabase
      .from('orders')
      .select('final_price, estimated_price, status, created_at')
      .eq('customer_id', user_id)
      .order('created_at', { ascending: false })

    const totalRevenue = (orders || []).reduce((s: number, o: any) => s + (o.final_price || o.estimated_price || 0), 0)
    const completedOrders = (orders || []).filter(o => o.status === 'completed').length
    const avgOrderValue = completedOrders > 0 ? totalRevenue / completedOrders : 0
    const ltvTier = avgOrderValue > 1000000 ? 'high' : avgOrderValue > 300000 ? 'medium' : 'low'

    // Get current referral data
    const { data: referrals } = await supabase
      .from('referrals')
      .select('id, referred_user_id, reward_amount, status')
      .eq('referrer_id', user_id)

    const successfulReferrals = (referrals || []).filter(r => r.status === 'completed').length

    // AI optimize referral reward
    const result = await ai.orchestrateInternal('upsell', async () => ({
      systemPrompt: `Bạn là chuyên gia tối ưu chương trình giới thiệu cho Vifixa.
Dựa vào LTV (lifetime value) của khách hàng, đề xuất reward tối ưu.
Trả về JSON: {referrer_reward: number, referee_discount: number, referral_message: string, expected_conversion_rate: number, reason: string}`,
      userPrompt: `User LTV: ${totalRevenue}đ
Số đơn TB: ${completedOrders}
Giá trị TB/đơn: ${avgOrderValue}đ
LTV Tier: ${ltvTier}
Giới thiệu thành công: ${successfulReferrals}
Trả về JSON referral optimization:`,
    }))

    const output = result.success ? result.data : {
      referrer_reward: 50000, referee_discount: 10,
      referral_message: 'Giới thiệu bạn bè nhận ngay 50K!',
      expected_conversion_rate: 0.3, reason: 'Default reward',
    }

    // Generate unique referral code
    const referralCode = `VIF${user_id.slice(0, 4).toUpperCase()}${Date.now().toString(36).slice(-4)}`

    // Update or create referral code
    await supabase.from('profiles').update({
      metadata: { referral_code: referralCode, referral_reward: output.referrer_reward, referee_discount: output.referee_discount },
    }).eq('id', user_id)

    const audit = createAIAudit(supabase)
    await audit.log({
      agentType: 'referral', requestId,
      input: { user_id, ltv_tier: ltvTier },
      output, userId: user_id,
    })

    return jsonResponse({
      referral_code: referralCode,
      your_reward: output.referrer_reward,
      friend_discount: `${output.referee_discount}%`,
      message: output.referral_message,
      expected_conversion: `${Math.round(output.expected_conversion_rate * 100)}%`,
      ltv_tier: ltvTier,
    })
  } catch (error: any) {
    console.error('Referral error:', error)
    return jsonResponse({ error: error.message || 'Internal server error' }, 500)
  }
})