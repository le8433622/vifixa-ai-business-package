// Admin Disputes/Review Queue — view and resolve disputes, orders, fraud, quality, pricing reviews
import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView, RefreshControl, Modal } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'

type ReviewItem = {
  id: string
  entity_type: string
  entity_id: string
  ai_decision: any
  review_status: string
  resolution_action: string | null
  resolved_by: string | null
  resolved_at: string | null
  created_by: string
  created_at: string
  updated_at: string
  profiles: { id: string; email: string; full_name: string | null } | null
}

const entityTypeLabels: Record<string, string> = {
  dispute: 'Tranh chấp',
  order: 'Đơn hàng',
  fraud: 'Gian lận',
  quality: 'Chất lượng',
  pricing: 'Định giá',
}

const statusLabels: Record<string, string> = {
  pending: 'Chờ xử lý',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
  escalated: 'Đã nâng cấp',
}

const statusColors: Record<string, string> = {
  pending: '#f59e0b',
  approved: '#059669',
  rejected: '#dc2626',
  escalated: '#8b5cf6',
}

const statusFilters = ['pending', 'approved', 'rejected', 'escalated', '']
const entityFilters = ['', 'dispute', 'order', 'fraud', 'quality', 'pricing']

export default function AdminDisputes() {
  const router = useRouter()
  const [items, setItems] = useState<ReviewItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [entityFilter, setEntityFilter] = useState('')
  const [selectedItem, setSelectedItem] = useState<ReviewItem | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const pageSize = 50

  useEffect(() => { fetchItems() }, [statusFilter, entityFilter, page])

  useEffect(() => { setPage(1) }, [statusFilter, entityFilter])

  async function fetchItems() {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      let query = supabase
        .from('admin_review_queue')
        .select('*, profiles:created_by(id, email, full_name)')
        .order('created_at', { ascending: false })

      let countQuery = supabase
        .from('admin_review_queue')
        .select('*', { count: 'exact', head: true })

      if (statusFilter) {
        query = query.eq('review_status', statusFilter)
        countQuery = countQuery.eq('review_status', statusFilter)
      }
      if (entityFilter) {
        query = query.eq('entity_type', entityFilter)
        countQuery = countQuery.eq('entity_type', entityFilter)
      }

      const { count, error: countError } = await countQuery
      if (countError) throw countError
      setTotalCount(count || 0)

      const from = (page - 1) * pageSize
      const to = page * pageSize - 1
      const { data, error } = await query.range(from, to)
      if (error) throw error
      setItems(data || [])
    } catch (err) {
      console.error('fetchItems error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleAction(item: ReviewItem, newStatus: string, orderAction?: string) {
    setActionLoading(item.id)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const userId = session.user.id
      const now = new Date().toISOString()

      const updateData: Record<string, any> = {
        review_status: newStatus,
        resolved_by: userId,
        resolved_at: now,
      }
      if (orderAction) {
        updateData.resolution_action = orderAction
      }

      const { error } = await supabase
        .from('admin_review_queue')
        .update(updateData)
        .eq('id', item.id)

      if (error) throw error

      if (orderAction && (item.entity_type === 'dispute' || item.entity_type === 'order')) {
        let orderStatus: string
        if (orderAction === 'complete') orderStatus = 'completed'
        else if (orderAction === 'refund') orderStatus = 'refunded'
        else orderStatus = orderAction

        await supabase
          .from('orders')
          .update({ status: orderStatus, updated_at: now })
          .eq('id', item.entity_id)
      }

      Alert.alert('Thành công', 'Đã cập nhật trạng thái')
      setSelectedItem(null)
      fetchItems()
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Cập nhật thất bại')
    } finally {
      setActionLoading(null)
    }
  }

  async function onRefresh() {
    setRefreshing(true)
    await fetchItems()
    setRefreshing(false)
  }

  function severityLabel(aiDecision: any): string | null {
    if (!aiDecision) return null
    const s = aiDecision.confidence_score
    if (s == null) return aiDecision.severity || null
    return `Độ tin cậy: ${s}%`
  }

  function severityColor(aiDecision: any): string {
    if (!aiDecision) return '#9ca3af'
    const s = aiDecision.severity?.toLowerCase()
    if (s === 'high' || s === 'critical') return '#dc2626'
    if (s === 'medium') return '#f59e0b'
    if (s === 'low') return '#059669'
    const cs = Number(aiDecision.confidence_score)
    if (cs >= 80) return '#059669'
    if (cs >= 50) return '#f59e0b'
    return '#dc2626'
  }

  return (
    <View style={styles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <Text style={styles.title}>Danh sách xét duyệt</Text>

        <View style={styles.filterRow}>
          {statusFilters.map(f => (
            <TouchableOpacity
              key={`s-${f}`}
              style={[styles.filterBtn, statusFilter === f && styles.filterBtnActive]}
              onPress={() => setStatusFilter(f)}
            >
              <Text style={[styles.filterBtnText, statusFilter === f && styles.filterBtnTextActive]}>
                {f ? statusLabels[f] : 'Tất cả'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.filterRow}>
          {entityFilters.map(f => (
            <TouchableOpacity
              key={`e-${f}`}
              style={[styles.filterBtn, entityFilter === f && styles.filterBtnActive]}
              onPress={() => setEntityFilter(f)}
            >
              <Text style={[styles.filterBtnText, entityFilter === f && styles.filterBtnTextActive]}>
                {f ? entityTypeLabels[f] : 'Tất cả loại'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 40 }} />
        ) : items.length === 0 ? (
          <Text style={styles.empty}>Không có mục nào</Text>
        ) : (
          <>
            <View style={styles.list}>
              {items.map(item => {
                const sl = severityLabel(item.ai_decision)
                return (
                  <TouchableOpacity key={item.id} style={styles.card} onPress={() => setSelectedItem(item)}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.entityType}>
                        {entityTypeLabels[item.entity_type] || item.entity_type}
                      </Text>
                      <Text style={[styles.statusBadge, { color: statusColors[item.review_status] || '#6b7280' }]}>
                        {statusLabels[item.review_status] || item.review_status}
                      </Text>
                    </View>

                    <Text style={styles.creatorEmail}>
                      {item.profiles?.email || item.created_by?.slice(0, 8)}
                    </Text>
                    {item.profiles?.full_name && (
                      <Text style={styles.creatorName}>{item.profiles.full_name}</Text>
                    )}

                    <View style={styles.cardFooter}>
                      <Text style={styles.dateText}>
                        {new Date(item.created_at).toLocaleDateString('vi-VN')}
                      </Text>
                      {sl && (
                        <Text style={[styles.severity, { color: severityColor(item.ai_decision) }]}>
                          {sl}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                )
              })}
            </View>
            <View style={styles.pagination}>
              <TouchableOpacity
                style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]}
                onPress={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <Text style={[styles.pageBtnText, page === 1 && styles.pageBtnTextDisabled]}>Trước</Text>
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
          </>
        )}
      </ScrollView>

      <Modal visible={!!selectedItem} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              {selectedItem && (
                <>
                  <Text style={styles.modalTitle}>Chi tiết xét duyệt</Text>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Loại</Text>
                    <Text style={styles.detailValue}>
                      {entityTypeLabels[selectedItem.entity_type] || selectedItem.entity_type}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Trạng thái</Text>
                    <Text style={[styles.detailValue, { color: statusColors[selectedItem.review_status] }]}>
                      {statusLabels[selectedItem.review_status] || selectedItem.review_status}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>ID đối tượng</Text>
                    <Text style={styles.detailValue} numberOfLines={1}>{selectedItem.entity_id}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Người tạo</Text>
                    <Text style={styles.detailValue}>{selectedItem.profiles?.email || selectedItem.created_by?.slice(0, 8)}</Text>
                  </View>
                  {selectedItem.profiles?.full_name && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Tên</Text>
                      <Text style={styles.detailValue}>{selectedItem.profiles.full_name}</Text>
                    </View>
                  )}
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Ngày tạo</Text>
                    <Text style={styles.detailValue}>{new Date(selectedItem.created_at).toLocaleString('vi-VN')}</Text>
                  </View>
                  {selectedItem.resolved_at && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Ngày xử lý</Text>
                      <Text style={styles.detailValue}>{new Date(selectedItem.resolved_at).toLocaleString('vi-VN')}</Text>
                    </View>
                  )}
                  {selectedItem.resolution_action && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Hành động</Text>
                      <Text style={styles.detailValue}>{selectedItem.resolution_action}</Text>
                    </View>
                  )}

                  {selectedItem.ai_decision && (
                    <View style={styles.aiSection}>
                      <Text style={styles.sectionTitle}>Quyết định AI</Text>
                      <Text style={styles.aiText}>
                        {typeof selectedItem.ai_decision === 'object'
                          ? JSON.stringify(selectedItem.ai_decision, null, 2)
                          : String(selectedItem.ai_decision)}
                      </Text>
                    </View>
                  )}

                  {selectedItem.review_status === 'pending' && (
                    <View style={styles.actionGroup}>
                      {selectedItem.entity_type === 'dispute' ? (
                        <>
                          <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#059669' }]}
                            onPress={() => handleAction(selectedItem, 'approved', 'complete')}
                            disabled={actionLoading === selectedItem.id}
                          >
                            {actionLoading === selectedItem.id ? (
                              <ActivityIndicator color="#fff" size="small" />
                            ) : (
                              <Text style={styles.actionBtnText}>Duyệt đơn hàng</Text>
                            )}
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#dc2626' }]}
                            onPress={() => handleAction(selectedItem, 'rejected', 'refund')}
                            disabled={actionLoading === selectedItem.id}
                          >
                            {actionLoading === selectedItem.id ? (
                              <ActivityIndicator color="#fff" size="small" />
                            ) : (
                              <Text style={styles.actionBtnText}>Hoàn tiền</Text>
                            )}
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#8b5cf6' }]}
                            onPress={() => handleAction(selectedItem, 'escalated')}
                            disabled={actionLoading === selectedItem.id}
                          >
                            {actionLoading === selectedItem.id ? (
                              <ActivityIndicator color="#fff" size="small" />
                            ) : (
                              <Text style={styles.actionBtnText}>Nâng cấp</Text>
                            )}
                          </TouchableOpacity>
                        </>
                      ) : (
                        <>
                          <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#059669' }]}
                            onPress={() => handleAction(selectedItem, 'approved')}
                            disabled={actionLoading === selectedItem.id}
                          >
                            {actionLoading === selectedItem.id ? (
                              <ActivityIndicator color="#fff" size="small" />
                            ) : (
                              <Text style={styles.actionBtnText}>Phê duyệt</Text>
                            )}
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#dc2626' }]}
                            onPress={() => handleAction(selectedItem, 'rejected')}
                            disabled={actionLoading === selectedItem.id}
                          >
                            {actionLoading === selectedItem.id ? (
                              <ActivityIndicator color="#fff" size="small" />
                            ) : (
                              <Text style={styles.actionBtnText}>Từ chối</Text>
                            )}
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  )}
                </>
              )}
            </ScrollView>

            <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedItem(null)}>
              <Text style={styles.closeBtnText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#1f2937', marginBottom: 16, marginTop: 50 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db' },
  filterBtnActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  filterBtnText: { fontSize: 13, color: '#374151' },
  filterBtnTextActive: { color: '#fff' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 60, fontSize: 16 },
  list: { gap: 12 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  entityType: { fontSize: 15, fontWeight: '700', color: '#1f2937' },
  statusBadge: { fontSize: 12, fontWeight: '600' },
  creatorEmail: { fontSize: 14, color: '#374151' },
  creatorName: { fontSize: 12, color: '#6b7280', marginTop: 1 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  dateText: { fontSize: 12, color: '#9ca3af' },
  severity: { fontSize: 11, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, backgroundColor: '#f3f4f6', overflow: 'hidden' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '85%' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1f2937', marginBottom: 16 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  detailLabel: { fontSize: 14, color: '#9ca3af', flex: 1 },
  detailValue: { fontSize: 14, color: '#1f2937', fontWeight: '500', flex: 2, textAlign: 'right' },
  aiSection: { marginTop: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1f2937', marginBottom: 8 },
  aiText: { fontSize: 13, color: '#374151', fontFamily: 'monospace', backgroundColor: '#f9fafb', padding: 12, borderRadius: 8, lineHeight: 20 },
  actionGroup: { marginTop: 20, gap: 10 },
  actionBtn: { padding: 14, borderRadius: 10, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  closeBtn: { marginTop: 16, padding: 12, borderRadius: 10, backgroundColor: '#f3f4f6', alignItems: 'center' },
  closeBtnText: { fontSize: 16, fontWeight: '600', color: '#374151' },
  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 16, marginBottom: 24 },
  pageBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, backgroundColor: '#3b82f6' },
  pageBtnDisabled: { backgroundColor: '#d1d5db' },
  pageBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  pageBtnTextDisabled: { color: '#9ca3af' },
  pageInfo: { fontSize: 15, fontWeight: '600', color: '#374151' },
})
