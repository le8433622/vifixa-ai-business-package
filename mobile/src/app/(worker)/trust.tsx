// Worker Trust Page - Mobile
// Per user request: Fix critical error (layout references trust.tsx but file missing)

import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'

type Profile = {
  id: string
  full_name?: string
  trust_score?: number
  id_front_url?: string
  id_back_url?: string
  bank_account?: any
  verification_status?: string
}

export default function TrustScreen() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProfile()
  }, [])

  async function fetchProfile() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (error) throw error
      setProfile(data)
    } catch (error: any) {
      console.error('fetchProfile error:', error)
      Alert.alert('Lỗi', error.message)
    } finally {
      setLoading(false)
    }
  }

  function getTrustColor(score?: number) {
    if (!score) return '#6b7280'
    if (score >= 80) return '#16a34a' // green
    if (score >= 60) return '#ca8a04' // yellow
    return '#dc2626' // red
  }

  function getTrustLabel(score?: number) {
    if (!score) return 'Chưa đánh giá'
    if (score >= 80) return 'Rất tốt'
    if (score >= 60) return 'Tốt'
    return 'Cần cải thiện'
  }

  function getVerificationStatus(status?: string) {
    switch (status) {
      case 'verified': return { text: 'Đã xác minh', color: '#16a34a', bg: '#dcfce7' }
      case 'pending': return { text: 'Đang xử lý', color: '#ca8a04', bg: '#fef9c3' }
      case 'rejected': return { text: 'Bị từ chối', color: '#dc2626', bg: '#fee2e2' }
      default: return { text: 'Chưa xác minh', color: '#6b7280', bg: '#f3f4f6' }
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    )
  }

  const trustStatus = getVerificationStatus(profile?.verification_status)

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🔐 Độ tin cậy</Text>
        <Text style={styles.headerSubtitle}>Quản lý độ tin cậy và xác minh</Text>
      </View>

      {/* Trust Score Card */}
      <View style={styles.scoreCard}>
        <View style={styles.scoreCircle}>
          <Text style={[styles.scoreNumber, { color: getTrustColor(profile?.trust_score) }]}>
            {profile?.trust_score || 0}
          </Text>
          <Text style={styles.scoreMax}>/100</Text>
        </View>
        <Text style={styles.scoreLabel}>Điểm tin cậy</Text>
        <View style={[styles.trustBadge, { backgroundColor: trustStatus.bg }]}>
          <Text style={[styles.trustBadgeText, { color: trustStatus.color }]}>
            {trustStatus.text}
          </Text>
        </View>
      </View>

      {/* Verification Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📝 Xác minh danh tính</Text>
        
        {profile?.id_front_url ? (
          <View style={styles.successCard}>
            <Text style={styles.successIcon}>✅</Text>
            <View style={styles.successContent}>
              <Text style={styles.successTitle}>Đã upload CMND/CCCD</Text>
              <Text style={styles.successDesc}>Mặt trước và mặt sau đã được upload</Text>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.uploadCard}
            onPress={() => router.push('/(worker)/profile' as any)}
          >
            <Text style={styles.uploadIcon}>📷</Text>
            <Text style={styles.uploadTitle}>Upload CMND/CCCD</Text>
            <Text style={styles.uploadDesc}>Nhấn để upload giấy tờ</Text>
          </TouchableOpacity>
        )}

        {profile?.verification_status === 'rejected' && (
          <View style={styles.rejectedCard}>
            <Text style={styles.rejectedText}>
              Hồ sơ bị từ chối. Vui lòng upload lại giấy tờ rõ ràng hơn.
            </Text>
          </View>
        )}
      </View>

      {/* Bank Account */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🏦 Tài khoản ngân hàng</Text>
        
        {profile?.bank_account ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Ngân hàng:</Text>
            <Text style={styles.infoValue}>{profile.bank_account.bank_name || '...'}</Text>
            <Text style={styles.infoLabel}>Số tài khoản:</Text>
            <Text style={styles.infoValue}>{profile.bank_account.account_number || '...'}</Text>
            <Text style={styles.infoLabel}>Chủ tài khoản:</Text>
            <Text style={styles.infoValue}>{profile.bank_account.account_holder || '...'}</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.uploadCard}
            onPress={() => router.push('/(worker)/profile' as any)}
          >
            <Text style={styles.uploadIcon}>🏦</Text>
            <Text style={styles.uploadTitle}>Thêm tài khoản ngân hàng</Text>
            <Text style={styles.uploadDesc}>Để nhận tiền công việc</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Info Box */}
      <View style={styles.infoBox}>
        <Text style={styles.infoBoxTitle}>💡 Mẹo nhỏ</Text>
        <Text style={styles.infoBoxText}>
          • Điểm tin cậy ≥80 sẽ được ưu tiên nhận việc.{'\n'}
          • Upload CMND/CCCD rõ ràng, không bị lóa.{'\n'}
          • Thông tin ngân hàng phải chính xác.{'\n'}
          • Đánh giá cao từ khách hàng sẽ tăng điểm tin cậy.
        </Text>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/(worker)/profile' as any)}
        >
          <Text style={styles.actionButtonText}>📝 Cập nhật hồ sơ</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={() => router.push('/(worker)/earnings' as any)}
        >
          <Text style={styles.secondaryButtonText}>💰 Xem thu nhập</Text>
        </TouchableOpacity>
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
  header: {
    backgroundColor: '#3b82f6',
    padding: 24,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  scoreCard: {
    backgroundColor: 'white',
    margin: 16,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  scoreNumber: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  scoreMax: {
    fontSize: 14,
    color: '#9ca3af',
  },
  scoreLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  trustBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  trustBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  successCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  successIcon: {
    fontSize: 32,
  },
  successContent: {
    flex: 1,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  successDesc: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  uploadCard: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  uploadIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  uploadTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  uploadDesc: {
    fontSize: 12,
    color: '#6b7280',
  },
  rejectedCard: {
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  rejectedText: {
    fontSize: 12,
    color: '#dc2626',
  },
  infoCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  infoBox: {
    backgroundColor: '#eff6ff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  infoBoxTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 8,
  },
  infoBoxText: {
    fontSize: 12,
    color: '#1e40af',
    lineHeight: 20,
  },
  actionButton: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '500',
  },
})
