'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import DynamicMapView from '@/components/map/DynamicMapView'
import { haversineDistance, formatDistance } from '@/lib/haversine'
import DistanceBadge from '@/components/map/DistanceBadge'

interface NearbyOrder {
  id: string
  category: string
  description: string
  status: string
  estimated_price: number
  location_lat: number
  location_lng: number
  address: string
  created_at: string
  distance_km?: number
}

const CATEGORY_LABELS: Record<string, string> = {
  air_conditioning: 'Máy lạnh', electricity: 'Điện', plumbing: 'Nước',
  camera: 'Camera', refrigerator: 'Tủ lạnh', washing_machine: 'Máy giặt',
  water_heater: 'Máy nước nóng', appliance: 'Đồ gia dụng', other: 'Khác',
}

export default function WorkerMapPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<NearbyOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [workerPos, setWorkerPos] = useState<{ lat: number; lng: number } | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null)
  const [routeCoords, setRouteCoords] = useState<Array<[number, number]> | null>(null)
  const [routeEta, setRouteEta] = useState<{ distance: number; duration: number } | null>(null)

  useEffect(() => {
    load()
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setWorkerPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      )
    }
  }, [])

  async function load() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }

    // Get worker location
    const { data: worker } = await supabase.from('workers').select('location_lat, location_lng').eq('id', session.user.id).single()
    const wLat = worker?.location_lat
    const wLng = worker?.location_lng

    // Load pending orders (without a worker assigned)
    const { data: ordersData } = await supabase
      .from('orders')
      .select('id, category, description, status, estimated_price, location_lat, location_lng, address, created_at')
      .eq('status', 'pending')
      .not('location_lat', 'is', null)
      .not('location_lng', 'is', null)
      .order('created_at', { ascending: false })

    if (!ordersData) { setLoading(false); return }

    let mapped: NearbyOrder[] = ordersData.map(o => ({
      ...o,
      distance_km: wLat && wLng && o.location_lat && o.location_lng
        ? haversineDistance(wLat, wLng, o.location_lat, o.location_lng)
        : undefined,
    }))

    // Sort by distance
    mapped.sort((a, b) => (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity))
    setOrders(mapped)
    setLoading(false)
  }

  async function acceptOrder(orderId: string) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    await supabase.from('orders').update({
      worker_id: session.user.id,
      status: 'matched',
      updated_at: new Date().toISOString(),
    }).eq('id', orderId)

    await supabase.from('workers').update({ status: 'busy' }).eq('id', session.user.id)
    router.push(`/worker/jobs/${orderId}`)
  }

  // Fetch OSRM route when order selected
  useEffect(() => {
    if (!selectedOrder || !workerPos) { setRouteCoords(null); setRouteEta(null); return }
    const order = orders.find(o => o.id === selectedOrder)
    if (!order) return

    const from = `${workerPos.lng},${workerPos.lat}`
    const to = `${order.location_lng},${order.location_lat}`
    fetch(`https://router.project-osrm.org/route/v1/driving/${from};${to}?overview=full&geometries=geojson`)
      .then(r => r.json())
      .then(data => {
        const route = data?.routes?.[0]
        const coords = route?.geometry?.coordinates
        if (coords) setRouteCoords(coords.map((c: number[]) => [c[1], c[0]] as [number, number]))
        if (route) setRouteEta({ distance: route.distance, duration: route.duration })
      })
      .catch(() => {})
  }, [selectedOrder, workerPos])

  if (loading) return (
    <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
    </div>
  )

  const selectedOrderData = selectedOrder ? orders.find(o => o.id === selectedOrder) : null

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col">
      {/* Map area */}
      <div className="flex-1 relative min-h-0">
        <DynamicMapView
          center={[workerPos?.lat || 10.77, workerPos?.lng || 106.69]}
          zoom={12}
          markers={[
            ...(workerPos ? [{ position: [workerPos.lat, workerPos.lng] as [number, number], title: '📍 Vị trí của tôi' }] : []),
            ...orders.map(o => ({
              position: [o.location_lat, o.location_lng] as [number, number],
              title: `${CATEGORY_LABELS[o.category] || o.category} - ${formatDistance(o.distance_km || 0)}`,
              onClick: () => setSelectedOrder(o.id),
            })),
          ]}
          route={routeCoords || undefined}
          style={{ height: '100%', width: '100%' }}
        />

        {/* Orders count */}
        <div className="absolute top-4 right-4 z-10 bg-white rounded-full shadow-lg px-3 py-1.5 text-sm font-medium text-gray-700">
          {orders.length} đơn gần bạn
        </div>

        {/* Order list button */}
        <div className="absolute top-4 left-4 z-10">
          <button onClick={() => setSelectedOrder(null)}
            className="bg-white rounded-lg shadow-lg px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            📋 Danh sách
          </button>
        </div>
      </div>

      {/* Bottom panel: order list or selected order */}
      <div className="shrink-0 bg-white border-t max-h-[40vh] overflow-y-auto">
        {selectedOrderData ? (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900">{CATEGORY_LABELS[selectedOrderData.category] || selectedOrderData.category}</h3>
              <span className="text-lg font-bold text-emerald-600">{selectedOrderData.estimated_price.toLocaleString()}₫</span>
            </div>
            <p className="text-sm text-gray-600">{selectedOrderData.description}</p>
            {selectedOrderData.address && <p className="text-xs text-gray-500">📍 {selectedOrderData.address}</p>}
            {workerPos && (
              <DistanceBadge
                from={workerPos}
                to={{ lat: selectedOrderData.location_lat, lng: selectedOrderData.location_lng }}
              />
            )}
            {routeCoords && (
              <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
                <span>🛣️ Có lộ trình</span>
                {routeEta && (
                  <span className="text-gray-700 font-medium">
                    {routeEta.duration > 60
                      ? `${Math.round(routeEta.duration / 60)} phút`
                      : `${Math.round(routeEta.duration)} giây`}
                    {' · '}
                    {routeEta.distance > 1000
                      ? `${(routeEta.distance / 1000).toFixed(1)} km`
                      : `${Math.round(routeEta.distance)} m`}
                  </span>
                )}
                <span className="text-gray-500">→ {selectedOrderData.address?.slice(0, 25) || 'Đã có chỉ đường'}</span>
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => acceptOrder(selectedOrderData.id)}
                className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700">
                ✅ Nhận đơn
              </button>
              <button onClick={() => setSelectedOrder(null)} className="px-4 py-2.5 border rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                ← Danh sách
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y">
            <div className="px-4 py-2.5 bg-gray-50 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase">Đơn gần bạn ({orders.length})</span>
              <span className="text-xs text-gray-400">Nhấn vào marker để xem chi tiết</span>
            </div>
            {orders.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">Không có đơn nào gần bạn</div>
            ) : (
              orders.slice(0, 20).map(o => (
                <button key={o.id} onClick={() => setSelectedOrder(o.id)}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition text-left">
                  <span className="text-2xl shrink-0">
                    {o.category === 'air_conditioning' ? '❄️' : o.category === 'electricity' ? '💡' : o.category === 'plumbing' ? '🚿' : '🔧'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{CATEGORY_LABELS[o.category] || o.category}</p>
                    <p className="text-xs text-gray-500 truncate">{o.description?.slice(0, 60)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-gray-900">{o.estimated_price.toLocaleString()}₫</p>
                    {o.distance_km != null && <p className="text-xs text-blue-600 font-medium">{formatDistance(o.distance_km)}</p>}
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
