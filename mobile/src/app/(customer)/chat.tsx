import { useState, useEffect, useRef } from 'react'
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator,
  Alert
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { Ionicons } from '@expo/vector-icons'
import * as Location from 'expo-location'
import * as ImagePicker from 'expo-image-picker'

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  actions?: any[];
  isStreaming?: boolean;
}

interface ChatSession {
  id: string;
  status: string;
  created_at: string;
}

export default function CustomerChatScreen() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [session, setSession] = useState<ChatSession | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const flatListRef = useRef<FlatList>(null)

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }
    setUser(session.user)
    loadOrCreateSession(session.user.id)
  }

  async function loadOrCreateSession(userId: string) {
    try {
      const { data: sessions, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)

      if (error) throw error

      if (sessions && sessions.length > 0) {
        setSession(sessions[0])
        await loadMessages(sessions[0].id)
      } else {
        await startNewChat()
      }
    } catch (error) {
      console.error('Error loading session:', error)
    }
  }

  async function loadMessages(sessionId: string) {
    try {
      const { data: msgs, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })

      if (error) throw error

      if (msgs) {
        setMessages(msgs.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.created_at),
          actions: msg.metadata?.actions
        })))
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  async function startNewChat() {
    setInputMessage('')
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: 'Xin chào! Tôi là trợ lý AI của Vifixa. Bạn cần hỗ trợ sửa chữa gì? Hãy mô tả sự cố bạn đang gặp phải nhé! 😊',
      timestamp: new Date()
    }])
    setSession(null)
  }

  async function sendMessage(messageOverride?: string, contextOverride?: Record<string, any>) {
    const textToSend = messageOverride || inputMessage
    if (!textToSend.trim() || isLoading) return

    const userMessage = textToSend.trim()
    setInputMessage('')
    setIsLoading(true)

    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`, role: 'user', content: userMessage, timestamp: new Date()
    }
    setMessages(prev => [...prev, tempUserMsg])

    try {
      const { data: { session: authSession } } = await supabase.auth.getSession()
      if (!authSession) { router.push('/login'); return }

      const aiMsgId = `ai-${Date.now()}`
      setMessages(prev => [...prev, { id: aiMsgId, role: 'assistant', content: '', timestamp: new Date(), actions: [], isStreaming: true }])

      const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/ai-chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authSession.access_token}`,
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          session_id: session?.id || null,
          message: userMessage,
          context: contextOverride,
          stream: true,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to send message')
      }

      // Streaming via SSE
      let fullData: any = null
      if (response.body) {
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const parsed = JSON.parse(line.slice(6))
                fullData = parsed
                setMessages(prev => prev.map(m =>
                  m.id === aiMsgId ? { ...m, content: parsed.reply || m.content, isStreaming: true } : m
                ))
              } catch { /* partial chunk */ }
            }
          }
        }
      } else {
        // Fallback: non-streaming
        throw new Error('Streaming not supported')
      }

      if (fullData) {
        const allActions = [...(fullData.actions || [])]
        if (fullData.upsell?.show && !fullData.session_complete) {
          allActions.push({ type: 'upsell_card', label: fullData.upsell.suggestion || '', value: fullData.upsell.product_type || '', data: fullData.upsell })
        }
        setMessages(prev => prev.map(m =>
          m.id === aiMsgId ? { ...m, actions: allActions, isStreaming: false } : m
        ))

        if (fullData.session_id && session?.id !== fullData.session_id) {
          setSession({ id: fullData.session_id, status: 'active', created_at: new Date().toISOString() })
        }
        if (fullData.session_id) await loadMessages(fullData.session_id)

        if (fullData.session_complete) {
          Alert.alert('Thành công!', 'Đơn dịch vụ đã được chốt thành công!', [{
            text: 'Xem đơn hàng',
            onPress: () => { if (fullData.order_id) router.push(`/(customer)/orders/${fullData.order_id}` as any) }
          }])
        }
      }
    } catch (error: any) {
      console.error('Send message error:', error)
      Alert.alert('Lỗi', error.message)
      setMessages(prev => prev.filter(m => m.content !== ''))
    } finally {
      setIsLoading(false)
    }
  }


  async function handleAction(action: any) {
    if (action.type === 'share_location') {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status !== 'granted') {
          Alert.alert('Cần vị trí', 'Bạn có thể nhập địa chỉ/khu vực cụ thể trong ô chat nếu không cấp quyền GPS.')
          return
        }

        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
        await sendMessage('Tôi đã gửi vị trí hiện tại', {
          location: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
        })
      } catch (error: any) {
        Alert.alert('Không lấy được vị trí', error.message || 'Vui lòng nhập địa chỉ/khu vực trong ô chat.')
      }
      return
    }

    if (action.type === 'upload_media') {
      await pickAndUploadMedia()
      return
    }

    if (action.type === 'confirmation_card') {
      await sendMessage(action.value || 'Tôi xác nhận tạo đơn dịch vụ')
      return
    }

    if (action.value) {
      await sendMessage(action.value)
    }
  }

  async function pickAndUploadMedia() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!permission.granted) {
        Alert.alert('Cần quyền ảnh', 'Vui lòng cấp quyền thư viện ảnh để gửi bằng chứng sự cố.')
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: true,
        quality: 0.8,
      })

      if (result.canceled || result.assets.length === 0) return

      const { data: { session: authSession } } = await supabase.auth.getSession()
      if (!authSession) {
        router.push('/login')
        return
      }

      setIsLoading(true)
      const mediaUrls: string[] = []
      for (const asset of result.assets) {
        const response = await fetch(asset.uri)
        const blob = await response.blob()
        const extension = asset.uri.split('.').pop()?.split('?')[0] || 'jpg'
        const fileName = `${authSession.user.id}/${session?.id || 'new-chat'}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`

        const { data, error } = await supabase.storage
          .from('service-media')
          .upload(fileName, blob)

        if (error) throw error
        const { data: { publicUrl } } = supabase.storage
          .from('service-media')
          .getPublicUrl(data.path)
        mediaUrls.push(publicUrl)
      }

      await sendMessage(`Tôi đã gửi ${mediaUrls.length} ảnh/video sự cố`, { media_urls: mediaUrls })
    } catch (error: any) {
      Alert.alert('Lỗi upload', error.message)
    } finally {
      setIsLoading(false)
    }
  }

  function formatVnd(value?: number) {
    return typeof value === 'number' ? `${value.toLocaleString('vi-VN')}đ` : 'Đang cập nhật'
  }

  function renderAction(action: any, idx: number) {
    if (action.type === 'quote_card') {
      const quote = action.data || {}
      return (
        <View key={idx} style={styles.quoteCard}>
          <Text style={styles.cardTitle}>💰 Báo giá dự kiến</Text>
          <Text style={styles.priceText}>{formatVnd(quote.estimated_price)}</Text>
          {typeof quote.confidence === 'number' && (
            <Text style={styles.cardText}>Độ tin cậy: {Math.round(quote.confidence * 100)}%</Text>
          )}
          {Array.isArray(quote.price_breakdown) && quote.price_breakdown.map((item: any, itemIdx: number) => (
            <Text key={itemIdx} style={styles.cardText}>• {item.item}: {formatVnd(item.cost)}</Text>
          ))}
          <Text style={styles.disclaimerText}>Giá cuối có thể thay đổi sau khảo sát thực tế và vật tư phát sinh.</Text>
        </View>
      )
    }

    if (action.type === 'confirmation_card') {
      const data = action.data || {}
      return (
        <View key={idx} style={styles.confirmationCard}>
          <Text style={styles.cardTitle}>✅ Xác nhận tạo đơn</Text>
          <Text style={styles.cardText}>Dịch vụ: {data.category || 'Đã ghi nhận trong chat'}</Text>
          <Text style={styles.cardText}>Thời gian: {data.preferred_time || 'Theo thông tin đã cung cấp'}</Text>
          <Text style={styles.cardText}>Vị trí: {typeof data.location === 'string' ? data.location : data.location ? 'Đã gửi tọa độ' : 'Đã ghi nhận'}</Text>
          {data.quote?.estimated_price && <Text style={styles.cardText}>Giá dự kiến: {formatVnd(data.quote.estimated_price)}</Text>}
          <Text style={styles.disclaimerText}>Bạn cần xác nhận rõ trước khi Vifixa tạo đơn và ghép thợ.</Text>
          <TouchableOpacity style={styles.confirmButton} onPress={() => handleAction(action)} disabled={isLoading}>
            <Text style={styles.confirmButtonText}>Tôi xác nhận tạo đơn</Text>
          </TouchableOpacity>
        </View>
      )
    }

    if (action.type === 'upsell_card') {
      const upsell = action.data || {}
      const productLabels: Record<string, string> = {
        membership: 'Gói hội viên', warranty: 'Bảo hành mở rộng',
        premium_worker: 'Thợ ưu tiên', material_kit: 'Vật tư',
        maintenance_plan: 'Bảo trì định kỳ', boost_package: 'Gói nổi bật',
      }
      return (
        <View key={idx} style={styles.upsellCard}>
          <Text style={styles.cardTitle}>💎 Ưu đãi đặc biệt</Text>
          <Text style={styles.cardText}>{upsell.suggestion || action.label}</Text>
          {upsell.discount_percent > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountBadgeText}>Giảm {upsell.discount_percent}%</Text>
            </View>
          )}
          <Text style={[styles.cardText, { color: '#9ca3af', fontSize: 11, marginTop: 4 }]}>
            {productLabels[upsell.product_type] || upsell.product_type}
          </Text>
          <TouchableOpacity
            style={styles.upsellButton}
            onPress={() => sendMessage(`Tôi muốn tìm hiểu thêm về ${upsell.product_type || 'ưu đãi này'}`)}
          >
            <Text style={styles.upsellButtonText}>💎 Tìm hiểu thêm</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.upsellSkipButton}
            onPress={() => sendMessage('Không, cảm ơn')}
          >
            <Text style={styles.upsellSkipText}>Bỏ qua</Text>
          </TouchableOpacity>
        </View>
      )
    }

    return (
      <TouchableOpacity key={idx} style={styles.actionBadge} onPress={() => handleAction(action)} disabled={isLoading}>
        <Text style={styles.actionText}>⚡ {action.label || action.type}</Text>
      </TouchableOpacity>
    )
  }

  function renderMessage({ item }: { item: Message }) {
    const isUser = item.role === 'user'
    
    return (
      <View style={[styles.messageContainer, isUser ? styles.userMessage : styles.assistantMessage]}>
        <View style={styles.messageHeader}>
          <Text style={styles.messageIcon}>
            {item.role === 'assistant' ? '🤖' : '👤'}
          </Text>
          <Text style={[styles.messageTime, isUser ? styles.userTime : styles.assistantTime]}>
            {item.timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <Text style={[styles.messageText, isUser ? styles.userText : styles.assistantText]}>
          {item.content}
        </Text>
        {item.actions && item.actions.length > 0 && (
          <View style={styles.actionsContainer}>
            {item.actions.map((action: any, idx: number) => renderAction(action, idx))}
          </View>
        )}
      </View>
    )
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>💬 Chat với AI</Text>
          <Text style={styles.headerSubtitle}>Vifixa AI Assistant</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={startNewChat} style={styles.headerButton}>
            <Ionicons name="add-circle-outline" size={24} color="#2563eb" />
            <Text style={styles.headerButtonText}>Mới</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => router.push('/(customer)/service-request' as any)} 
            style={styles.headerButton}
          >
            <Ionicons name="document-outline" size={24} color="#4b5563" />
            <Text style={styles.headerButtonText}>Form</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListFooterComponent={
          isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#2563eb" />
              <Text style={styles.loadingText}>AI đang trả lời...</Text>
            </View>
          ) : null
        }
      />

      {/* Quick Actions */}
      {messages.length <= 1 && (
        <View style={styles.quickActions}>
          {[
            { emoji: '❄️', label: 'Máy lạnh', query: 'Máy lạnh không mát' },
            { emoji: '💡', label: 'Điện', query: 'Bị mất điện' },
            { emoji: '🚿', label: 'Nước', query: 'Nước rò rỉ' },
            { emoji: '📷', label: 'Camera', query: 'Lắp camera' },
          ].map((action) => (
            <TouchableOpacity
              key={action.label}
              style={styles.quickActionButton}
              onPress={() => setInputMessage(action.query)}
            >
              <Text style={styles.quickActionEmoji}>{action.emoji}</Text>
              <Text style={styles.quickActionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={inputMessage}
          onChangeText={setInputMessage}
          placeholder="Nhập tin nhắn... (VD: Máy lạnh không mát)"
          placeholderTextColor="#9ca3af"
          multiline
          editable={!isLoading}
          onSubmitEditing={() => sendMessage()}
        />
        <TouchableOpacity
          onPress={() => {
            Alert.alert('Thông báo', 'Tính năng nhập giọng nói đang phát triển')
          }}
          style={[styles.voiceButton, isListening && styles.voiceButtonActive]}
        >
          <Ionicons name={isListening ? 'stop-circle' : 'mic'} size={24} color={isListening ? 'white' : '#4b5563'} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => sendMessage()}
          disabled={isLoading || !inputMessage.trim()}
          style={[styles.sendButton, (!inputMessage.trim() || isLoading) && styles.sendButtonDisabled]}
        >
          <Ionicons name="send" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    alignItems: 'center',
    gap: 2,
  },
  headerButtonText: {
    fontSize: 10,
    color: '#4b5563',
  },
  messagesList: {
    padding: 16,
    paddingBottom: 32,
  },
  messageContainer: {
    marginBottom: 12,
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#2563eb',
    borderBottomRightRadius: 4,
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderBottomLeftRadius: 4,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  messageIcon: {
    fontSize: 16,
  },
  messageTime: {
    fontSize: 10,
  },
  userTime: {
    color: '#bfdbfe',
  },
  assistantTime: {
    color: '#9ca3af',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userText: {
    color: 'white',
  },
  assistantText: {
    color: '#111827',
  },
  actionsContainer: {
    marginTop: 8,
    gap: 4,
  },
  actionBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  actionText: {
    fontSize: 10,
    color: '#2563eb',
  },
  quoteCard: {
    marginTop: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    gap: 4,
  },
  confirmationCard: {
    marginTop: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    gap: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  priceText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  cardText: {
    fontSize: 12,
    color: '#374151',
    lineHeight: 18,
  },
  disclaimerText: {
    marginTop: 4,
    fontSize: 11,
    color: '#047857',
    lineHeight: 16,
  },
  confirmButton: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#059669',
    alignItems: 'center',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '700',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#6b7280',
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  quickActionButton: {
    flex: 1,
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  quickActionEmoji: {
    fontSize: 20,
    marginBottom: 2,
  },
  quickActionLabel: {
    fontSize: 10,
    color: '#4b5563',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 8,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 100,
    color: '#111827',
  },
  voiceButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceButtonActive: {
    backgroundColor: '#ef4444',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  upsellCard: {
    marginTop: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    gap: 4,
  },
  discountBadge: {
    backgroundColor: '#fee2e2',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  discountBadgeText: {
    color: '#dc2626',
    fontWeight: '700',
    fontSize: 11,
  },
  upsellButton: {
    marginTop: 6,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
  },
  upsellButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '700',
  },
  upsellSkipButton: {
    paddingVertical: 6,
    alignItems: 'center',
  },
  upsellSkipText: {
    color: '#9ca3af',
    fontSize: 12,
  },
})
