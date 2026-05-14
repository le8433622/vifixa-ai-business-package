'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { PageHeader, StatCard, LoadingState, EmptyState, ErrorAlert, InfoBadge } from '@/components/admin/AIUI'

export default function TrangDoChinhXac() {
  const router = useRouter()
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { queueMicrotask(() => layDuLieu()) }, [])

  async function layDuLieu() {
    setLoading(true); setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }
      const { data } = await supabase.from('ai_agent_accuracy').select('*')
      setData(data || [])
    } catch (err: any) { setError(err.message) }
    finally { setLoading(false) }
  }

  const doChinhXacTB = data.length > 0 ? data.reduce((s, r) => s + r.accuracy_pct, 0) / data.length : 0
  const danhGiaTB = data.length > 0 ? data.reduce((s, r) => s + r.avg_rating, 0) / data.length : 0
  const tongPhanHoi = data.reduce((s, r) => s + r.total_feedback, 0)

  return (
    <div className="max-w-6xl mx-auto p-6">
      <PageHeader title="Độ chính xác AI" description="Tỷ lệ đúng/sai của từng AI agent dựa trên phản hồi từ người dùng" />

      {error && <ErrorAlert message={error} onRetry={layDuLieu} />}

      {loading ? (
        <LoadingState text="Đang tải dữ liệu..." />
      ) : data.length === 0 ? (
        <EmptyState icon="🎯" title="Chưa có dữ liệu" description="Phản hồi từ người dùng sẽ xuất hiện tại đây." />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 mb-8 mt-2">
            <StatCard label="Độ chính xác trung bình" value={`${doChinhXacTB.toFixed(1)}%`}
              color={doChinhXacTB >= 80 ? 'green' : doChinhXacTB >= 60 ? 'yellow' : 'red'} />
            <StatCard label="Đánh giá trung bình" value={danhGiaTB.toFixed(2)} color="blue" />
            <StatCard label="Tổng số phản hồi" value={tongPhanHoi} color="gray" />
          </div>

          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="p-4 text-left font-semibold text-gray-600 text-sm">AI Agent</th>
                  <th className="p-4 text-right font-semibold text-gray-600 text-sm">Độ chính xác</th>
                  <th className="p-4 text-right font-semibold text-gray-600 text-sm">Đúng</th>
                  <th className="p-4 text-right font-semibold text-gray-600 text-sm">Sai</th>
                  <th className="p-4 text-right font-semibold text-gray-600 text-sm">Phản hồi</th>
                  <th className="p-4 text-right font-semibold text-gray-600 text-sm">Đánh giá</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.agent_type} className="border-b hover:bg-gray-50">
                    <td className="p-4 capitalize font-medium text-sm">{row.agent_type}</td>
                    <td className="p-4 text-right">
                      <InfoBadge label={`${row.accuracy_pct.toFixed(1)}%`}
                        color={row.accuracy_pct >= 80 ? 'green' : row.accuracy_pct >= 60 ? 'yellow' : 'red'} />
                    </td>
                    <td className="p-4 text-right text-green-600 font-medium text-sm">{row.correct}</td>
                    <td className="p-4 text-right text-red-600 font-medium text-sm">{row.incorrect}</td>
                    <td className="p-4 text-right text-sm">{row.total_feedback}</td>
                    <td className="p-4 text-right font-medium text-sm">{row.avg_rating.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}