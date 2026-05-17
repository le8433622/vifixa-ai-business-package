import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, FlatList } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import AvailableWorkersMap from '@/components/map/AvailableWorkersMap'

const CATEGORIES = [
  { id: 'air_conditioning', name: 'Máy lạnh', icon: '❄️' },
  { id: 'electricity', name: 'Điện', icon: '💡' },
  { id: 'plumbing', name: 'Nước', icon: '🚿' },
  { id: 'camera', name: 'Camera', icon: '📷' },
]

export default function CustomerMapScreen() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/login')
      setLoading(false)
    })
  }, [])

  function handleWorkerSelect(workerId: string) {
    router.push(`/(customer)/chat?worker=${workerId}`)
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#3b82f6" /></View>
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🗺️ Thợ gần bạn</Text>
        <Text style={styles.subtitle}>Tìm thợ theo vị trí thực tế</Text>
      </View>

      {/* Category filter */}
      <View style={styles.categoryRow}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity key={cat.id}
            onPress={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
            style={[styles.categoryChip, selectedCategory === cat.id && styles.categoryActive]}>
            <Text style={styles.categoryIcon}>{cat.icon}</Text>
            <Text style={[styles.categoryText, selectedCategory === cat.id && styles.categoryTextActive]}>{cat.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <AvailableWorkersMap
          onWorkerSelect={handleWorkerSelect}
          requiredSkills={selectedCategory ? [selectedCategory] : []}
        />
      </View>

      {/* Bottom info */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Chọn thợ trên bản đồ để xem chi tiết hoặc chat</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#3b82f6', padding: 20, paddingTop: 60 },
  title: { fontSize: 22, fontWeight: 'bold', color: 'white' },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  categoryRow: { flexDirection: 'row', padding: 12, gap: 8, backgroundColor: 'white' },
  categoryChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f0f0f0', gap: 4 },
  categoryActive: { backgroundColor: '#3b82f6' },
  categoryIcon: { fontSize: 14 },
  categoryText: { fontSize: 12, color: '#666' },
  categoryTextActive: { color: 'white', fontWeight: '600' },
  mapContainer: { flex: 1 },
  footer: { padding: 16, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#e5e7eb', alignItems: 'center' },
  footerText: { fontSize: 12, color: '#999' },
})