// Register Screen for Mobile
// Per Step 3: Authentication flow for mobile

import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function RegisterScreen() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<'customer' | 'worker'>('customer')
  const [loading, setLoading] = useState(false)

  async function handleRegister() {
    if (!email || !password) {
      Alert.alert('Lỗi', 'Vui lòng nhập email và mật khẩu')
      return
    }
    if (password.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự')
      return
    }
    setLoading(true)
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/auth-register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, phone, role }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Đăng ký thất bại')

      Alert.alert('Thành công', 'Đăng ký thành công! Vui lòng đăng nhập.', [
        { text: 'OK', onPress: () => router.replace('/login') },
      ])
    } catch (error: any) {
      Alert.alert('Lỗi đăng ký', error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>🔧</Text>
        <Text style={styles.appName}>Vifixa AI</Text>
        <Text style={styles.tagline}>Tạo tài khoản mới</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.title}>Đăng ký</Text>

        <View style={styles.roleSelector}>
          <TouchableOpacity
            style={[styles.roleButton, role === 'customer' && styles.roleButtonActive]}
            onPress={() => setRole('customer')}
          >
            <Text style={[styles.roleIcon]}>🏠</Text>
            <Text style={[styles.roleText, role === 'customer' && styles.roleTextActive]}>
              Khách hàng
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleButton, role === 'worker' && styles.roleButtonActive]}
            onPress={() => setRole('worker')}
          >
            <Text style={[styles.roleIcon]}>🔧</Text>
            <Text style={[styles.roleText, role === 'worker' && styles.roleTextActive]}>
              Thợ sửa chữa
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="nhập email của bạn"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Số điện thoại</Text>
          <TextInput
            style={styles.input}
            placeholder="nhập số điện thoại (tuỳ chọn)"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Mật khẩu</Text>
          <TextInput
            style={styles.input}
            placeholder="tối thiểu 6 ký tự"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Đăng ký</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace('/login')} style={styles.linkButton}>
          <Text style={styles.linkText}>
            Đã có tài khoản? <Text style={styles.linkHighlight}>Đăng nhập</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: { fontSize: 60, marginBottom: 12 },
  appName: { fontSize: 32, fontWeight: 'bold', color: '#3b82f6', marginBottom: 4 },
  tagline: { fontSize: 14, color: '#6b7280' },
  form: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 20,
    textAlign: 'center',
  },
  roleSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  roleButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  roleButtonActive: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  roleIcon: { fontSize: 28, marginBottom: 4 },
  roleText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  roleTextActive: { color: '#3b82f6' },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#1f2937',
  },
  button: {
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  linkButton: { marginTop: 20, alignItems: 'center' },
  linkText: { fontSize: 14, color: '#6b7280' },
  linkHighlight: { color: '#3b82f6', fontWeight: '600' },
})