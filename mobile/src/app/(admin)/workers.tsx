// Admin Workers — view, search, filter, edit workers
import { useState, useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Alert, ScrollView, RefreshControl, Modal } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'

type Worker = {
  user_id: string
  skills: string[]
  service_areas: string[]
  trust_score: number
  is_verified: boolean
  verification_status: 'pending' | 'verified' | 'rejected'
  avg_earnings: number
  total_orders: number
  avg_rating: number
  dispute_rate: number
  created_at: string
  profiles?: {
    email: string
    full_name: string | null
    phone: string | null
  }
}

export default function AdminWorkers() {
  const router = useRouter()
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<string>('')
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [editScore, setEditScore] = useState(0)
  const [editStatus, setEditStatus] = useState<'pending' | 'verified' | 'rejected'>('pending')
  const [saving, setSaving] = useState(false)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const pageSize = 50

  useEffect(() => { setPage(1) }, [filter, search])
  useEffect(() => { fetchWorkers() }, [filter, search, page])

  async function fetchWorkers() {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      let query = supabase
        .from('workers')
        .select('*, profiles!inner(id, email, full_name, phone)')
        .order('created_at', { ascending: false })

      if (filter) {
        query = query.eq('verification_status', filter)
      }

      if (search) {
        query = query.or(
          `profiles.email.ilike.%${search}%,profiles.full_name.ilike.%${search}%,profiles.phone.ilike.%${search}%`
        )
      }

      const { data, error } = await query.range((page - 1) * pageSize, page * pageSize - 1)
      if (error) throw error
      setWorkers((data as Worker[]) || [])

      let countQuery = supabase
        .from('workers')
        .select('*, profiles!inner(id, email, full_name, phone)', { count: 'exact', head: true })

      if (filter) {
        countQuery = countQuery.eq('verification_status', filter)
      }

      if (search) {
        countQuery = countQuery.or(
          `profiles.email.ilike.%${search}%,profiles.full_name.ilike.%${search}%,profiles.phone.ilike.%${search}%`
        )
      }

      const { count, error: countError } = await countQuery
      if (!countError) setTotalCount(count || 0)
    } catch (err) {
      console.error('fetchWorkers error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function onRefresh() {
    setRefreshing(true)
    await fetchWorkers()
    setRefreshing(false)
  }

  function openDetail(worker: Worker) {
    setSelectedWorker(worker)
    setEditScore(worker.trust_score)
    setEditStatus(worker.verification_status)
    setModalVisible(true)
  }

  async function handleSave() {
    if (!selectedWorker) return
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { error } = await supabase
        .from('workers')
        .update({
          trust_score: editScore,
          verification_status: editStatus,
          is_verified: editStatus === 'verified',
        })
        .eq('user_id', selectedWorker.user_id)

      if (error) throw error

      Alert.alert('Thành công', 'Đã cập nhật thông tin worker')
      setModalVisible(false)
      fetchWorkers()
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Cập nhật thất bại')
    } finally {
      setSaving(false)
    }
  }

  const statusLabels: Record<string, string> = {
    pending: 'Chờ duyệt',
    verified: 'Đã xác minh',
    rejected: 'Từ chối',
  }

  const statusColors: Record<string, string> = {
    pending: '#f59e0b',
    verified: '#059669',
    rejected: '#dc2626',
  }

  const statusBgColors: Record<string, string> = {
    pending: '#fef3c7',
    verified: '#d1fae5',
    rejected: '#fee2e2',
  }

  const filters = ['', 'pending', 'verified', 'rejected']

  return (
    <View style={styles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <Text style={styles.title}>Quản lý Workers</Text>

        <TextInput
          style={styles.search}
          value={search}
          onChangeText={setSearch}
          placeholder="Tìm kiếm theo email, tên hoặc SĐT..."
          placeholderTextColor="#9ca3af"
        />

        <View style={styles.filterRow}>
          {filters.map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterBtnText, filter === f && styles.filterBtnTextActive]}>
                {f ? statusLabels[f] || f : 'Tất cả'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 40 }} />
        ) : workers.length === 0 ? (
          <Text style={styles.empty}>Không tìm thấy worker nào</Text>
        ) : (
          <View style={styles.list}>
            {workers.map((w, i) => (
              <TouchableOpacity key={w.user_id + '-' + i} style={styles.card} onPress={() => openDetail(w)} activeOpacity={0.7}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.userName}>
                      {w.profiles?.full_name || w.profiles?.email || w.user_id?.slice(0, 8)}
                    </Text>
                    {w.profiles?.email && !w.profiles?.full_name && (
                      <Text style={styles.userEmail}>{w.profiles.email}</Text>
                    )}
                    {w.profiles?.full_name && (
                      <Text style={styles.userEmail}>{w.profiles.email}</Text>
                    )}
                  </View>
                  <View style={[styles.verifyBadge, { backgroundColor: statusBgColors[w.verification_status] || '#f3f4f6' }]}>
                    <Text style={[styles.verifyText, { color: statusColors[w.verification_status] || '#6b7280' }]}>
                      {statusLabels[w.verification_status] || w.verification_status}
                    </Text>
                  </View>
                </View>

                <View style={styles.skillsRow}>
                  {(w.skills || []).slice(0, 3).map((s, i) => (
                    <View key={i} style={styles.skillBadge}>
                      <Text style={styles.skillText}>{s}</Text>
                    </View>
                  ))}
                  {(w.skills || []).length > 3 && (
                    <Text style={styles.moreSkills}>+{w.skills.length - 3}</Text>
                  )}
                </View>

                <View style={styles.scoreRow}>
                  <Text style={styles.scoreLabel}>Trust Score: {w.trust_score}</Text>
                </View>
                <View style={styles.progressBg}>
                  <View style={[styles.progressFill, { width: `${w.trust_score}%` }]} />
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.stat}>
                    <Text style={styles.statLabel}>Đơn hàng</Text>
                    <Text style={styles.statValue}>{w.total_orders || 0}</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statLabel}>Đánh giá</Text>
                    <Text style={styles.statValue}>{w.avg_rating ? w.avg_rating.toFixed(1) : 'N/A'}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {!loading && workers.length > 0 && (
          <View style={styles.paginationRow}>
            <TouchableOpacity
              style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
              onPress={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <Text style={[styles.pageBtnText, page <= 1 && styles.pageBtnTextDisabled]}>Trước</Text>
            </TouchableOpacity>
            <Text style={styles.pageInfo}>Trang {page}</Text>
            <TouchableOpacity
              style={[styles.pageBtn, page * pageSize >= totalCount && styles.pageBtnDisabled]}
              onPress={() => setPage(p => p + 1)}
              disabled={page * pageSize >= totalCount}
            >
              <Text style={[styles.pageBtnText, page * pageSize >= totalCount && styles.pageBtnTextDisabled]}>Sau</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ScrollView>
              <Text style={styles.modalTitle}>Chi tiết Worker</Text>

              {selectedWorker && (
                <>
                  <View style={styles.modalField}>
                    <Text style={styles.modalLabel}>Họ tên</Text>
                    <Text style={styles.modalValue}>{selectedWorker.profiles?.full_name || 'N/A'}</Text>
                  </View>
                  <View style={styles.modalField}>
                    <Text style={styles.modalLabel}>Email</Text>
                    <Text style={styles.modalValue}>{selectedWorker.profiles?.email || 'N/A'}</Text>
                  </View>
                  <View style={styles.modalField}>
                    <Text style={styles.modalLabel}>SĐT</Text>
                    <Text style={styles.modalValue}>{selectedWorker.profiles?.phone || 'N/A'}</Text>
                  </View>

                  <View style={styles.modalField}>
                    <Text style={styles.modalLabel}>Kỹ năng</Text>
                    <View style={styles.skillsRow}>
                      {(selectedWorker.skills || []).map((s, i) => (
                        <View key={i} style={styles.skillBadge}>
                          <Text style={styles.skillText}>{s}</Text>
                        </View>
                      ))}
                      {(selectedWorker.skills || []).length === 0 && (
                        <Text style={styles.modalValue}>Chưa có</Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.modalField}>
                    <Text style={styles.modalLabel}>Khu vực phục vụ</Text>
                    <Text style={styles.modalValue}>
                      {(selectedWorker.service_areas || []).join(', ') || 'Chưa có'}
                    </Text>
                  </View>
                  <View style={styles.modalField}>
                    <Text style={styles.modalLabel}>Tổng đơn hàng</Text>
                    <Text style={styles.modalValue}>{selectedWorker.total_orders || 0}</Text>
                  </View>
                  <View style={styles.modalField}>
                    <Text style={styles.modalLabel}>Đánh giá TB</Text>
                    <Text style={styles.modalValue}>
                      {selectedWorker.avg_rating ? selectedWorker.avg_rating.toFixed(1) : 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.modalField}>
                    <Text style={styles.modalLabel}>Thu nhập TB</Text>
                    <Text style={styles.modalValue}>
                      {selectedWorker.avg_earnings
                        ? selectedWorker.avg_earnings.toLocaleString('vi-VN') + '₫'
                        : 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.modalField}>
                    <Text style={styles.modalLabel}>Tỷ lệ tranh chấp</Text>
                    <Text style={styles.modalValue}>
                      {selectedWorker.dispute_rate != null
                        ? (selectedWorker.dispute_rate * 100).toFixed(1) + '%'
                        : 'N/A'}
                    </Text>
                  </View>

                  <View style={styles.divider} />

                  <Text style={styles.editSectionTitle}>Chỉnh sửa</Text>

                  <View style={styles.modalField}>
                    <Text style={styles.modalLabel}>Trust Score: {editScore}</Text>
                    <View style={styles.sliderRow}>
                      <TouchableOpacity
                        style={styles.sliderBtn}
                        onPress={() => setEditScore(Math.max(0, editScore - 5))}
                      >
                        <Text style={styles.sliderBtnText}>-</Text>
                      </TouchableOpacity>
                      <View style={styles.sliderBar}>
                        <View style={[styles.sliderFill, { width: `${editScore}%` }]} />
                      </View>
                      <TouchableOpacity
                        style={styles.sliderBtn}
                        onPress={() => setEditScore(Math.min(100, editScore + 5))}
                      >
                        <Text style={styles.sliderBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.modalField}>
                    <Text style={styles.modalLabel}>Trạng thái xác minh</Text>
                    <View style={styles.pickerRow}>
                      {(['pending', 'verified', 'rejected'] as const).map(s => (
                        <TouchableOpacity
                          key={s}
                          style={[
                            styles.pickerBtn,
                            editStatus === s && {
                              backgroundColor: statusColors[s],
                              borderColor: statusColors[s],
                            },
                          ]}
                          onPress={() => setEditStatus(s)}
                        >
                          <Text
                            style={[
                              styles.pickerBtnText,
                              editStatus === s && { color: '#fff' },
                            ]}
                          >
                            {statusLabels[s]}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={() => setModalVisible(false)}
                    >
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
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#1f2937', marginBottom: 16, marginTop: 50 },
  search: { backgroundColor: '#fff', borderRadius: 8, padding: 12, fontSize: 14, borderWidth: 1, borderColor: '#d1d5db', marginBottom: 12 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db' },
  filterBtnActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  filterBtnText: { fontSize: 13, color: '#374151' },
  filterBtnTextActive: { color: '#fff' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 60, fontSize: 16 },
  list: { gap: 12 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  userName: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  userEmail: { fontSize: 13, color: '#6b7280', marginTop: 1 },
  verifyBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  verifyText: { fontSize: 12, fontWeight: '600' },
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  skillBadge: { backgroundColor: '#e5e7eb', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  skillText: { fontSize: 12, color: '#374151' },
  moreSkills: { fontSize: 12, color: '#6b7280', alignSelf: 'center' },
  scoreRow: { marginBottom: 4 },
  scoreLabel: { fontSize: 13, color: '#4b5563', fontWeight: '500' },
  progressBg: { height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', backgroundColor: '#3b82f6', borderRadius: 4 },
  statsRow: { flexDirection: 'row', gap: 16 },
  stat: { flex: 1 },
  statLabel: { fontSize: 12, color: '#9ca3af' },
  statValue: { fontSize: 15, fontWeight: '600', color: '#1f2937', marginTop: 2 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '85%' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1f2937', marginBottom: 16 },
  modalField: { marginBottom: 14 },
  modalLabel: { fontSize: 13, color: '#6b7280', marginBottom: 4 },
  modalValue: { fontSize: 15, color: '#1f2937' },
  divider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 16 },
  editSectionTitle: { fontSize: 17, fontWeight: '600', color: '#1f2937', marginBottom: 12 },

  // Slider
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sliderBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' },
  sliderBtnText: { fontSize: 20, fontWeight: '600', color: '#374151' },
  sliderBar: { flex: 1, height: 10, backgroundColor: '#e5e7eb', borderRadius: 5, overflow: 'hidden' },
  sliderFill: { height: '100%', backgroundColor: '#3b82f6', borderRadius: 5 },

  // Picker
  pickerRow: { flexDirection: 'row', gap: 8 },
  pickerBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db' },
  pickerBtnText: { fontSize: 13, color: '#374151', fontWeight: '500' },

  // Actions
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20, marginBottom: 30 },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db', alignItems: 'center' },
  cancelBtnText: { fontSize: 15, color: '#374151', fontWeight: '600' },
  saveBtn: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#3b82f6', alignItems: 'center' },
  saveBtnText: { fontSize: 15, color: '#fff', fontWeight: '600' },

  // Pagination
  paginationRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 20, marginBottom: 30 },
  pageBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, backgroundColor: '#3b82f6' },
  pageBtnDisabled: { backgroundColor: '#d1d5db' },
  pageBtnText: { fontSize: 15, color: '#fff', fontWeight: '600' },
  pageBtnTextDisabled: { color: '#9ca3af' },
  pageInfo: { fontSize: 15, color: '#374151', fontWeight: '500' },
})
