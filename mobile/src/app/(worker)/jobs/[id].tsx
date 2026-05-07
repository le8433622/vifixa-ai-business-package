// Worker Job Detail - Mobile
// Per user request: Complete worker pages (mobile)

import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { supabase } from '@/lib/supabase'
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!

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

  async function updateStatus(newStatus: string) {
    setUpdating(true)
    try {
      const updates: any = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      }

      if (newStatus === 'completed') {
        updates.completed_at = new Date().toISOString()
      }

      const { error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', id)

      if (error) throw error

      // Call AI quality check when marking complete
      if (newStatus === 'completed') {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.access_token) {
            const aiRes = await fetch(`${SUPABASE_URL}/functions/v1/ai-quality`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                order_id: id,
                worker_id: session.user.id,
              }),
            })
            if (aiRes.ok) {
              const aiData = await aiRes.json()
              if (!aiData.passed) {
                Alert.alert('Kiểm tra chất lương', `Điểm: ${aiData.quality_score}/100. ${aiData.recommendations?.join(' ') || ''}`)
              }
            }
          }
        } catch (aiError) {
          console.warn('AI quality check failed:', aiError)
        }
      }

      Alert.alert('Thành công', 'Đã cập nhật trạng thái')
      fetchJob()
    } catch (error: any) {
      console.error('updateStatus error:', error)
      Alert.alert('Lỗi', error.message)
    } finally {
      setUpdating(false)
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
                  onPress={() => updateStatus('completed')}
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
