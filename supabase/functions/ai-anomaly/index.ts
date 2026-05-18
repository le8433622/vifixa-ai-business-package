import { verifyAuth, jsonResponse, handleOptions } from '../_shared/auth-helper.ts'
import { logVifixa } from '../_shared/logger.ts'

interface AnomalyAlert {
  alert_type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  evidence: Record<string, unknown>
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const CRON_SECRET = Deno.env.get('CRON_SECRET') || ''

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: {
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
  return res.json()
}

async function detectPriceSpikes(): Promise<AnomalyAlert[]> {
  const alerts: AnomalyAlert[] = []
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()

  const orders: any[] = await fetchJson(
    `${SUPABASE_URL}/rest/v1/orders?select=id,category,estimated_price,final_price,created_at,worker_id&status=neq.cancelled&created_at=gte.${thirtyDaysAgo}&order=created_at.desc`
  )

  const byCategory: Record<string, number[]> = {}
  for (const o of orders) {
    const price = o.final_price || o.estimated_price
    if (!byCategory[o.category]) byCategory[o.category] = []
    byCategory[o.category].push(price)
  }

  for (const [cat, prices] of Object.entries(byCategory)) {
    if (prices.length < 5) continue
    const sorted = [...prices].sort((a, b) => a - b)
    const median = sorted[Math.floor(sorted.length / 2)]
    const threshold = median * 2.5

    for (const o of orders) {
      const price = o.final_price || o.estimated_price
      if (price > threshold && o.category === cat) {
        alerts.push({
          alert_type: 'price_spike',
          severity: price > median * 4 ? 'critical' : 'high',
          description: `Đơn #${o.id.slice(0, 8)} — ${cat}: ${price.toLocaleString()}₫ (gấp ${(price / median).toFixed(1)}x mức trung bình ${median.toLocaleString()}₫)`,
          evidence: { order_id: o.id, category: cat, price, median, multiplier: price / median },
        })
      }
    }
  }

  return alerts
}

async function detectWorkerFraud(): Promise<AnomalyAlert[]> {
  const alerts: AnomalyAlert[] = []
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()

  const res: any[] = await fetchJson(
    `${SUPABASE_URL}/rest/v1/rpc/anomaly_worker_stats`,
  )

  if (!res || !res.length) {
    const workers: any[] = await fetchJson(
      `${SUPABASE_URL}/rest/v1/workers?select=id,is_verified,trust_score,is_online`
    )
    const orders: any[] = await fetchJson(
      `${SUPABASE_URL}/rest/v1/orders?select=id,worker_id,estimated_price,final_price,status,created_at&worker_id=not.is.null&created_at=gte.${thirtyDaysAgo}`
    )

    const stats: Record<string, { count: number; totalPrice: number; disputes: number; lastOrder: string }> = {}
    for (const o of orders) {
      if (!stats[o.worker_id]) stats[o.worker_id] = { count: 0, totalPrice: 0, disputes: 0, lastOrder: '' }
      stats[o.worker_id].count++
      stats[o.worker_id].totalPrice += o.final_price || o.estimated_price || 0
      if (o.status === 'disputed') stats[o.worker_id].disputes++
      if (o.created_at > stats[o.worker_id].lastOrder) stats[o.worker_id].lastOrder = o.created_at
    }

    for (const [wid, s] of Object.entries(stats)) {
      if (s.count >= 8 && s.totalPrice / s.count > 2000000) {
        alerts.push({
          alert_type: 'worker_high_volume_high_value',
          severity: 'high',
          description: `Thợ ${wid.slice(0, 8)}: ${s.count} đơn trong 30 ngày, giá TB ${(s.totalPrice / s.count / 1000).toFixed(0)}k`,
          evidence: { worker_id: wid, order_count: s.count, avg_price: s.totalPrice / s.count },
        })
      }
      if (s.count >= 10) {
        alerts.push({
          alert_type: 'worker_extreme_volume',
          severity: 'medium',
          description: `Thợ ${wid.slice(0, 8)}: ${s.count} đơn trong 30 ngày (≥10)`,
          evidence: { worker_id: wid, order_count: s.count },
        })
      }
      if (s.disputes > 0 && s.disputes / s.count > 0.2) {
        alerts.push({
          alert_type: 'worker_high_dispute_rate',
          severity: 'critical',
          description: `Thợ ${wid.slice(0, 8)}: ${s.disputes}/${s.count} đơn bị khiếu nại (${(s.disputes / s.count * 100).toFixed(0)}%)`,
          evidence: { worker_id: wid, dispute_count: s.disputes, total_orders: s.count, rate: s.disputes / s.count },
        })
      }
    }
  }

  return alerts
}

async function detectCancelSurge(): Promise<AnomalyAlert[]> {
  const alerts: AnomalyAlert[] = []
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()

  const orders: any[] = await fetchJson(
    `${SUPABASE_URL}/rest/v1/orders?select=id,status,created_at&created_at=gte.${sevenDaysAgo}`
  )

  if (orders.length < 20) return alerts

  const cancelled = orders.filter((o: any) => o.status === 'cancelled').length
  const disputed = orders.filter((o: any) => o.status === 'disputed').length
  const cancelRate = cancelled / orders.length
  const disputeRate = disputed / orders.length

  if (cancelRate > 0.3) {
    alerts.push({
      alert_type: 'cancel_surge',
      severity: cancelRate > 0.5 ? 'critical' : 'high',
      description: `Tỷ lệ hủy đơn: ${(cancelRate * 100).toFixed(0)}% (${cancelled}/${orders.length} đơn) trong 7 ngày`,
      evidence: { cancel_rate: cancelRate, cancelled, total: orders.length, period: '7d' },
    })
  }

  if (disputeRate > 0.15) {
    alerts.push({
      alert_type: 'dispute_surge',
      severity: disputeRate > 0.25 ? 'critical' : 'high',
      description: `Tỷ lệ khiếu nại: ${(disputeRate * 100).toFixed(0)}% (${disputed}/${orders.length} đơn) trong 7 ngày`,
      evidence: { dispute_rate: disputeRate, disputed, total: orders.length, period: '7d' },
    })
  }

  return alerts
}

async function detectSystemAnomalies(): Promise<AnomalyAlert[]> {
  const alerts: AnomalyAlert[] = []
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 86400000).toISOString()

  try {
    const workflows: any[] = await fetchJson(
      `${SUPABASE_URL}/rest/v1/workflow_states?select=id,order_id,current_state,error_count,last_error,updated_at&error_count=gt.3&updated_at=gte.${twentyFourHoursAgo}&order=error_count.desc`
    )

    if (workflows && workflows.length > 0) {
      alerts.push({
        alert_type: 'workflow_failures',
        severity: workflows.length > 10 ? 'critical' : 'high',
        description: `${workflows.length} workflow thất bại (error_count > 3) trong 24h qua`,
        evidence: { failed_workflows: workflows.length, samples: workflows.slice(0, 5) },
      })
    }
  } catch {
    // workflow_states table might not exist
  }

  // Check for rapid order creation (bot detection)
  const oneHourAgo = new Date(Date.now() - 3600000).toISOString()
  const recentOrders: any[] = await fetchJson(
    `${SUPABASE_URL}/rest/v1/orders?select=customer_id&created_at=gte.${oneHourAgo}`
  )

  if (recentOrders && recentOrders.length > 0) {
    const byCustomer: Record<string, number> = {}
    for (const o of recentOrders) {
      byCustomer[o.customer_id] = (byCustomer[o.customer_id] || 0) + 1
    }
    for (const [cid, count] of Object.entries(byCustomer)) {
      if (count >= 5) {
        alerts.push({
          alert_type: 'rapid_order_creation',
          severity: 'high',
          description: `Khách ${cid.slice(0, 8)}: ${count} đơn trong 1 giờ (bot-like)`,
          evidence: { customer_id: cid, order_count: count, time_window: '1h' },
        })
      }
    }
  }

  return alerts
}

Deno.serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt

  try {
    let userId = ''
    let isCron = false
    const authHeader = req.headers.get('authorization')

    if (CRON_SECRET && authHeader === `Bearer ${CRON_SECRET}`) {
      userId = 'cron'
      isCron = true
    } else {
      const user = await verifyAuth(req)
      if (!user) return jsonResponse({ error: 'Unauthorized' }, 401)
      const profile: any = await fetchJson(
        `${SUPABASE_URL}/rest/v1/profiles?select=role&id=eq.${user.id}`
      )
      if (!profile?.[0] || profile[0].role !== 'admin') {
        return jsonResponse({ error: 'Forbidden' }, 403)
      }
      userId = user.id
    }

    logVifixa('ai-anomaly', 'start', { triggered_by: userId })

    const [
      priceAlerts,
      workerAlerts,
      cancelAlerts,
      systemAlerts,
    ] = await Promise.all([
      detectPriceSpikes(),
      detectWorkerFraud(),
      detectCancelSurge(),
      detectSystemAnomalies(),
    ])

    const alerts = [...priceAlerts, ...workerAlerts, ...cancelAlerts, ...systemAlerts]
    const highAlerts = alerts.filter(a => a.severity === 'high' || a.severity === 'critical')

    if (isCron && highAlerts.length > 0) {
      const admins: any[] = await fetchJson(
        `${SUPABASE_URL}/rest/v1/profiles?select=id&role=eq.admin`
      )

      if (admins) {
        for (const admin of admins) {
          await fetch(`${SUPABASE_URL}/rest/v1/in_app_notifications`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify({
              user_id: admin.id,
              title: `⚠️ Phát hiện ${highAlerts.length} bất thường`,
              body: highAlerts.map(a => `[${a.severity === 'critical' ? '🔴' : '🟡'}] ${a.description}`).join('\n'),
              category: 'system_alert',
              priority: highAlerts.some(a => a.severity === 'critical') ? 'urgent' : 'high',
              action_url: '/admin/analytics',
              action_label: 'Xem phân tích',
            }),
          })
        }
      }
    }

    if (alerts.length > 0) {
      await fetch(`${SUPABASE_URL}/rest/v1/ai_logs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          agent_type: 'fraud',
          input: { triggered_by: userId, timestamp: new Date().toISOString() },
          output: { alerts, alerts_count: alerts.length, high_severity_count: highAlerts.length },
        }),
      })
    }

    logVifixa('ai-anomaly', 'complete', {
      alerts_count: alerts.length,
      high_severity: highAlerts.length,
    })

    return jsonResponse({
      success: true,
      alerts,
      alerts_count: alerts.length,
      high_severity_count: highAlerts.length,
      summary: {
        price_spikes: priceAlerts.length,
        worker_fraud: workerAlerts.length,
        cancel_dispute_surge: cancelAlerts.length,
        system_anomalies: systemAlerts.length,
      },
    })
  } catch (error: unknown) {
    logVifixa('ai-anomaly', 'error', { error: (error as Error).message })
    return jsonResponse({ error: (error as Error).message }, 500)
  }
})
