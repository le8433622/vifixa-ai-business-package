'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { haversineDistance } from '@/lib/haversine'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

const CHECKLISTS: Record<string, string[]> = {
  air_conditioning: ['Kiểm tra gas', 'Vệ sinh lưới lọc', 'Kiểm tra block nóng/lạnh', 'Đo dòng điện', 'Vệ sinh dàn nóng'],
  electricity: ['Ngắt nguồn điện', 'Kiểm tra CB/aptomat', 'Đo điện áp', 'Kiểm tra dây dẫn', 'Kiểm tra thiết bị đầu cuối'],
  plumbing: ['Khóa van nước', 'Kiểm tra đường ống', 'Xác định vị trí rò rỉ', 'Kiểm tra áp lực nước', 'Vệ sinh khu vực'],
  default: ['Kiểm tra an toàn', 'Vệ sinh khu vực làm việc', 'Kiểm tra sau khi sửa', 'Dọn dẹp gọn gàng'],
}

export default function WorkerJobDetail() {
  const router = useRouter()
  const params = useParams()
  const jobId = params.id as string
  const [job, setJob] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [checklist, setChecklist] = useState<string[]>([])
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set())
  const [beforePhotos, setBeforePhotos] = useState<string[]>([])
  const [afterPhotos, setAfterPhotos] = useState<string[]>([])
  const [finalPrice, setFinalPrice] = useState(0)
  const [partsUsed, setPartsUsed] = useState('')
  const [showComplete, setShowComplete] = useState(false)
  const beforeInputRef = useRef<HTMLInputElement>(null)
  const afterInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadJob() }, [jobId])

  async function loadJob() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const { data } = await supabase.from('orders').select('*, customer:customer_id(full_name, phone, email)').eq('id', jobId).single()
    setJob(data)
    setFinalPrice(data?.estimated_price || 0)
    if (data?.category) {
      setChecklist(CHECKLISTS[data.category as string] || CHECKLISTS.default)
    }
    setLoading(false)
  }

  async function handleAccept() {
    setUpdating(true)
    const { data: { session } } = await supabase.auth.getSession()
    await supabase.from('orders').update({ worker_id: session?.user.id, status: 'matched', updated_at: new Date().toISOString() }).eq('id', jobId)
    await loadJob()
    setUpdating(false)
  }

  async function handleStart() {
    setUpdating(true)
    // AI Coach suggests tips before starting
    await supabase.from('orders').update({ status: 'in_progress', updated_at: new Date().toISOString() }).eq('id', jobId)
    await loadJob()
    setUpdating(false)
  }

  async function handleComplete() {
    setUpdating(true)
    const { data: { session } } = await supabase.auth.getSession()

    // Upload before/after photos
    const uploadPhotos = async (photos: string[]): Promise<string[]> => {
      const urls: string[] = []
      for (const photo of photos) {
        const res = await fetch(photo)
        const blob = await res.blob()
        const fileName = `job-${jobId}-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
        const { data } = await supabase.storage.from('order-evidence').upload(fileName, blob)
        if (data) {
          const { data: { publicUrl } } = supabase.storage.from('order-evidence').getPublicUrl(data.path)
          urls.push(publicUrl)
        }
      }
      return urls
    }

    const beforeUrls = beforePhotos.length > 0 ? await uploadPhotos(beforePhotos) : []
    const afterUrls = afterPhotos.length > 0 ? await uploadPhotos(afterPhotos) : []

    await supabase.from('orders').update({
      status: 'completed',
      final_price: finalPrice,
      before_media: beforeUrls,
      after_media: afterUrls,
      parts_used: partsUsed,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', jobId)

    // Auto-release escrow
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/wallet-manager`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'escrow:release', orderId: jobId }),
      })
    } catch {}

    // Trigger workflow engine
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/workflow-engine`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: jobId, event: 'job:completed' }),
      })
    } catch {}

    await loadJob()
    setShowComplete(false)
    setUpdating(false)
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {
    const files = e.target.files
    if (!files?.length) return
    const setter = type === 'before' ? setBeforePhotos : setAfterPhotos
    for (const f of Array.from(files)) {
      const reader = new FileReader()
      reader.onload = ev => { const t = ev?.target; if (!t?.result) return; setter(prev => [...prev, t.result as string]) }
      reader.readAsDataURL(f)
    }
  }

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" /></div>
  if (!job) return <div className="text-center py-20"><p className="text-gray-500">Không tìm thấy việc</p></div>

  const isPending = job.status === 'pending'
  const isMatched = job.status === 'matched'
  const isInProgress = job.status === 'in_progress'
  const isCompleted = job.status === 'completed'

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-5">
      {/* Header */}
      <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Quay lại
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold capitalize">{job.category}</h1>
          <p className="text-sm text-gray-500">{job.description}</p>
        </div>
        <StatusBadge status={job.status} />
      </div>

      {/* Customer Info */}
      <div className="bg-white rounded-xl border p-4">
        <p className="font-semibold mb-2">👤 Khách hàng</p>
        <p className="text-sm">{job.customer?.full_name || 'Đang cập nhật'}</p>
        <p className="text-xs text-gray-500">{job.customer?.phone || ''}</p>
        {job.address && <p className="text-xs text-gray-500 mt-1">📍 {job.address}</p>}
        <p className="text-xs text-gray-500 font-mono mt-1">Tọa độ: {job.location_lat?.toFixed(4)}, {job.location_lng?.toFixed(4)}</p>
      </div>

      {/* Map + Geo-fence Check-in */}
      {isMatched && <GeoFenceCheckIn job={job} jobId={jobId} />}

      {/* In Progress — Checklist + Photos */}
      {isInProgress && (
        <div className="space-y-4">
          {/* Checklist */}
          <div className="bg-white rounded-xl border p-4">
            <p className="font-semibold mb-3">📋 Checklist công việc</p>
            <div className="space-y-2">
              {checklist.map(item => (
                <label key={item} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={checkedItems.has(item)} onChange={() => {
                    const next = new Set(checkedItems)
                    next.has(item) ? next.delete(item) : next.add(item)
                    setCheckedItems(next)
                  }} className="w-4 h-4 text-emerald-600 rounded" />
                  <span className={`text-sm ${checkedItems.has(item) ? 'line-through text-gray-400' : ''}`}>{item}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Before Photos */}
          <div className="bg-white rounded-xl border p-4">
            <p className="font-semibold mb-2">📷 Ảnh trước khi sửa</p>
            <button onClick={() => beforeInputRef.current?.click()} className="px-3 py-1.5 border-2 border-dashed rounded-lg text-sm text-gray-500 hover:border-emerald-400">
              + Thêm ảnh
            </button>
            <input ref={beforeInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handlePhotoUpload(e, 'before')} />
            {beforePhotos.length > 0 && (
              <div className="flex gap-2 mt-2">
                {beforePhotos.map((url, i) => <img key={i} src={url} className="w-16 h-16 object-cover rounded-lg border" />)}
              </div>
            )}
          </div>

          {/* Complete Button */}
          <button onClick={() => setShowComplete(true)}
            disabled={checkedItems.size < checklist.length}
            className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50 shadow-lg">
            {checkedItems.size < checklist.length ? '✓ Hoàn thành checklist trước' : '✔️ Hoàn thành công việc'}
          </button>
        </div>
      )}

      {/* Complete Modal */}
      {showComplete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowComplete(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">✔️ Xác nhận hoàn thành</h2>

            {/* After Photos */}
            <div className="mb-4">
              <p className="text-sm font-medium mb-2">📷 Ảnh sau khi sửa</p>
              <button onClick={() => afterInputRef.current?.click()} className="px-3 py-1.5 border-2 border-dashed rounded-lg text-sm text-gray-500 hover:border-emerald-400">
                + Thêm ảnh
              </button>
              <input ref={afterInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handlePhotoUpload(e, 'after')} />
              {afterPhotos.length > 0 && (
                <div className="flex gap-2 mt-2">
                  {afterPhotos.map((url, i) => <img key={i} src={url} className="w-16 h-16 object-cover rounded-lg border" />)}
                </div>
              )}
            </div>

            {/* Final Price */}
            <div className="mb-4">
              <p className="text-sm font-medium mb-2">💰 Giá cuối cùng</p>
              <input type="number" value={finalPrice} onChange={e => setFinalPrice(Number(e.target.value))}
                className="w-full px-4 py-2 border rounded-xl text-lg font-bold" min={0} step={10000} />
            </div>

            {/* Parts Used */}
            <div className="mb-4">
              <p className="text-sm font-medium mb-2">🔧 Vật tư đã dùng</p>
              <textarea value={partsUsed} onChange={e => setPartsUsed(e.target.value)}
                placeholder="Ghi chú vật tư đã thay thế (nếu có)..."
                className="w-full px-4 py-2 border rounded-xl text-sm h-20" />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowComplete(false)} className="flex-1 py-2 border rounded-xl hover:bg-gray-50">Hủy</button>
              <button onClick={handleComplete} disabled={updating}
                className="flex-1 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 font-bold">
                {updating ? 'Đang xử lý...' : '✅ Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        {isPending && (
          <button onClick={handleAccept} disabled={updating}
            className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50 shadow-lg">
            {updating ? '...' : '📋 Nhận việc'}
          </button>
        )}
        {isMatched && (
          <button onClick={handleStart} disabled={updating}
            className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 shadow-lg">
            {updating ? '...' : '🔧 Bắt đầu'}
          </button>
        )}
        {isCompleted && (
          <button onClick={() => router.push('/worker/earnings')}
            className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg">
            💰 Xem thu nhập
          </button>
        )}
      </div>

      {/* Price */}
      <div className="bg-white rounded-xl border p-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Giá dự kiến</span>
          <span className="text-xl font-bold">{(job.estimated_price || 0).toLocaleString()}₫</span>
        </div>
        {job.final_price && (
          <div className="flex justify-between items-center mt-2 pt-2 border-t">
            <span className="text-gray-600">Giá cuối cùng</span>
            <span className="text-xl font-bold text-emerald-600">{(job.final_price || 0).toLocaleString()}₫</span>
          </div>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    matched: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-purple-100 text-purple-700',
    completed: 'bg-emerald-100 text-emerald-700',
  }
  const labels: Record<string, string> = {
    pending: 'Chờ xử lý', matched: 'Đã nhận', in_progress: 'Đang làm', completed: 'Hoàn thành',
  }
  return <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors[status] || 'bg-gray-100'}`}>{labels[status] || status}</span>
}

function GeoFenceCheckIn({ job, jobId }: { job: any; jobId: string }) {
  const [workerLat, setWorkerLat] = useState<number | null>(null)
  const [workerLng, setWorkerLng] = useState<number | null>(null)
  const [distance, setDistance] = useState<number | null>(null)
  const [withinRadius, setWithinRadius] = useState(false)
  const [checking, setChecking] = useState(false)
  const [checkedIn, setCheckedIn] = useState(false)
  const [error, setError] = useState('')
  const radiusKm = job.check_in_radius_km || 0.5

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setWorkerLat(lat)
        setWorkerLng(lng)
        if (job.location_lat && job.location_lng) {
          const dist = haversineDistance(lat, lng, job.location_lat, job.location_lng)
          setDistance(dist)
          setWithinRadius(dist <= radiusKm)
        }
      },
      () => setError('Không thể lấy vị trí của bạn')
    )
  }, [job.location_lat, job.location_lng, radiusKm])

  async function handleCheckIn() {
    if (!workerLat || !workerLng || !withinRadius) return
    setChecking(true)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const supabaseAny = supabase as any
      const validateResult: any = await supabaseAny.rpc('validate_check_in', {
        order_uuid: jobId,
        worker_lat: workerLat,
        worker_lng: workerLng,
      })
      if (validateResult.error) throw new Error(validateResult.error.message)

      if (!validateResult.data?.valid) {
        const distKm = validateResult.data?.distance_km || distance || radiusKm + 1
        setError(`Bạn chưa đến gần địa điểm khách hàng (còn ${Math.round((distKm - radiusKm) * 1000)}m)`);
        return
      }

      await supabaseAny.rpc('record_check_in', {
        order_uuid: jobId,
        worker_lat: workerLat,
        worker_lng: workerLng,
        distance_km: distance || 0,
        within_radius: true,
      })

      await fetch(`${SUPABASE_URL}/functions/v1/workflow-engine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ order_id: jobId, event: 'worker:arrived' }),
      })

      setCheckedIn(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setChecking(false)
    }
  }

  if (checkedIn) {
    return (
      <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <p className="font-medium text-emerald-800">Đã check-in thành công</p>
            <p className="text-xs text-emerald-600">Vị trí của bạn đã được xác nhận</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">🗺️</span>
        <div>
          <p className="font-medium text-emerald-800">Dẫn đường đến khách</p>
          {distance !== null ? (
            <p className={`text-xs ${withinRadius ? 'text-emerald-600' : 'text-amber-600'}`}>
              {withinRadius ? '✅ Trong phạm vi check-in' : `📍 Cách ${(distance * 1000).toFixed(0)}m (cần trong bán kính ${(radiusKm * 1000).toFixed(0)}m)`}
            </p>
          ) : (
            <p className="text-xs text-gray-500">Đang lấy vị trí...</p>
          )}
        </div>
      </div>
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
      <button onClick={handleCheckIn} disabled={checking || !withinRadius || !workerLat}
        className="w-full py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition disabled:opacity-50">
        {checking ? 'Đang xác thực...' : '📍 Check-in — Xác nhận đã đến'}
      </button>
    </div>
  )
}
