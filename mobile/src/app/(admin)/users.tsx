// Admin Users — view and manage user roles
import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Alert, ScrollView, RefreshControl, Modal } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'

type Profile = {
  id: string
  email: string
  phone: string | null
  full_name: string | null
  role: string
  avatar_url: string | null
  bio: string | null
  created_at: string
  updated_at: string
}

export default function AdminUsers() {
  const router = useRouter()
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('')
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [newRole, setNewRole] = useState('')
  const [saving, setSaving] = useState(false)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const pageSize = 50

  useEffect(() => { fetchUsers() }, [roleFilter, page])

  async function fetchUsers() {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const from = (page - 1) * pageSize
      const to = page * pageSize - 1

      let query = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (roleFilter) {
        query = query.eq('role', roleFilter)
      }

      if (search) {
        query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%,phone.ilike.%${search}%`)
      }

      const { data, error } = await query.range(from, to)
      if (error) throw error
      setUsers(data || [])

      let countQuery = supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

      if (roleFilter) {
        countQuery = countQuery.eq('role', roleFilter)
      }

      if (search) {
        countQuery = countQuery.or(`email.ilike.%${search}%,full_name.ilike.%${search}%,phone.ilike.%${search}%`)
      }

      const { count, error: countError } = await countQuery
      if (countError) throw countError
      setTotalCount(count || 0)
    } catch (err) {
      console.error('fetchUsers error:', err)
    } finally {
      setLoading(false)
    }
  }

  function handleSearch(text: string) {
    setSearch(text)
    setPage(1)
  }

  async function onRefresh() {
    setRefreshing(true)
    await fetchUsers()
    setRefreshing(false)
  }

  function openRoleModal(user: Profile) {
    setSelectedUser(user)
    setNewRole(user.role)
    setModalVisible(true)
  }

  async function handleSaveRole() {
    if (!selectedUser || newRole === selectedUser.role) {
      setModalVisible(false)
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', selectedUser.id)

      if (error) throw error

      Alert.alert('Thành công', 'Đã cập nhật vai trò')
      setModalVisible(false)
      fetchUsers()
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Cập nhật thất bại')
    } finally {
      setSaving(false)
    }
  }

  const roleLabels: Record<string, string> = { customer: 'Khách hàng', worker: 'Nhân viên', admin: 'Quản trị' }
  const roleColors: Record<string, string> = { customer: '#059669', worker: '#2563eb', admin: '#dc2626' }
  const roleBgColors: Record<string, string> = { customer: '#d1fae5', worker: '#dbeafe', admin: '#fecaca' }
  const filters = ['', 'customer', 'worker', 'admin']
  const totalPages = Math.ceil(totalCount / pageSize) || 1

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <Text style={styles.title}>Quản lý người dùng</Text>

      <TextInput
        style={styles.search}
        value={search}
        onChangeText={handleSearch}
        placeholder="Tìm kiếm email, tên hoặc SĐT..."
        onSubmitEditing={fetchUsers}
      />

      <View style={styles.filterRow}>
        {filters.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, roleFilter === f && styles.filterBtnActive]}
            onPress={() => { setRoleFilter(f); setPage(1) }}
          >
            <Text style={[styles.filterBtnText, roleFilter === f && styles.filterBtnTextActive]}>
              {f ? roleLabels[f] || f : 'Tất cả'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
      ) : users.length === 0 ? (
        <Text style={styles.empty}>Không tìm thấy người dùng nào</Text>
      ) : (
        <>
        <View style={styles.list}>
          {users.map(u => (
            <TouchableOpacity key={u.id} style={styles.card} onPress={() => openRoleModal(u)}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{u.full_name || 'Chưa có tên'}</Text>
                  <Text style={styles.userEmail}>{u.email}</Text>
                  {u.phone && <Text style={styles.userPhone}>{u.phone}</Text>}
                </View>
                <View style={[styles.roleBadge, { backgroundColor: roleBgColors[u.role] || '#f3f4f6' }]}>
                  <Text style={[styles.roleText, { color: roleColors[u.role] || '#6b7280' }]}>
                    {roleLabels[u.role] || u.role}
                  </Text>
                </View>
              </View>
              <Text style={styles.date}>
                Tạo: {new Date(u.created_at).toLocaleDateString('vi-VN')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.pagination}>
          <TouchableOpacity
            style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
            onPress={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            <Text style={[styles.pageBtnText, page <= 1 && styles.pageBtnTextDisabled]}>Trước</Text>
          </TouchableOpacity>
          <Text style={styles.pageInfo}>Trang {page}</Text>
          <TouchableOpacity
            style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]}
            onPress={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            <Text style={[styles.pageBtnText, page >= totalPages && styles.pageBtnTextDisabled]}>Sau</Text>
          </TouchableOpacity>
        </View>
        </>
      )}

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Chỉnh sửa vai trò</Text>
            {selectedUser && (
              <>
                <Text style={styles.modalUser}>{selectedUser.full_name || selectedUser.email}</Text>
                <Text style={styles.modalEmail}>{selectedUser.email}</Text>

                <View style={styles.roleOptions}>
                  {['customer', 'worker', 'admin'].map(r => (
                    <TouchableOpacity
                      key={r}
                      style={[styles.roleOption, newRole === r && { backgroundColor: roleBgColors[r], borderColor: roleColors[r] }]}
                      onPress={() => setNewRole(r)}
                    >
                      <Text style={[styles.roleOptionText, newRole === r && { color: roleColors[r], fontWeight: '700' }]}>
                        {roleLabels[r]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                    <Text style={styles.cancelBtnText}>Hủy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveBtn, saving && styles.disabled]}
                    onPress={handleSaveRole}
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
          </View>
        </View>
      </Modal>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#1f2937', marginBottom: 16, marginTop: 50 },
  search: { backgroundColor: '#fff', borderRadius: 8, padding: 12, fontSize: 14, borderWidth: 1, borderColor: '#d1d5db', marginBottom: 16 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db' },
  filterBtnActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  filterBtnText: { fontSize: 13, color: '#374151' },
  filterBtnTextActive: { color: '#fff' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 60, fontSize: 16 },
  list: { gap: 12 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  userName: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  userEmail: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  userPhone: { fontSize: 13, color: '#9ca3af', marginTop: 1 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginLeft: 8 },
  roleText: { fontSize: 12, fontWeight: '600' },
  date: { fontSize: 12, color: '#9ca3af' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1f2937', marginBottom: 8 },
  modalUser: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  modalEmail: { fontSize: 13, color: '#6b7280', marginTop: 2, marginBottom: 20 },
  roleOptions: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  roleOption: { flex: 1, padding: 14, borderRadius: 10, borderWidth: 2, borderColor: '#d1d5db', alignItems: 'center' },
  roleOptionText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#d1d5db', alignItems: 'center' },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: '#6b7280' },
  saveBtn: { flex: 1, backgroundColor: '#2563eb', padding: 14, borderRadius: 10, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  disabled: { opacity: 0.5 },
  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 20, marginBottom: 20 },
  pageBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, backgroundColor: '#2563eb' },
  pageBtnDisabled: { opacity: 0.4 },
  pageBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  pageBtnTextDisabled: { color: '#fff' },
  pageInfo: { fontSize: 14, fontWeight: '600', color: '#374151' },
})
