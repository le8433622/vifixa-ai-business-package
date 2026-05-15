// 💬 V4 CHAT Mobile — Mọi tương tác qua AI
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useState, useEffect, useRef } from 'react'

export default function V4ChatMobile() {
  const router = useRouter()
  const [messages, setMessages] = useState<any[]>([
    { id: 'welcome', role: 'assistant', content: 'Xin chào! Tôi là AI Vifixa. Tôi có thể giúp gì cho bạn?\n\n💡 Thử nói: "Máy lạnh không mát"' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const flatRef = useRef<FlatList>(null)

  async function sendMessage() {
    if (!input.trim() || loading) return
    const text = input.trim(); setInput(''); setLoading(true)
    setMessages(prev => [...prev, { id: `user-${Date.now()}`, role: 'user', content: text }])

    const aiId = `ai-${Date.now()}`
    setMessages(prev => [...prev, { id: aiId, role: 'assistant', content: '...' }])

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/v4-orchestrator`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ hanhDong: 'xu_ly_chat', noiDung: text }),
      })
      const data = await res.json()
      setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: data.ketQuaCuoi?.traLoi || data.yDinh || 'Xin lỗi, chưa hiểu.' } : m))
    } catch {
      setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: '⚠️ Có lỗi. Thử lại.' } : m))
    }
    setLoading(false)
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
        onContentSizeChange={() => flatRef.current?.scrollToEnd()}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.aiBubble]}>
            <Text style={{ fontSize: 14, color: item.role === 'user' ? 'white' : '#111827' }}>{item.content}</Text>
          </View>
        )}
        ListFooterComponent={loading ? <ActivityIndicator size="small" color="#2563eb" /> : null}
      />

      {messages.length <= 2 && (
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 4, gap: 6, flexWrap: 'wrap' }}>
          {['❄️ Máy lạnh hư', '🚿 Rò nước', '⚡ Mất điện'].map(chip => (
            <TouchableOpacity key={chip} onPress={() => setInput(chip)} style={styles.chip}>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>{chip}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.inputRow}>
        <TextInput value={input} onChangeText={setInput} placeholder="Nhập tin nhắn..."
          style={styles.input} onSubmitEditing={sendMessage} returnKeyType="send" />
        <TouchableOpacity onPress={sendMessage} disabled={loading || !input.trim()} style={[styles.sendBtn, (loading || !input.trim()) && { opacity: 0.5 }]}>
          <Text style={{ color: 'white', fontWeight: '600' }}>Gửi</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  bubble: { maxWidth: '80%', padding: 12, borderRadius: 16, marginBottom: 8 },
  userBubble: { backgroundColor: '#2563eb', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  aiBubble: { backgroundColor: 'white', alignSelf: 'flex-start', borderWidth: 1, borderColor: '#e5e7eb', borderBottomLeftRadius: 4 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  inputRow: { flexDirection: 'row', padding: 12, gap: 8, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  input: { flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14 },
  sendBtn: { backgroundColor: '#2563eb', borderRadius: 20, paddingHorizontal: 20, justifyContent: 'center' },
})