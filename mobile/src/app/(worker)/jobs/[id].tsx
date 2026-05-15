// Worker Job Detail - Mobile
// Per user request: Complete worker pages (mobile)

import { useState, useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView, TextInput, Image, Modal } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { supabase } from '@/lib/supabase'
import * as ImagePicker from 'expo-image-picker'
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!

const CHECKLISTS: Record<string, string[]> = {
  air_conditioning: ['Kiểm tra gas', 'Vệ sinh lưới lọc', 'Kiểm tra block', 'Đo dòng điện'],
  electricity: ['Ngắt nguồn điện', 'Kiểm tra CB', 'Đo điện áp', 'Kiểm tra dây'],
  plumbing: ['Khóa van nước', 'Kiểm tra ống', 'Xác định rò rỉ', 'Vệ sinh khu vực'],
  default: ['Kiểm tra an toàn', 'Vệ sinh khu vực', 'Kiểm tra sau sửa', 'Dọn dẹp'],
}

type Job = {
  id: string
  category: string
  description: string
  status: 'pending' | 'matched' | 'in_progress' | 'completed' | 'cancelled' | 'disputed'
  created_at: string
  updated_at: string
  completed_at?: string
  estimated_price: number
  actual_price?: number
  address?: string
  customer_name?: string
  customer_phone?: string
  rating?: number
  feedback?: string
}

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams()
  const router = useRouter()
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (id) {
      fetchJob()
    }
  }, [id])

  async function fetchJob() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          profiles:customer_id (full_name, phone)
        `)
        .eq('id', id)
        .eq('worker_id', session.user.id)
        .single()

      if (error) throw error

      setJob({
        ...data,
        customer_name: data.profiles?.full_name,
        customer_phone: data.profiles?.phone,
      })
    } catch (error: any) {
      console.error('fetchJob error:', error)
      Alert.alert('Lỗi', error.message || 'Không tìm thấy công việc')
      router.back()
    } finally {
      setLoading(false)
    }
  }

  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [checklist, setChecklist] = useState<string[]>([])
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set())
  const [beforePhotos, setBeforePhotos] = useState<string[]>([])
  const [afterPhotos, setAfterPhotos] = useState<string[]>([])
  const [finalPrice, setFinalPrice] = useState(0)
  const [partsUsed, setPartsUsed] = useState('')

  useEffect(() => {
    if (job?.category) {
      setChecklist(CHECKLISTS[job.category as string] || CHECKLISTS.default)
      setFinalPrice(job.estimated_price || 0)
    }
  }, [job?.category, job?.estimated_price])

  async function handleStart() {
    setUpdating(true)
    await supabase.from('orders').update({ status: 'in_progress', updated_at: new Date().toISOString() }).eq('id', id)
    fetchJob()
    setUpdating(false)
  }

  async function handleComplete() {
    setUpdating(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    // Upload photos
    const upload = async (photos: string[]): Promise<string[]> => {
      const urls: string[] = []
      for (const photo of photos) {
        const res = await fetch(photo)
        const blob = await res.blob()
        const fileName = `job-${id}-${Date.now()}.jpg`
        const { data } = await supabase.storage.from('order-evidence').upload(fileName, blob)
        if (data) {
          const { data: { publicUrl } } = supabase.storage.from('order-evidence').getPublicUrl(data.path)
          urls.push(publicUrl)
        }
      }
      return urls
    }
    const beforeUrls = beforePhotos.length > 0 ? await upload(beforePhotos) : []
    const afterUrls = afterPhotos.length > 0 ? await upload(afterPhotos) : []

    await supabase.from('orders').update({
      status: 'completed',
      final_price: finalPrice,
      before_media: beforeUrls,
      after_media: afterUrls,
      parts_used: partsUsed,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', id)

    // Escrow release
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/wallet-manager`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'escrow:release', orderId: id }),
      })
    } catch {}

    setShowCompleteModal(false)
    Alert.alert('✅', `Hoàn thành! Đã nhận ${finalPrice.toLocaleString()}₫`)
    fetchJob()
    setUpdating(false)
  }

  const pickImage = async (type: 'before' | 'after') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, quality: 0.8,
    })
    if (!result.canceled) {
      if (type === 'before') setBeforePhotos(prev => [...prev, result.assets[0].uri])
      else setAfterPhotos(prev => [...prev, result.assets[0].uri])
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'completed': return '#d1fae5'
      case 'in_progress': return '#dbeafe'
      case 'matched': return '#e9d5ff'
      case 'pending': return '#fef3c7'
      case 'cancelled': return '#f3f4f6'
      case 'disputed': return '#fee2e2'
      default: return '#f3f4f6'
    }
  }

  function getStatusTextColor(status: string) {
    switch (status) {
      case 'completed': return '#065f46'
      case 'in_progress': return '#1e40af'
      case 'matched': return '#6b21a8'
      case 'pending': return '#92400e'
      case 'cancelled': return '#374151'
      case 'disputed': return '#991b1b'
      default: return '#374151'
    }
  }

  function getStatusLabel(status: string) {
    const labels: Record<string, string> = {
      'completed': 'Hoàn thành',
      'in_progress': 'Đang làm',
      'matched': 'Đã nhận',
      'pending': 'Chờ xử lý',
      'cancelled': 'Đã hủy',
      'disputed': 'Tranh chấp',
    }
    return labels[status] || status
  }

  function getCategoryIcon(category: string) {
    const icons: Record<string, string> = {
      'air_conditioning': '❄️',
      'plumbing': '🚿',
      'electricity': '🔌',
      'camera': '📷',
      'general': '🔧',
    }
    return icons[category] || '🔧'
  }

  function formatPrice(price: number | undefined) {
    if (!price && price !== 0) return 'Chưa có giá'
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price)
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    )
  }

  if (!job) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Không tìm thấy công việc</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>← Quay lại</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết công việc</Text>
      </View>

      {/* Status Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.categoryRow}>
            <Text style={styles.categoryIcon}>{getCategoryIcon(job.category)}</Text>
            <Text style={styles.category}>{job.category}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(job.status) }]}>
            <Text style={[styles.statusText, { color: getStatusTextColor(job.status) }]}>
              {getStatusLabel(job.status)}
            </Text>
          </View>
        </View>

        <Text style={styles.price}>{formatPrice(job.estimated_price)}</Text>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mô tả vấn đề</Text>
          <Text style={styles.description}>{job.description}</Text>
        </View>

        {/* Customer Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin khách hàng</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tên:</Text>
            <Text style={styles.infoValue}>{job.customer_name || 'Ẩn danh'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>SĐT:</Text>
            <Text style={styles.infoValue}>{job.customer_phone || 'Không có'}</Text>
          </View>
          {job.address && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Địa chỉ:</Text>
              <Text style={styles.infoValue}>{job.address}</Text>
            </View>
          )}
        </View>

        {/* Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thời gian</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tạo đơn:</Text>
            <Text style={styles.infoValue}>
              {new Date(job.created_at).toLocaleString('vi-VN')}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Cập nhật:</Text>
            <Text style={styles.infoValue}>
              {new Date(job.updated_at).toLocaleString('vi-VN')}
            </Text>
          </View>
          {job.completed_at && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Hoàn thành:</Text>
              <Text style={styles.infoValue}>
                {new Date(job.completed_at).toLocaleString('vi-VN')}
              </Text>
            </View>
          )}
        </View>

        {/* Rating */}
        {job.rating && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Đánh giá từ khách hàng</Text>
            <View style={styles.ratingContainer}>
              <Text style={styles.stars}>
                {'★'.repeat(job.rating)}{'☆'.repeat(5 - job.rating)}
              </Text>
              <Text style={styles.ratingText}>{job.rating}/5</Text>
            </View>
            {job.feedback && (
              <Text style={styles.feedback}>"{job.feedback}"</Text>
            )}
          </View>
        )}

        {/* Actions */}
        {job.status !== 'completed' && job.status !== 'cancelled' && (
          <View style={styles.actions}>
            <Text style={styles.sectionTitle}>Cập nhật trạng thái</Text>
            <View style={styles.buttonGroup}>
              {job.status === 'matched' && (
                <TouchableOpacity
                  style={[styles.button, styles.primaryButton]}
                  onPress={() => updateStatus('in_progress')}
                  disabled={updating}
                >
                  <Text style={styles.buttonText}>Bắt đầu làm việc</Text>
                </TouchableOpacity>
              )}
              {job.status === 'in_progress' && (
                <TouchableOpacity
                  style={[styles.button, styles.successButton]}
                  onPress={() => setShowCompleteModal(true)}
                  disabled={updating}
                >
                  <Text style={styles.buttonText}>Hoàn thành việc</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={() => updateStatus('cancelled')}
                disabled={updating}
              >
                <Text style={[styles.buttonText, styles.secondaryButtonText]}>Hủy việc</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Complete Modal */}
      <Modal visible={showCompleteModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' }}>
            <ScrollView>
              <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>✔️ Xác nhận hoàn thành</Text>

              {/* Checklist */}
              <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 8 }}>📋 Checklist</Text>
              {checklist.map(item => (
                <TouchableOpacity key={item} onPress={() => {
                  const next = new Set(checkedItems)
                  next.has(item) ? next.delete(item) : next.add(item)
                  setCheckedItems(next)
                }} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}>
                  <View style={{ width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: checkedItems.has(item) ? '#059669' : '#d1d5db', backgroundColor: checkedItems.has(item) ? '#059669' : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                    {checkedItems.has(item) && <Text style={{ color: 'white', fontSize: 12 }}>✓</Text>}
                  </View>
                  <Text style={{ marginLeft: 10, fontSize: 14, color: checkedItems.has(item) ? '#9ca3af' : '#374151', textDecorationLine: checkedItems.has(item) ? 'line-through' : 'none' }}>{item}</Text>
                </TouchableOpacity>
              ))}

              {/* Photo upload */}
              <Text style={{ fontSize: 14, fontWeight: '600', marginTop: 16, marginBottom: 8 }}>📷 Ảnh</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity onPress={() => pickImage('before')} style={{ flex: 1, padding: 12, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, borderStyle: 'dashed', alignItems: 'center' }}>
                  <Text style={{ fontSize: 20 }}>📸</Text>
                  <Text style={{ fontSize: 10, color: '#6b7280', marginTop: 4 }}>Trước</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => pickImage('after')} style={{ flex: 1, padding: 12, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, borderStyle: 'dashed', alignItems: 'center' }}>
                  <Text style={{ fontSize: 20 }}>📸</Text>
                  <Text style={{ fontSize: 10, color: '#6b7280', marginTop: 4 }}>Sau</Text>
                </TouchableOpacity>
              </View>
              {beforePhotos.length > 0 && <Text style={{ fontSize: 10, color: '#6b7280', marginTop: 4 }}>📷 {beforePhotos.length} ảnh trước</Text>}
              {afterPhotos.length > 0 && <Text style={{ fontSize: 10, color: '#6b7280' }}>📷 {afterPhotos.length} ảnh sau</Text>}

              {/* Final Price */}
              <Text style={{ fontSize: 14, fontWeight: '600', marginTop: 16, marginBottom: 8 }}>💰 Giá cuối</Text>
              <TextInput value={String(finalPrice)} onChangeText={v => setFinalPrice(Number(v) || 0)}
                style={{ borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10, fontSize: 16, fontWeight: 'bold' }} keyboardType="numeric" />

              {/* Parts */}
              <Text style={{ fontSize: 14, fontWeight: '600', marginTop: 12, marginBottom: 8 }}>🔧 Vật tư</Text>
              <TextInput value={partsUsed} onChangeText={setPartsUsed}
                placeholder="Ghi chú vật tư đã thay..."
                style={{ borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10, fontSize: 14, height: 60 }} multiline />

              {/* Actions */}
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
                <TouchableOpacity onPress={() => setShowCompleteModal(false)} style={{ flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', backgroundColor: '#f3f4f6' }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151' }}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleComplete} disabled={updating || checkedItems.size < checklist.length}
                  style={{ flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', backgroundColor: '#059669', opacity: (updating || checkedItems.size < checklist.length) ? 0.5 : 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: 'bold', color: 'white' }}>
                    {updating ? '...' : `✅ Xác nhận ${finalPrice.toLocaleString()}₫`}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 12,
  },
  backLink: {
    color: '#3b82f6',
    fontSize: 14,
  },
  header: {
    backgroundColor: '#3b82f6',
    padding: 24,
    paddingTop: 60,
  },
  backButton: {
    marginBottom: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 14,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  card: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryIcon: {
    fontSize: 24,
  },
  category: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  section: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  description: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
    width: 80,
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
    flex: 1,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stars: {
    fontSize: 20,
    color: '#fbbf24',
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  feedback: {
    fontSize: 14,
    color: '#374151',
    fontStyle: 'italic',
    marginTop: 8,
  },
  actions: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  buttonGroup: {
    gap: 8,
    marginTop: 8,
  },
  button: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
  },
  successButton: {
    backgroundColor: '#16a34a',
  },
  secondaryButton: {
    backgroundColor: '#f3f4f6',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#374151',
  },
})
