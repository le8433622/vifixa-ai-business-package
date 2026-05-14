'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { PageHeader, LoadingState, EmptyState, ErrorAlert, FilterBar, InfoBadge } from '@/components/admin/AIUI'

export default function TrangPhanHoiAI() {
  const router = useRouter()
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [boLoc, setBoLoc] = useState('tat_ca')

  useEffect(() => { queueMicrotask(() => layDuLieu()) }, [])

  async function layDuLieu() {
    setLoading(true); setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }
      const { data } = await supabase.from('ai_feedback').select('*').order('created_at', { ascending: false }).limit(100)
      setData(data || [])
    } catch (err: any) { setError(err.message) }
    finally { setLoading(false) }
  }

  const daLoc = boLoc === 'tat_ca' ? data
    : boLoc === 'dung' ? data.filter(f => f.is_correct === true)
    : boLoc === 'sai' ? data.filter(f => f.is_correct === false)
    : data.filter(f => f.is_correct === null)

  return (
    <div className="max-w-6xl mx-auto p-6">
      <PageHeader
        title="Phản hồi AI"
        description="Xem và đánh giá phản hồi từ người dùng về các quyết định AI"
        actions={
          <FilterBar
            options={[
              { key: 'tat_ca', label: 'Tất cả', count: data.length },
              { key: 'dung', label: 'Đúng', count: data.filter(f => f.is_correct === true).length },
              { key: 'sai', label: 'Sai', count: data.filter(f => f.is_correct === false).length },
              { key: 'cho_xem_xet', label: 'Chờ xem xét', count: data.filter(f => f.is_correct === null).length },
            ]}
            selected={boLoc}
            onChange={setBoLoc}
          />
        }
      />

      {error && <ErrorAlert message={error} onRetry={layDuLieu} />}

      {loading ? <LoadingState text="Đang tải phản hồi..." /> : daLoc.length === 0 ? (
        <EmptyState icon="💬" title="Chưa có phản hồi nào" description="Phản hồi từ người dùng sẽ xuất hiện tại đây." />
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="p-3 text-left font-semibold text-gray-600 text-sm">Agent</th>
                <th className="p-3 text-left font-semibold text-gray-600 text-sm">Đánh giá</th>
                <th className="p-3 text-left font-semibold text-gray-600 text-sm">Kết quả</th>
                <th className="p-3 text-left font-semibold text-gray-600 text-sm">Bình luận</th>
                <th className="p-3 text-left font-semibold text-gray-600 text-sm">Ngày</th>
              </tr>
            </thead>
            <tbody>
              {daLoc.map(f => (
                <tr key={f.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 capitalize font-medium text-sm">{f.agent_type}</td>
                  <td className="p-3 text-sm">
                    {f.rating ? <span className="text-yellow-500">{'★'.repeat(f.rating)}{'☆'.repeat(5 - f.rating)}</span> : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="p-3 text-sm">
                    {f.is_correct === true ? <InfoBadge label="Đúng" color="green" />
                    : f.is_correct === false ? <InfoBadge label="Sai" color="red" />
                    : <InfoBadge label="Chờ" color="gray" />}
                  </td>
                  <td className="p-3 text-sm text-gray-600 max-w-xs truncate">{f.comment || '—'}</td>
                  <td className="p-3 text-sm text-gray-500">{new Date(f.created_at).toLocaleDateString('vi-VN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}