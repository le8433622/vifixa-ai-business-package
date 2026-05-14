'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

// ⚡ Bảng điều khiển trực tiếp — Real-time AI calls, alerts, metrics

export default function TrangGiamSat() {
  const router = useRouter()
  const [luotGoi, setLuotGoi] = useState<any[]>([])
  const [canhBao, setCanhBao] = useState<any[]>([])
  const [chiPhiHomNay, setChiPhiHomNay] = useState(0)
  const [soCuocGoi, setSoCuocGoi] = useState(0)

  async function kiemTraAuth() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/'); return }
  }

  async function taiCanhBao() {
    const { data } = await supabase.from('in_app_notifications').select('*').eq('category', 'ai_alert').order('created_at', { ascending: false }).limit(20)
    setCanhBao(data || [])
  }

  async function taiChiPhiHomNay() {
    const homNay = new Date().toISOString().split('T')[0]
    const { data } = await supabase.from('ai_cost_log').select('cost').gte('created_at', `${homNay}T00:00:00Z`)
    const logs = (data || []) as { cost: number }[]
    setChiPhiHomNay(logs.reduce((s, r) => s + Number(r.cost || 0), 0))
    setSoCuocGoi(logs.length)
  }

  useEffect(() => {
    queueMicrotask(() => { kiemTraAuth(); taiCanhBao(); taiChiPhiHomNay() })
    const kenh = supabase.channel('giam-sat-ai')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ai_logs' }, (p: any) => {
        setLuotGoi(prev => [{ ...p.new }, ...prev].slice(0, 50))
        setChiPhiHomNay(prev => prev + Number(p.new.cost || 0))
        setSoCuocGoi(prev => prev + 1)
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'in_app_notifications' }, (p: any) => {
        if (p.new.category === 'ai_alert') setCanhBao(prev => [{ ...p.new }, ...prev].slice(0, 20))
      })
      .subscribe()
    return () => { supabase.removeChannel(kenh) }
  }, [])

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">📡 Giám sát AI trực tiếp</h1>
          <p className="text-gray-600 mt-1">Theo dõi các cuộc gọi AI và cảnh báo theo thời gian thực</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => router.push('/admin/ai/cost')} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Chi phí</button>
          <button onClick={() => router.push('/admin/ai/accuracy')} className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Độ chính xác</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <p className="text-sm text-gray-600 mb-1">Lượt AI hôm nay</p>
          <p className="text-3xl font-bold text-blue-600">{soCuocGoi}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <p className="text-sm text-gray-600 mb-1">Chi phí hôm nay</p>
          <p className={`text-3xl font-bold ${chiPhiHomNay > 5 ? 'text-red-600' : chiPhiHomNay > 1 ? 'text-yellow-600' : 'text-green-600'}`}>
            ${chiPhiHomNay.toFixed(4)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <p className="text-sm text-gray-600 mb-1">Cảnh báo chưa đọc</p>
          <p className={`text-3xl font-bold ${canhBao.filter(a => !a.is_read).length > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {canhBao.filter(a => !a.is_read).length}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-bold text-sm">🔴 Luồng AI trực tiếp</h2>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-gray-500">Thời gian thực</span>
            </span>
          </div>
          <div className="h-96 overflow-y-auto p-4 space-y-2">
            {luotGoi.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-4xl mb-2">📡</p>
                <p className="text-sm">Đang chờ cuộc gọi AI...</p>
                <p className="text-xs mt-1">Khi có cuộc gọi AI mới, chúng sẽ xuất hiện tại đây.</p>
              </div>
            ) : luotGoi.map((log) => (
              <div key={log.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg text-sm">
                <span className={`w-2 h-2 rounded-full shrink-0 ${log.cache_hit ? 'bg-green-400' : 'bg-blue-400'}`} />
                <span className="capitalize font-medium w-20 text-xs">{log.agent_type}</span>
                <span className="text-gray-500 text-xs flex-1 truncate">{log.model || 'N/A'}</span>
                <span className="text-gray-500 text-xs w-16 text-right">{log.latency_ms}ms</span>
                <span className={`text-xs font-mono w-16 text-right ${Number(log.cost) > 0.001 ? 'text-yellow-600' : 'text-gray-500'}`}>${Number(log.cost).toFixed(6)}</span>
                {log.cache_hit && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">cache</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-bold text-sm">🔔 Cảnh báo AI</h2>
            <span className="text-xs text-gray-500">{canhBao.filter(a => !a.is_read).length} chưa đọc</span>
          </div>
          <div className="h-96 overflow-y-auto p-4 space-y-2">
            {canhBao.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-4xl mb-2">🔕</p>
                <p className="text-sm">Chưa có cảnh báo nào</p>
                <p className="text-xs mt-1">Cảnh báo xuất hiện khi chi phí vượt ngưỡng hoặc độ chính xác giảm.</p>
              </div>
            ) : canhBao.map((alert) => (
              <button key={alert.id} onClick={() => xuLyCanhBao(alert)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${alert.is_read ? 'bg-white border-gray-100' : 'bg-blue-50 border-blue-200'}`}>
                <div className="flex items-start gap-2">
                  <span className="text-lg">{alert.metadata?.severity === 'critical' ? '🔴' : alert.metadata?.severity === 'warning' ? '🟡' : '🔵'}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${!alert.is_read ? 'text-blue-800' : 'text-gray-700'}`}>{alert.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{alert.body}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(alert.created_at).toLocaleString('vi-VN')}</p>
                  </div>
                  {!alert.is_read && <span className="w-2 h-2 rounded-full bg-blue-500 mt-1 shrink-0" />}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}