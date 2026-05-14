// 👤 Tài khoản — Mobile Customer Profile

import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'

export default function TrangTaiKhoan() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      setUser(session.user)
    })
  }, [])

  async function handleLogout() {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: async () => {
        await supabase.auth.signOut()
        router.push('/login')
      }},
    ])
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>👤 Tài khoản</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{user?.email || 'Đang tải...'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>ID</Text>
        <Text style={styles.value}>{user?.id?.slice(0, 8) || '...'}...</Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={() => router.push('/customer')}>
        <Text style={styles.buttonText}>🏠 Về trang chủ</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.logoutButton]} onPress={handleLogout}>
        <Text style={[styles.buttonText, { color: '#dc2626' }]}>🚪 Đăng xuất</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { backgroundColor: '#2563eb', padding: 24, paddingTop: 60 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  card: { backgroundColor: 'white', margin: 16, marginBottom: 0, borderRadius: 12, padding: 16 },
  label: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  value: { fontSize: 15, color: '#111827', fontWeight: '500' },
  button: { backgroundColor: 'white', margin: 16, marginBottom: 0, borderRadius: 12, padding: 16, alignItems: 'center' },
  logoutButton: { borderWidth: 1, borderColor: '#fee2e2' },
  buttonText: { fontSize: 15, fontWeight: '600', color: '#2563eb' },
})