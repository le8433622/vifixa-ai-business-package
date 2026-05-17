// Real-time Chat between Customer and Worker
import { useState, useEffect, useRef } from 'react'
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import { supabase } from '@/lib/supabase'

interface Message {
  id: string
  sender_id: string
  content: string
  created_at: string
}

interface Props {
  conversationId?: string
  orderId: string
  otherPartyId: string
}

export default function ChatScreen({ conversationId: existingConvId, orderId, otherPartyId }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [convId, setConvId] = useState(existingConvId || null)
  const [userId, setUserId] = useState<string | null>(null)
  const flatListRef = useRef<FlatList>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUserId(session.user.id)
        initConversation(session.user.id)
      }
    })
  }, [])

  async function initConversation(uid: string) {
    if (convId) {
      loadMessages(convId)
      return
    }
    // Find or create conversation
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('order_id', orderId)
      .maybeSingle()

    if (existing) {
      setConvId(existing.id)
      loadMessages(existing.id)
    } else {
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({ order_id: orderId, customer_id: uid, worker_id: otherPartyId })
        .select()
        .single()
      if (newConv) {
        setConvId(newConv.id)
      }
    }
  }

  async function loadMessages(cid: string) {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', cid)
      .order('created_at', { ascending: true })
    if (data) setMessages(data as Message[])
  }

  // Realtime subscription
  useEffect(() => {
    if (!convId) return
    const channel = supabase
      .channel(`messages-${convId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${convId}` },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message])
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [convId])

  async function sendMessage() {
    if (!input.trim() || !convId || !userId) return
    const { error } = await supabase.from('messages').insert({
      conversation_id: convId,
      sender_id: userId,
      content: input.trim(),
    })
    if (!error) setInput('')
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={m => m.id}
        style={styles.list}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.sender_id === userId ? styles.myBubble : styles.theirBubble]}>
            <Text style={[styles.text, item.sender_id === userId && styles.myText]}>{item.content}</Text>
            <Text style={[styles.time, item.sender_id === userId && styles.myTime]}>
              {new Date(item.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Chưa có tin nhắn</Text>}
      />
      <View style={styles.inputBar}>
        <TextInput value={input} onChangeText={setInput} placeholder="Nhập tin nhắn..."
          style={styles.input} multiline />
        <TouchableOpacity onPress={sendMessage} disabled={!input.trim()}
          style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}>
          <Text style={styles.sendText}>Gửi</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  list: { flex: 1, padding: 12 },
  bubble: { maxWidth: '80%', padding: 10, borderRadius: 16, marginBottom: 6 },
  myBubble: { backgroundColor: '#3b82f6', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  theirBubble: { backgroundColor: 'white', alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  text: { fontSize: 14, color: '#1f2937' },
  myText: { color: 'white' },
  time: { fontSize: 10, color: '#999', marginTop: 4, alignSelf: 'flex-end' },
  myTime: { color: 'rgba(255,255,255,0.7)' },
  empty: { textAlign: 'center', color: '#999', marginTop: 40 },
  inputBar: { flexDirection: 'row', padding: 12, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#e5e7eb', gap: 8 },
  input: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, maxHeight: 100 },
  sendBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  sendBtnDisabled: { opacity: 0.5 },
  sendText: { color: 'white', fontWeight: 'bold' },
})