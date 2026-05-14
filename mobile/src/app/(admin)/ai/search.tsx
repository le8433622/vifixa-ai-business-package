import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, Keyboard } from 'react-native'
import { supabase } from '@/lib/supabase'
import { useState } from 'react'
import { useRouter } from 'expo-router'

export default function TimKiemAI() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [daTim, setDaTim] = useState(false)

  async function handleSearch() {
    if (!query.trim()) return
    Keyboard.dismiss()
    setLoading(true); setDaTim(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/ai-search?action=search&q=${encodeURIComponent(query)}&type=worker&limit=10`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await res.json()
      setResults(data.results || [])
    } catch { /* ignore */ }
    setLoading(false)
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}><Text style={styles.headerTitle}>🔍 Tìm kiếm AI</Text></View>
      <View style={styles.searchRow}>
        <TextInput style={styles.input} value={query} onChangeText={setQuery} placeholder="VD: thợ sửa máy lạnh..." placeholderTextColor="#9ca3af" onSubmitEditing={handleSearch} returnKeyType="search" />
        <TouchableOpacity style={styles.button} onPress={handleSearch}><Text style={styles.buttonText}>🔍</Text></TouchableOpacity>
      </View>
      {loading ? <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} /> : daTim && results.length === 0 ? (
        <View style={styles.empty}><Text style={styles.emptyText}>Không tìm thấy kết quả</Text></View>
      ) : (
        <FlatList data={results} keyExtractor={(item, idx) => `${item.id}-${idx}`} contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.name}>{item.metadata?.name || item.text?.slice(0, 40)}</Text>
              <Text style={styles.match}>{Math.round((item.similarity || 0) * 100)}% phù hợp</Text>
              <Text style={styles.text} numberOfLines={2}>{item.text}</Text>
            </View>
          )}
        />
      )}
    </View>
  )
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { backgroundColor: '#2563eb', padding: 24, paddingTop: 60 }, headerTitle: { fontSize: 22, fontWeight: 'bold', color: 'white' },
  searchRow: { flexDirection: 'row', margin: 16, gap: 8 },
  input: { flex: 1, backgroundColor: 'white', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, borderWidth: 1, borderColor: '#e5e7eb' },
  button: { backgroundColor: '#2563eb', width: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 20, color: 'white' },
  list: { padding: 16 }, empty: { padding: 40, alignItems: 'center' }, emptyText: { color: '#6b7280', fontSize: 14 },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 14, marginBottom: 8 },
  name: { fontSize: 15, fontWeight: '600', marginBottom: 2 }, match: { fontSize: 12, color: '#2563eb', marginBottom: 4 },
  text: { fontSize: 12, color: '#6b7280' },
})