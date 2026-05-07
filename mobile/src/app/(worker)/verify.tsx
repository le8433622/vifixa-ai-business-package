// Worker Verification - Mobile
// Per user request: Complete mobile worker pages

import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView, TextInput } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { LinearGradient } from 'expo-linear-gradient'

type Profile = {
  id: string
  full_name?: string
  phone?: string
  id_number?: string
  address?: string
  verification_status?: string
}

export default function VerifyScreen() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  
  // Form states
  const [idNumber, setIdNumber] = useState('')
  const [address, setAddress] = useState('')
  const [agreeTerms, setAgreeTerms] = useState(false)

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }
      fetchProfile(session.user.id)
    } catch (error: any) {
      console.error('checkUser error:', error)
    }
  }

  async function fetchProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      setProfile(data)
      setIdNumber(data.id_number || '')
      setAddress(data.address || '')
    } catch (error: any) {
      console.error('fetchProfile error:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit() {
    if (!agreeTerms) {
      Alert.alert('Lỗi', 'Bạn cần đồng ý với điều khoản dịch vụ')
      return
    }

    setSubmitting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { error } = await supabase
        .from('profiles')
        .update({
          id_number: idNumber,
          address: address,
          verification_status: 'pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.user.id)

      if (error) throw error

      setSuccess(true)
      setTimeout(() => {
        router.push('/(worker)' as any)
      }, 2000)
    } catch (error: any) {
      console.error('submit error:', error)
      Alert.alert('Lỗi', error.message || 'Có lỗi xảy ra')
    } finally {
      setSubmitting(false)
    }
  }

  function getStatusInfo(status?: string) {
    switch (status) {
      case 'verified':
        return { icon: '✅', title: 'Đã xác minh', desc: 'Tài khoản của bạn đã được xác minh đầy đủ.', color: '#16a34a' }
      case 'pending':
        return { icon: '⏳', title: 'Đang chờ xác minh', desc: 'Hồ sơ đang được xem xét (1-2 ngày làm việc).', color: '#ca8a04' }
      case 'rejected':
        return { icon: '❌', title: 'Bị từ chối', desc: 'Hồ sơ không đạt. Vui lòng cập nhật lại.', color: '#dc2626' }
      default:
        return { icon: '📝', title: 'Chưa xác minh', desc: 'Vui lòng hoàn thành hồ sơ để nhận việc.', color: '#6b7280' }
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    )
  }

  const statusInfo = getStatusInfo(profile?.verification_status)

  return (
    <ScrollView style={styles.container}>
      <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📋 Xác minh thợ</Text>
        <Text style={styles.headerSubtitle}>Hoàn thiện hồ sơ để nhận việc</Text>
      </LinearGradient>

      {/* Status Card */}
      <View style={[styles.statusCard, { borderColor: statusInfo.color }]}>
        <Text style={styles.statusIcon}>{statusInfo.icon}</Text>
        <Text style={[styles.statusTitle, { color: statusInfo.color }]}>{statusInfo.title}</Text>
        <Text style={styles.statusDesc}>{statusInfo.desc}</Text>
      </View>

      {success ? (
        <View style={styles.successCard}>
          <Text style={styles.successIcon}>🎉</Text>
          <Text style={styles.successTitle}>Gửi hồ sơ thành công!</Text>
          <Text style={styles.successDesc}>Đang chuyển về Dashboard...</Text>
        </View>
      ) : (
        <>
          {/* Personal Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📋 Thông tin cá nhân</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Họ và tên</Text>
              <TextInput
                value={profile?.full_name || ''}
                editable={false}
                style={[styles.input, styles.inputDisabled]}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Số điện thoại</Text>
              <TextInput
                value={profile?.phone || ''}
                editable={false}
                style={[styles.input, styles.inputDisabled]}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Số CMND/CCCD <Text style={styles.required}>*</Text></Text>
              <TextInput
                value={idNumber}
                onChangeText={setIdNumber}
                placeholder="Nhập số CMND/CCCD"
                style={styles.input}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Địa chỉ <Text style={styles.required}>*</Text></Text>
              <TextInput
                value={address}
                onChangeText={setAddress}
                placeholder="Nhập địa chỉ hiện tại"
                multiline
                numberOfLines={3}
                style={[styles.input, styles.textArea]}
              />
            </View>
          </View>

          {/* ID Documents */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📷 Giấy tờ tùy thân</Text>
            <Text style={styles.sectionDesc}>
              Upload CMND/CCCD trong phần Hồ sơ
            </Text>
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => router.push('/(worker)/profile' as any)}
            >
              <Text style={styles.linkButtonText}>Đi đến Hồ sơ →</Text>
            </TouchableOpacity>
          </View>

          {/* Bank Account */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏦 Tài khoản ngân hàng</Text>
            <Text style={styles.sectionDesc}>
              Thêm tài khoản để nhận thanh toán
            </Text>
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => router.push('/(worker)/profile' as any)}
            >
              <Text style={styles.linkButtonText}>Đi đến Hồ sơ →</Text>
            </TouchableOpacity>
          </View>

          {/* Terms */}
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setAgreeTerms(!agreeTerms)}
          >
            <View style={[styles.checkbox, agreeTerms && styles.checkboxChecked]}>
              {agreeTerms && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>
              Tôi xác nhận thông tin chính xác và đồng ý với Điều khoản dịch vụ
            </Text>
          </TouchableOpacity>

          {/* Submit */}
          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => router.back()}
            >
              <Text style={styles.cancelButtonText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.submitButton, 
                (submitting || profile?.verification_status === 'verified') && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={submitting || profile?.verification_status === 'verified'}
            >
              <Text style={styles.submitButtonText}>
                {submitting ? 'Đang gửi...' : 
                 profile?.verification_status === 'verified' ? 'Đã xác minh' :
                 profile?.verification_status === 'pending' ? 'Đang chờ duyệt' :
                 'Gửi hồ sơ xác minh'}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
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
    padding: 24,
    paddingTop: 60,
  },
  backButton: {
    marginBottom: 12,
  },
  backButtonText: {
    color: 'white',
    fontSize: 14,
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
  statusCard: {
    backgroundColor: 'white',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statusDesc: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  successCard: {
    margin: 16,
    padding: 40,
    backgroundColor: 'white',
    borderRadius: 12,
    alignItems: 'center',
  },
  successIcon: {
    fontSize: 64,
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#16a34a',
    marginBottom: 4,
  },
  successDesc: {
    fontSize: 14,
    color: '#6b7280',
  },
  section: {
    backgroundColor: 'white',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  sectionDesc: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  required: {
    color: '#dc2626',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111827',
  },
  inputDisabled: {
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  linkButton: {
    backgroundColor: '#3b82f6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  linkButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    margin: 16,
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  checkmark: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 8,
    margin: 16,
    marginBottom: 40,
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#3b82f6',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
})
