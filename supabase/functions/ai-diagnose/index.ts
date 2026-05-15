// AI Diagnose — Chẩn đoán sự cố + báo giá
// Sử dụng AICore engine từ _shared
// Tích hợp companion memory để cải thiện chẩn đoán

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'
import { verifyAuth, jsonResponse, handleOptions } from '../_shared/auth-helper.ts'
import { createAICore } from '../_shared/ai-core.ts'

Deno.serve(async (req: Request) => {
  const opt = handleOptions(req)
  if (opt) return opt

  try {
    const user = await verifyAuth(req)
    const body = await req.json()
    const { description, category, media_urls } = body

    if (!description) return jsonResponse({ error: 'Missing description' }, 400)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const aiCore = createAICore(supabase, {
      userId: user.id,
      requestId: crypto.randomUUID(),
    })

    // Lấy companion memories để tăng cường context
    const { data: memories } = await supabase
      .from('companion_memories')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    // Chuẩn bị knowledge base từ memories
    const knowledgeBase = memories
      .filter(m => m.category === 'ai_learned' || m.category === 'diagnosis')
      .map(m => ({
        diagnosis: m.value.split(' - ')[0] || m.value,
        severity: m.value.split(' - ')[1] || 'medium',
        description: m.value,
        confidence: m.importance / 5 // Chuyển importance thành confidence
      }))

    // Nếu có ảnh, dùng Vision model
    if (media_urls?.length) {
      const visionResult = await aiCore.analyzeImages({
        imageUrls: media_urls,
        description,
        category,
      })

      if (!visionResult.success) {
        // Fallback về text diagnosis
        return diagnoseText(aiCore, description, category, supabase, user, knowledgeBase)
      }

      // Lưu diagnosis vào service_requests
      const { data: request } = await supabase
        .from('service_requests')
        .insert({
          customer_id: user.id,
          description,
          category: category || visionResult.data.recommended_skills?.[0],
          media_urls,
          diagnosis: visionResult.data,
          status: 'priced',
        })
        .select()
        .single()

      // Lưu fact mới vào companion memory
      await supabase
        .from('companion_memories')
        .upsert({
          user_id: user.id,
          key: 'last_diagnosis',
          value: `${visionResult.data.diagnosis} - ${visionResult.data.severity}`,
          category: 'ai_learned',
          importance: 4,
          source: 'diagnose',
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        }, { onConflict: ['user_id', 'key'] })

      return jsonResponse({
        success: true,
        diagnosis: visionResult.data.diagnosis,
        severity: visionResult.data.severity,
        recommended_skills: visionResult.data.recommended_skills,
        visual_observations: visionResult.data.visual_observations,
        confidence: visionResult.data.confidence,
        price_estimate: null,
        request_id: (request as any)?.id,
      })
    }

    // Text-only diagnosis
    return await diagnoseText(aiCore, description, category, supabase, user, knowledgeBase)

  } catch (error: any) {
    console.error('Diagnose error:', error)
    return jsonResponse({
      success: false,
      error: error.message || 'Internal error',
    }, error.message.includes('Unauthorized') ? 401 : 500)
  }
})

async function diagnoseText(
  aiCore: any,
  description: string,
  category: string | undefined,
  supabase: any,
  user: any,
  knowledgeBase: any[] = []
) {
  // Bước 1: Chẩn đoán với knowledge base
  const diagnosis = await aiCore.diagnose({
    description,
    category: category || 'general',
  }, knowledgeBase)

  if (!diagnosis.success) {
    // Fallback nếu AI lỗi
    const fallback = {
      diagnosis: 'Không thể chẩn đoán tự động. Vui lòng mô tả chi tiết hơn hoặc gửi ảnh.',
      severity: 'medium' as const,
      recommended_skills: [category || 'general'],
      confidence: 0,
      estimated_price_range: { min: 100000, max: 500000 },
    }

    return jsonResponse({
      success: true,
      diagnosis: fallback.diagnosis,
      severity: fallback.severity,
      recommended_skills: fallback.recommended_skills,
      confidence: fallback.confidence,
      price_estimate: { min: 100000, max: 500000 },
      is_fallback: true,
    })
  }

  // Bước 2: Định giá dựa trên chẩn đoán
  const price = await aiCore.estimatePrice({
    category: category || diagnosis.data.recommended_skills?.[0] || 'general',
    diagnosis: diagnosis.data.diagnosis,
    urgency: diagnosis.data.severity,
    location: null,
    knowledgeBase: knowledgeBase
  }, []) // candidate price bands could be added here

  const priceData = price.success ? price.data : {
    estimated_price: diagnosis.data.estimated_price_range?.min || 300000,
    price_breakdown: [{ item: 'Dịch vụ', cost: diagnosis.data.estimated_price_range?.min || 300000 }],
    confidence: 0,
  }

  // Lưu vào service_requests
  const { data: request } = await supabase
    .from('service_requests')
    .insert({
      customer_id: user.id,
      description,
      category: category || diagnosis.data.recommended_skills?.[0],
      diagnosis: diagnosis.data,
      price_estimate: {
        min: diagnosis.data.estimated_price_range?.min || priceData.estimated_price * 0.8,
        max: diagnosis.data.estimated_price_range?.max || priceData.estimated_price * 1.2,
        breakdown: priceData.price_breakdown,
      },
      status: 'priced',
    })
    .select()
    .single()

  // Lưu fact mới vào companion memory
  await supabase
    .from('companion_memories')
    .upsert({
      user_id: user.id,
      key: 'last_diagnosis',
      value: `${diagnosis.data.diagnosis} - ${diagnosis.data.severity}`,
      category: 'ai_learned',
      importance: 4,
      source: 'diagnose',
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
    }, { onConflict: ['user_id', 'key'] })

  return jsonResponse({
    success: true,
    diagnosis: diagnosis.data.diagnosis,
    severity: diagnosis.data.severity,
    recommended_skills: diagnosis.data.recommended_skills,
    confidence: diagnosis.data.confidence,
    price_estimate: {
      min: diagnosis.data.estimated_price_range?.min || Math.round(priceData.estimated_price * 0.8),
      max: diagnosis.data.estimated_price_range?.max || Math.round(priceData.estimated_price * 1.2),
      breakdown: priceData.price_breakdown,
    },
    request_id: (request as any)?.id,
  })
}