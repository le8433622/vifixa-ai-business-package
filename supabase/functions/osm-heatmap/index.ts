// 🔥 OSM Heatmap — Phân tích nhu cầu dịch vụ theo khu vực địa lý

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createAICore } from '../_shared/ai-core.ts'
import { createAIAudit } from '../_shared/ai-audit.ts'
import { jsonResponse, handleOptions } from '../_shared/auth-helper.ts'

Deno.serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (token) {
      const { data: { user } } = await supabase.auth.getUser(token)
      if (!user) return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'grid'

    switch (action) {
      case 'grid': {
        // Dữ liệu heatmap dạng lưới
        const category = url.searchParams.get('category') || ''
        const days = parseInt(url.searchParams.get('days') || '30')

        const fromDate = new Date(Date.now() - days * 86400000).toISOString()
        let query = supabase
          .from('orders')
          .select('category, location_lat, location_lng, final_price, estimated_price, created_at')
          .not('location_lat', 'is', null)
          .not('location_lng', 'is', null)
          .gte('created_at', fromDate)
          .limit(500)

        if (category) query = query.eq('category', category)
        const { data: orders } = await query

        // Gom nhóm theo ô lưới (0.01 độ ≈ 1km)
        const gridSize = 0.01
        const grid: Record<string, { lat: number; lng: number; count: number; totalRevenue: number }> = {}
        for (const o of orders || []) {
          const key = `${Math.round((o.location_lat || 0) / gridSize)},${Math.round((o.location_lng || 0) / gridSize)}`
          if (!grid[key]) {
            grid[key] = {
              lat: Math.round((o.location_lat || 0) / gridSize) * gridSize,
              lng: Math.round((o.location_lng || 0) / gridSize) * gridSize,
              count: 0, totalRevenue: 0,
            }
          }
          grid[key].count++
          grid[key].totalRevenue += (o.final_price || o.estimated_price || 0)
        }

        const cells = Object.values(grid).sort((a, b) => b.count - a.count)

        return jsonResponse({
          type: 'FeatureCollection',
          features: cells.map(c => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [c.lng, c.lat] },
            properties: {
              intensity: Math.min(c.count / Math.max(...cells.map(x => x.count)), 1),
              order_count: c.count,
              total_revenue: c.totalRevenue,
              avg_revenue: c.count > 0 ? Math.round(c.totalRevenue / c.count) : 0,
            },
          })),
          metadata: {
            total_orders: orders?.length || 0,
            grid_cells: cells.length,
            category: category || 'all',
            period_days: days,
          },
        })
      }

      case 'demand-analysis': {
        // AI phân tích nhu cầu theo khu vực
        const { data: orders } = await supabase
          .from('orders')
          .select('category, location_lat, location_lng, status, final_price, created_at')
          .not('location_lat', 'is', null)
          .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString())
          .limit(200)

        const requests = (orders || []).length
        const hoanThanh = (orders || []).filter(o => o.status === 'completed').length

        const requestId = crypto.randomUUID()
        const ai = createAICore(supabase, { requestId })

        const result = await ai.orchestrateInternal('analytics', async () => ({
          systemPrompt: `Bạn là chuyên gia phân tích nhu cầu thị trường. Dựa vào dữ liệu đơn hàng, phân tích khu vực nào đang có nhu cầu cao.
Trả về JSON: {hot_zones: [{area: string, demand: string, recommendation: string}], top_opportunities: string[], worker_strategy: string}`,
          userPrompt: `Tổng số đơn (30 ngày): ${requests}
Hoàn thành: ${hoanThanh}
Tỷ lệ: ${requests > 0 ? ((hoanThanh / requests) * 100).toFixed(0) : 0}%
Phân tích nhu cầu:`,
        }))

        return jsonResponse({
          period_days: 30, total_orders: requests,
          completion_rate: requests > 0 ? Number(((hoanThanh / requests) * 100).toFixed(1)) : 0,
          ai_analysis: result.success ? result.data : null,
        })
      }

      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400)
    }
  } catch (error: any) {
    console.error('Heatmap error:', error)
    return jsonResponse({ error: error.message || 'Lỗi máy chủ' }, 500)
  }
})