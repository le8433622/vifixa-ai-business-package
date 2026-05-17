import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, FlatList, Dimensions } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import MapView, { Marker, Callout } from 'react-native-maps'
import * as Location from 'expo-location'

const { width } = Dimensions.get('window')

const CATEGORY_LABELS: Record<string, string> = {
  air_conditioning: 'Máy lạnh', electricity: 'Điện', plumbing: 'Nước',
  camera: 'Camera', refrigerator: 'Tủ lạnh', washing_machine: 'Máy giặt',
  water_heater: 'Máy nước nóng', appliance: 'Đồ gia dụng', other: 'Khác',
}

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
  customer_name?: string
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export default function WorkerMapScreen() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<NearbyOrder[]>([])
  const [workerPos, setWorkerPos] = useState<{ latitude: number; longitude: number } | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<NearbyOrder | null>(null)

  useEffect(() => {
    init()
  }, [])

  async function init() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }

    const pos = await Location.getCurrentPositionAsync({})
    setWorkerPos({ latitude: pos.coords.latitude, longitude: pos.coords.longitude })

    const { data: ordersData } = await supabase
      .from('orders')
      .select('id, category, description, status, estimated_price, location_lat, location_lng, address, created_at')
      .eq('status', 'pending')
      .not('location_lat', 'is', null)
      .not('location_lng', 'is', null)
      .order('created_at', { ascending: false })

    if (ordersData) {
      let mapped: NearbyOrder[] = ordersData.map(o => ({
        ...o,
        distance_km: haversineDistance(pos.coords.latitude, pos.coords.longitude, o.location_lat, o.location_lng),
      }))
      mapped.sort((a, b) => (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity))
      setOrders(mapped)
    }
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
    router.push(`/(worker)/jobs/${orderId}`)
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#059669" /></View>
  }

  return (
    <View style={styles.container}>
      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          style={StyleSheet.absoluteFill}
          initialRegion={{
            latitude: workerPos?.latitude || 10.77,
            longitude: workerPos?.longitude || 106.69,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
        >
          {workerPos && (
            <Marker
              coordinate={{ latitude: workerPos.latitude, longitude: workerPos.longitude }}
              title="📍 Vị trí của tôi"
              pinColor="#059669"
            />
          )}
          {orders.map(o => (
            <Marker
              key={o.id}
              coordinate={{ latitude: o.location_lat, longitude: o.location_lng }}
              title={CATEGORY_LABELS[o.category] || o.category}
              description={`${o.estimated_price.toLocaleString()}₫`}
              onPress={() => setSelectedOrder(o)}
            >
              <Callout onPress={() => setSelectedOrder(o)}>
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle}>{CATEGORY_LABELS[o.category] || o.category}</Text>
                  <Text style={styles.calloutPrice}>{o.estimated_price.toLocaleString()}₫</Text>
                  {o.distance_km != null && <Text style={styles.calloutDist}>{o.distance_km < 1 ? `${Math.round(o.distance_km * 1000)}m` : `${o.distance_km.toFixed(1)}km`}</Text>}
                </View>
              </Callout>
            </Marker>
          ))}
        </MapView>
      </View>

      {/* Bottom panel */}
      <View style={styles.bottomPanel}>
        {selectedOrder ? (
          <View style={styles.detailCard}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailTitle}>{CATEGORY_LABELS[selectedOrder.category] || selectedOrder.category}</Text>
              <Text style={styles.detailPrice}>{selectedOrder.estimated_price.toLocaleString()}₫</Text>
            </View>
            <Text style={styles.detailDesc}>{selectedOrder.description}</Text>
            {selectedOrder.address && <Text style={styles.detailAddr}>📍 {selectedOrder.address}</Text>}
            {selectedOrder.distance_km != null && (
              <Text style={styles.detailDist}>Khoảng cách: {selectedOrder.distance_km < 1 ? `${Math.round(selectedOrder.distance_km * 1000)}m` : `${selectedOrder.distance_km.toFixed(1)}km`}</Text>
            )}
            <View style={styles.detailActions}>
              <TouchableOpacity style={styles.acceptBtn} onPress={() => acceptOrder(selectedOrder.id)}>
                <Text style={styles.acceptBtnText}>✅ Nhận đơn</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedOrder(null)}>
                <Text style={styles.backBtnText}>← Danh sách</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>Đơn gần bạn ({orders.length})</Text>
              <Text style={styles.listHint}>Nhấn vào marker để xem chi tiết</Text>
            </View>
            {orders.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>Không có đơn nào gần bạn</Text>
              </View>
            ) : (
              <FlatList
                data={orders}
                keyExtractor={item => item.id}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.orderRow} onPress={() => setSelectedOrder(item)}>
                    <Text style={styles.orderIcon}>
                      {item.category === 'air_conditioning' ? '❄️' : item.category === 'electricity' ? '💡' : item.category === 'plumbing' ? '🚿' : '🔧'}
                    </Text>
                    <View style={styles.orderInfo}>
                      <Text style={styles.orderName} numberOfLines={1}>{CATEGORY_LABELS[item.category] || item.category}</Text>
                      <Text style={styles.orderDesc} numberOfLines={1}>{item.description}</Text>
                    </View>
                    <View style={styles.orderRight}>
                      <Text style={styles.orderPrice}>{item.estimated_price.toLocaleString()}₫</Text>
                      {item.distance_km != null && <Text style={styles.orderDist}>{item.distance_km < 1 ? `${Math.round(item.distance_km * 1000)}m` : `${item.distance_km.toFixed(1)}km`}</Text>}
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
          </>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  mapContainer: { flex: 1 },
  callout: { padding: 4, minWidth: 120 },
  calloutTitle: { fontWeight: 'bold', fontSize: 14, marginBottom: 2 },
  calloutPrice: { fontSize: 13, color: '#059669', fontWeight: '600' },
  calloutDist: { fontSize: 11, color: '#666', marginTop: 2 },
  bottomPanel: { backgroundColor: 'white', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: 280, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 10 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  listTitle: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  listHint: { fontSize: 11, color: '#999' },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#999', fontSize: 14 },
  orderRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  orderIcon: { fontSize: 24, marginRight: 12 },
  orderInfo: { flex: 1 },
  orderName: { fontSize: 14, fontWeight: '600', color: '#333' },
  orderDesc: { fontSize: 12, color: '#999', marginTop: 2 },
  orderRight: { alignItems: 'flex-end' },
  orderPrice: { fontSize: 14, fontWeight: 'bold', color: '#059669' },
  orderDist: { fontSize: 11, color: '#3b82f6', marginTop: 2 },
  detailCard: { padding: 16 },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  detailTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  detailPrice: { fontSize: 16, fontWeight: 'bold', color: '#059669' },
  detailDesc: { fontSize: 13, color: '#666', marginBottom: 6 },
  detailAddr: { fontSize: 12, color: '#3b82f6', marginBottom: 4 },
  detailDist: { fontSize: 12, color: '#666', marginBottom: 12 },
  detailActions: { flexDirection: 'row', gap: 10 },
  acceptBtn: { flex: 1, backgroundColor: '#059669', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  acceptBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  backBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#ddd', alignItems: 'center' },
  backBtnText: { color: '#666', fontSize: 14 },
})
