// Admin Orders — view/manage orders
import { useState, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView, RefreshControl, Modal, FlatList } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'

type OrderProfile = { email: string }
type OrderWorker = { user_id: string; profiles: { email: string; full_name: string | null } | null } | null
type Order = {
  id: string
  customer_id: string
  worker_id: string | null
  category: string
  description: string
  media_urls: string[] | null
  ai_diagnosis: string | null
  estimated_price: number | null
  final_price: number | null
  status: string
  payment_method: string | null
  created_at: string
  updated_at: string
  profiles: OrderProfile | null
  workers: OrderWorker
}

type WorkerOption = {
  user_id: string
  email: string
  full_name: string | null
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ xử lý',
  matched: 'Đã ghép',
  in_progress: 'Đang thực hiện',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
  disputed: 'Tranh chấp',
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  matched: '#3b82f6',
  in_progress: '#6366f1',
  completed: '#059669',
  cancelled: '#6b7280',
  disputed: '#dc2626',
}

const STATUSES = ['pending', 'matched', 'in_progress', 'completed', 'cancelled', 'disputed']

export default function AdminOrders() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<string>('')

  const [detailOrder, setDetailOrder] = useState<Order | null>(null)
  const [detailStatus, setDetailStatus] = useState('')
  const [detailWorkerId, setDetailWorkerId] = useState<string | null>(null)
  const [detailFinalPrice, setDetailFinalPrice] = useState('')
  const [saving, setSaving] = useState(false)

  const [workers, setWorkers] = useState<WorkerOption[]>([])
  const [showWorkerPicker, setShowWorkerPicker] = useState(false)

  useEffect(() => { fetchOrders() }, [filter, search])

  async function fetchOrders() {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      let query = supabase
        .from('orders')
        .select('*, profiles!inner(email), workers!left(user_id, profiles!inner(email, full_name))')
        .order('created_at', { ascending: false })

      if (filter) {
        query = query.eq('status', filter)
      }
      if (search.trim()) {
        const q = `%${search.trim()}%`
        query = query.or(`description.ilike.${q},category.ilike.${q},profiles.email.ilike.${q}`)
      }

      const { data, error } = await query.limit(100)
      if (error) throw error
      setOrders(data || [])
    } catch (err) {
      console.error('fetchOrders error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function onRefresh() {
    setRefreshing(true)
    await fetchOrders()
    setRefreshing(false)
  }

  async function fetchWorkersForPicker() {
    const { data, error } = await supabase
      .from('workers')
      .select('user_id, profiles!inner(email, full_name)')
      .eq('status', 'active')

    if (error) {
      console.error('fetchWorkers error:', error)
      return
    }
    setWorkers(
      (data || []).map((w: any) => ({
        user_id: w.user_id,
        email: w.profiles?.email || '',
        full_name: w.profiles?.full_name || null,
      }))
    )
    setShowWorkerPicker(true)
  }

  function openDetail(order: Order) {
    setDetailOrder(order)
    setDetailStatus(order.status)
    setDetailWorkerId(order.worker_id)
    setDetailFinalPrice(order.final_price != null ? String(order.final_price) : '')
  }

  function closeDetail() {
    setDetailOrder(null)
    setDetailStatus('')
    setDetailWorkerId(null)
    setDetailFinalPrice('')
    setShowWorkerPicker(false)
  }

  async function handleSave() {
    if (!detailOrder) return
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const finalPrice = detailFinalPrice.trim() ? parseFloat(detailFinalPrice) : null
      if (detailFinalPrice.trim() && isNaN(finalPrice!)) {
        Alert.alert('Lỗi', 'Giá không hợp lệ')
        setSaving(false)
        return
      }

      const payload: Record<string, any> = { status: detailStatus, final_price: finalPrice }
      if (detailWorkerId !== detailOrder.worker_id) {
        payload.worker_id = detailWorkerId
      }

      const { error } = await supabase
        .from('orders')
        .update(payload)
        .eq('id', detailOrder.id)

      if (error) throw error
      Alert.alert('Thành công', 'Đã cập nhật đơn hàng')
      closeDetail()
      fetchOrders()
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Cập nhật thất bại')
    } finally {
      setSaving(false)
    }
  }

  const fmt = (v: number | null | undefined) => {
    if (v == null) return '—'
    return Number(v).toLocaleString('vi-VN') + '₫'
  }

  function statusLabel(s: string) { return STATUS_LABELS[s] || s }
  function statusColor(s: string) { return STATUS_COLORS[s] || '#6b7280' }
  function statusBg(s: string) { return statusColor(s) + '18' }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.title}>Quản lý đơn hàng</Text>

        <TextInput
          style={styles.search}
          value={search}
          onChangeText={setSearch}
          placeholder="Tìm kiếm mô tả, danh mục, email..."
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[styles.filterBtn, filter === '' && styles.filterBtnActive]}
              onPress={() => setFilter('')}
            >
              <Text style={[styles.filterBtnText, filter === '' && styles.filterBtnTextActive]}>Tất cả</Text>
            </TouchableOpacity>
            {STATUSES.map(s => (
              <TouchableOpacity
                key={s}
                style={[styles.filterBtn, filter === s && styles.filterBtnActive]}
                onPress={() => setFilter(s)}
              >
                <View style={[styles.dot, { backgroundColor: statusColor(s) }]} />
                <Text style={[styles.filterBtnText, filter === s && styles.filterBtnTextActive]}>
                  {statusLabel(s)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {loading ? (
          <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 40 }} />
        ) : orders.length === 0 ? (
          <Text style={styles.empty}>Không có đơn hàng nào</Text>
        ) : (
          <View style={styles.list}>
            {orders.map(o => {
              const workerEmail = o.workers?.profiles?.email || null
              const workerName = o.workers?.profiles?.full_name || null
              return (
                <TouchableOpacity key={o.id} style={styles.card} onPress={() => openDetail(o)} activeOpacity={0.7}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.category}>{o.category}</Text>
                      <Text style={styles.desc} numberOfLines={2}>
                        {o.description}
                      </Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: statusBg(o.status) }]}>
                      <Text style={[styles.badgeText, { color: statusColor(o.status) }]}>
                        {statusLabel(o.status)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardRow}>
                    <View>
                      <Text style={styles.label}>Khách hàng</Text>
                      <Text style={styles.value}>{o.profiles?.email || o.customer_id?.slice(0, 8)}</Text>
                    </View>
                    <View>
                      <Text style={styles.label}>Thợ</Text>
                      <Text style={styles.value} numberOfLines={1}>
                        {workerName || workerEmail || 'Chưa có'}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.label}>Giá dự kiến</Text>
                      <Text style={styles.price}>{fmt(o.estimated_price)}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
        )}
      </ScrollView>

      {/* Detail Modal */}
      <Modal visible={!!detailOrder} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modal} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>Chi tiết đơn hàng</Text>

            {detailOrder && (
              <>
                <View style={styles.detailSection}>
                  <DetailRow label="ID" value={detailOrder.id} />
                  <DetailRow label="Danh mục" value={detailOrder.category} />
                  <DetailRow label="Mô tả" value={detailOrder.description} />
                  <DetailRow label="Khách hàng" value={detailOrder.profiles?.email || 'N/A'} />
                  <DetailRow
                    label="Thợ"
                    value={
                      detailOrder.workers?.profiles?.full_name
                        ? `${detailOrder.workers.profiles.full_name} (${detailOrder.workers.profiles.email})`
                        : detailOrder.workers?.profiles?.email || 'Chưa có'
                    }
                  />
                  {detailOrder.ai_diagnosis && <DetailRow label="Chuẩn đoán AI" value={detailOrder.ai_diagnosis} />}
                  <DetailRow label="Giá dự kiến" value={fmt(detailOrder.estimated_price)} />
                  <DetailRow label="Ngày tạo" value={new Date(detailOrder.created_at).toLocaleString('vi-VN')} />
                  <DetailRow label="Cập nhật" value={new Date(detailOrder.updated_at).toLocaleString('vi-VN')} />
                </View>

                <Text style={styles.sectionLabel}>Trạng thái</Text>
                <View style={styles.pickerRow}>
                  {STATUSES.map(s => (
                    <TouchableOpacity
                      key={s}
                      style={[styles.pill, detailStatus === s && { backgroundColor: statusColor(s), borderColor: statusColor(s) }]}
                      onPress={() => setDetailStatus(s)}
                    >
                      <Text style={[styles.pillText, detailStatus === s && { color: '#fff' }]}>
                        {statusLabel(s)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.sectionLabel}>Thợ thi công</Text>
                <TouchableOpacity style={styles.assignBtn} onPress={fetchWorkersForPicker}>
                  <Text style={styles.assignBtnText}>
                    {detailWorkerId
                      ? workers.find(w => w.user_id === detailWorkerId)?.full_name ||
                        workers.find(w => w.user_id === detailWorkerId)?.email ||
                        'Đã chọn'
                      : 'Chọn thợ...'}
                  </Text>
                </TouchableOpacity>

                <Text style={styles.sectionLabel}>Giá cuối</Text>
                <TextInput
                  style={styles.input}
                  value={detailFinalPrice}
                  onChangeText={setDetailFinalPrice}
                  placeholder="Nhập giá cuối..."
                  keyboardType="numeric"
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={closeDetail}>
                    <Text style={styles.cancelBtnText}>Hủy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveBtn, saving && { opacity: 0.5 }]}
                    onPress={handleSave}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.saveBtnText}>Lưu</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Worker Picker Modal */}
      <Modal visible={showWorkerPicker} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.workerModal}>
            <Text style={styles.modalTitle}>Chọn thợ</Text>
            {workers.length === 0 ? (
              <Text style={styles.empty}>Không có thợ nào</Text>
            ) : (
              <FlatList
                data={workers}
                keyExtractor={item => item.user_id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.workerItem, detailWorkerId === item.user_id && styles.workerItemActive]}
                    onPress={() => { setDetailWorkerId(item.user_id); setShowWorkerPicker(false) }}
                  >
                    <Text style={[styles.workerName, detailWorkerId === item.user_id && { color: '#fff' }]}>
                      {item.full_name || item.email}
                    </Text>
                    {item.full_name && (
                      <Text style={[styles.workerEmail, detailWorkerId === item.user_id && { color: 'rgba(255,255,255,0.8)' }]}>
                        {item.email}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              />
            )}
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowWorkerPicker(false)}>
              <Text style={styles.cancelBtnText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#1f2937', marginBottom: 16, marginTop: 50 },
  search: { backgroundColor: '#fff', borderRadius: 8, padding: 12, fontSize: 14, borderWidth: 1, borderColor: '#d1d5db', marginBottom: 12 },
  filterScroll: { marginBottom: 12 },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', gap: 6 },
  filterBtnActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  filterBtnText: { fontSize: 13, color: '#374151' },
  filterBtnTextActive: { color: '#fff' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 60, fontSize: 16 },
  list: { gap: 12 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  category: { fontSize: 15, fontWeight: '700', color: '#1f2937', marginBottom: 2 },
  desc: { fontSize: 13, color: '#6b7280', lineHeight: 18 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, alignSelf: 'flex-start', marginLeft: 8 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  label: { fontSize: 11, color: '#9ca3af' },
  value: { fontSize: 13, fontWeight: '500', color: '#374151', marginTop: 2, maxWidth: 110 },
  price: { fontSize: 14, fontWeight: '700', color: '#1f2937', marginTop: 2 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1f2937', marginBottom: 16 },
  detailSection: { marginBottom: 16 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  detailLabel: { fontSize: 13, color: '#9ca3af', flex: 1 },
  detailValue: { fontSize: 13, color: '#1f2937', flex: 2, textAlign: 'right' },
  sectionLabel: { fontSize: 15, fontWeight: '600', color: '#1f2937', marginTop: 16, marginBottom: 8 },
  pickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#fff' },
  pillText: { fontSize: 13, color: '#374151' },
  assignBtn: { backgroundColor: '#f3f4f6', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#d1d5db' },
  assignBtnText: { fontSize: 14, color: '#374151' },
  input: { backgroundColor: '#f9fafb', borderRadius: 8, padding: 12, fontSize: 15, borderWidth: 1, borderColor: '#d1d5db' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24, marginBottom: 30 },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db', alignItems: 'center' },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: '#6b7280' },
  saveBtn: { flex: 1, backgroundColor: '#3b82f6', padding: 12, borderRadius: 8, alignItems: 'center' },
  saveBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },

  // Worker picker
  workerModal: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' },
  workerItem: { padding: 14, borderRadius: 8, marginBottom: 4 },
  workerItemActive: { backgroundColor: '#3b82f6' },
  workerName: { fontSize: 15, fontWeight: '600', color: '#1f2937' },
  workerEmail: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
})
