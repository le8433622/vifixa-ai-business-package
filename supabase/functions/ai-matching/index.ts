// 🤝 AI Ghép thợ — Chọn thợ phù hợp nhất dựa trên kỹ năng, khoảng cách, đánh giá

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createAICore } from '../_shared/ai-core.ts'
import { createAIRAG } from '../_shared/ai-rag.ts'
import { createAIAudit } from '../_shared/ai-audit.ts'
import { verifyAuth, checkRateLimit, jsonResponse, handleOptions } from '../_shared/auth-helper.ts'

function scoreWorkers(workers: any[], skillsRequired: string[], location: { lat: number; lng: number }) {
  return workers.map((w: any) => {
    const workerSkills: string[] = w.skills || []
    const skillMatch = skillsRequired.filter(s => workerSkills.some((ws: string) => ws.toLowerCase().includes(s.toLowerCase()))).length
    const skillScore = skillsRequired.length > 0 ? skillMatch / skillsRequired.length : 0
    const ratingScore = (w.rating || 0) / 5
    const completionScore = Math.min((w.completed_jobs || 0) / 50, 1)
    const trustScore = (w.trust_score || 50) / 100

    const R = 6371
    const dLat = (w.location_lat - location.lat) * Math.PI / 180
    const dLng = (w.location_lng - location.lng) * Math.PI / 180
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(location.lat * Math.PI / 180) * Math.cos(w.location_lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2
    const distanceKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distanceScore = Math.max(0, 1 - distanceKm / 20)
    const verifiedBoost = w.is_verified ? 0.1 : 0

    return {
      id: String(w.id), name: w.profiles?.full_name || `Thợ ${w.id}`,
      skills: workerSkills, rating: w.rating || 0,
      completedJobs: w.completed_jobs || 0, trustScore: w.trust_score || 50,
      distanceKm: Math.round(distanceKm * 10) / 10, isVerified: !!w.is_verified,
      totalScore: skillScore * 0.35 + ratingScore * 0.2 + completionScore * 0.15 + trustScore * 0.1 + distanceScore * 0.2 + verifiedBoost,
    }
  }).sort((a, b) => b.totalScore - a.totalScore)
}

Deno.serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt

  try {
    const user = await verifyAuth(req)
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    checkRateLimit(user.id, clientIp, { maxRequests: 15 })

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { order_id, skills_required, location, urgency } = await req.json()
    if (!order_id || !skills_required || !location) {
      return jsonResponse({ error: 'Thiếu trường: ma_don, ky_nang, vi_tri' }, 400)
    }

    const requestId = crypto.randomUUID()
    const rag = createAIRAG(supabase)
    const { workers } = await rag.getMatchingContext(skills_required, location)

    const scored = scoreWorkers(workers, skills_required, location)
    const candidates = scored.map(w => ({ id: w.id, name: w.name, score: w.totalScore, distanceKm: w.distanceKm }))

    // Helper: tính ETA thực tế qua OSRM
    async function tinhETA(workerLat: number, workerLng: number): Promise<number> {
      try {
        const routeRes = await fetch(`${supabaseUrl}/functions/v1/osm-route`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseServiceKey}` },
          body: JSON.stringify({
            diemDi: { viDo: workerLat, kinhDo: workerLng },
            diemDen: { viDo: location.lat, kinhDo: location.lng },
            phuongTien: 'driving',
          }),
        })
        if (routeRes.ok) {
          const data = await routeRes.json()
          if (data.thanhCong && data.tuyenDuong?.[0]?.thoiGianPhut) {
            return Math.round(data.tuyenDuong[0].thoiGianPhut)
          }
        }
      } catch { /* fallback */ }
      return 0 // fallback: caller sẽ dùng công thức cũ
    }

    let result
    if (scored.length > 0) {
      const ai = createAICore(supabase, { requestId, userId: user.id })
      const aiResult = await ai.matchWorker(
        { order_id, skills_required, location, urgency },
        scored.map(w => ({ id: w.id, profiles: { full_name: w.name }, skills: w.skills, rating: w.rating, completed_jobs: w.completedJobs, score: w.totalScore })),
      )

      if (aiResult.success && scored.some(w => w.id === aiResult.data.matched_worker_id)) {
        const matched = scored.find(w => w.id === aiResult.data.matched_worker_id)
        const etaOSRM = await tinhETA(matched?.distanceKm ? location.lat : location.lat, location.lng)
        result = {
          matched_worker_id: aiResult.data.matched_worker_id,
          worker_name: aiResult.data.worker_name,
          eta_minutes: etaOSRM || Math.round((matched?.distanceKm || 10) * 3 + 15),
          confidence: Math.min((matched?.totalScore || 0.5) + 0.2, 0.95),
          match_reasons: [`Kỹ năng phù hợp`, `Khoảng cách ${matched?.distanceKm || '?'}km`, `Đánh giá ${matched?.rating || 0}/5`],
          alternative_workers: candidates.slice(1, 4),
          scoring_method: 'ai_nang_cao',
        }
      } else {
        const best = scored[0]
        const etaOSRM = await tinhETA(best.distanceKm ? location.lat : location.lat, location.lng)
        result = {
          matched_worker_id: best.id, worker_name: best.name,
          eta_minutes: etaOSRM || Math.round(best.distanceKm * 3 + 15),
          confidence: Math.min(best.totalScore + 0.2, 0.95),
          match_reasons: [`Kỹ năng tốt nhất`, `Khoảng cách ${best.distanceKm}km`, `Đánh giá ${best.rating}/5`],
          alternative_workers: candidates.slice(1, 4),
          scoring_method: 'quy_tac_thu_cong',
        }
      }
    } else {
      return jsonResponse({ error: 'Không tìm thấy thợ phù hợp' }, 404)
    }

    const audit = createAIAudit(supabase)
    await audit.log({
      agentType: 'ghep_tho',
      input: { maDon: order_id, kyNang: skills_required, location, urgency },
      output: result,
      userId: user.id, requestId,
    })

    return jsonResponse(result)
  } catch (error: any) {
    if (error.name === 'AuthError') return jsonResponse({ error: error.message, code: error.code }, 401)
    if (error.name === 'RateLimitError') return jsonResponse({ error: error.message }, 429)
    console.error('Lỗi ghép thợ:', error)
    return jsonResponse({ error: error.message || 'Lỗi máy chủ nội bộ' }, 500)
  }
})