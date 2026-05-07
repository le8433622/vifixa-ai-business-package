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

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  actions?: any[];
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
    loadOrCreateSession()
  }

  async function loadOrCreateSession() {
    try {
      const { data: sessions, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', user?.id)
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

  async function sendMessage() {
    if (!inputMessage.trim() || isLoading) return

    const userMessage = inputMessage.trim()
    setInputMessage('')
    setIsLoading(true)

    // Add user message to UI immediately
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, tempUserMsg])

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/ai-chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: session?.id || null,
          message: userMessage,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send message')
      }

      const data = await response.json()

      // Update session if new
      if (data.session_id && !session) {
        setSession({ id: data.session_id, status: 'active', created_at: new Date().toISOString() })
      }

      // Add AI response to UI
      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        timestamp: new Date(),
        actions: data.actions
      }
      setMessages(prev => [...prev, aiMessage])

      // Reload messages from server
      if (data.session_id) {
        await loadMessages(data.session_id)
      }

      // If session complete
      if (data.session_complete) {
        Alert.alert(
          'Thành công!',
          'Đơn dịch vụ đã được chốt thành công! Chúng tôi sẽ liên hệ sớm nhất.',
          [{ text: 'OK', onPress: () => router.push('/(customer)/') }]
        )
      }

    } catch (error: any) {
      console.error('Send message error:', error)
      Alert.alert('Lỗi', error.message)
    } finally {
      setIsLoading(false)
    }
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
            {item.actions.map((action: any, idx: number) => (
              <View key={idx} style={styles.actionBadge}>
                <Text style={styles.actionText}>⚡ {action.type}</Text>
              </View>
            ))}
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
          onSubmitEditing={sendMessage}
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
          onPress={sendMessage}
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
})
