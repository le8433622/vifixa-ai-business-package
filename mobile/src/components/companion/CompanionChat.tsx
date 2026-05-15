import React, { useState, useEffect, useRef } from 'react';
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
  Alert,
  Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { supabase } from '@/lib/supabase';
import AvailableWorkersMap from '@/components/map/AvailableWorkersMap';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  actions?: Action[];
}

interface Action {
  type: string;
  label: string;
  data?: any;
}

interface CompanionChatProps {
  persona: 'customer' | 'worker' | 'admin';
  onAction?: (action: Action) => void;
  placeholder?: string;
  onPersonaChange?: (newPersona: 'customer' | 'worker' | 'admin') => void;
}

export default function CompanionChat({ persona, onAction, placeholder, onPersonaChange }: CompanionChatProps) {
  const [messages, setMessages] = useState<Message[]>([{
    id: 'welcome',
    role: 'assistant',
    content: getWelcomeMessage(persona),
    timestamp: new Date()
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [showWorkerMap, setShowWorkerMap] = useState(false);
  const [selectedWorkerSkills, setSelectedWorkerSkills] = useState<string[]>([]);
  const flatListRef = useRef<FlatList>(null);
  const fileInputRef = useRef<any>(null);

  useEffect(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  async function sendMessage(text?: string) {
    const msg = text || input;
    if (!msg.trim() || loading) return;

    setInput('');
    setMessages(prev => [...prev, { 
      id: `u-${Date.now()}`, 
      role: 'user', 
      content: msg,
      timestamp: new Date()
    }]);

    setLoading(true);
    const aiId = `ai-${Date.now()}`;
    setMessages(prev => [...prev, { 
      id: aiId, 
      role: 'assistant', 
      content: '...',
      timestamp: new Date()
    }]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Unauthorized');
      }

      const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/companion/chat`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: msg,
          image_urls: imageUrls.length > 0 ? imageUrls : undefined,
          session_id: sessionId,
          context: {
            user_id: session.user.id,
            persona: persona,
          }
        }),
      });

      setImageUrls([]);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      const data = await response.json();
      setSessionId(data.session_id);

      // Update the AI message with the response
      setMessages(prev => prev.map(m =>
        m.id === aiId ? {
          ...m,
          content: data.reply || 'Xin lỗi, chưa hiểu.',
          actions: data.actions || [],
          timestamp: new Date()
        } : m
      ));

      // Handle redirect if present
      if (data.redirect) {
        // In mobile, we'd need to use router, but we'll skip for now
        console.log('Redirect to:', data.redirect);
      }
    } catch (error: any) {
      console.error('Companion chat error:', error);
      setMessages(prev => prev.map(m =>
        m.id === aiId ? { 
          ...m, 
          content: '⚠️ Lỗi kết nối. Vui lòng thử lại.',
          timestamp: new Date()
        } : m
      ));
    } finally {
      setLoading(false);
    }
  }

  function handleAction(action: Action) {
    if (onAction) {
      onAction(action);
    }

    // Handle specific actions that need special UI
    if (action.type === 'match_worker') {
      // Extract skills from action data if available
      const skillsFromData = action.data?.skills || [];
      setSelectedWorkerSkills(skillsFromData);
      setShowWorkerMap(true);
    }
  }

  async function handleImageUpload() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Cần quyền ảnh', 'Vui lòng cấp quyền thư viện ảnh để gửi ảnh.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (result.canceled || result.assets.length === 0) return;

      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) {
        Alert.alert('Phiên đăng nhập hết hạn', 'Vui lòng đăng nhập lại.');
        return;
      }

      setIsLoading(true);
      const mediaUrls: string[] = [];
      for (const asset of result.assets) {
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        const extension = asset.uri.split('.').pop()?.split('?')[0] || 'jpg';
        const fileName = `${authSession.user.id}/${sessionId || 'new-chat'}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;

        const { data, error } = await supabase.storage
          .from('service-media')
          .upload(fileName, blob);

        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage
          .from('service-media')
          .getPublicUrl(data.path);
        mediaUrls.push(publicUrl);
      }

      await sendMessage(`Tôi đã gửi ${mediaUrls.length} ảnh/video sự cố`);
    } catch (error: any) {
      Alert.alert('Lỗi upload', error.message);
    } finally {
      setIsLoading(false);
    }
  }

  // Helper function to get welcome message
  function getWelcomeMessage(persona: string): string {
    switch (persona) {
      case 'worker':
        return 'Xin chào! 👋 Tôi là AI Co-pilot của bạn.\n\nTôi có thể:\n• 🔍 Tìm job phù hợp\n• 🗺️ Dẫn đường tối ưu\n• 💡 Hướng dẫn sửa chữa\n• 📊 Phân tích thu nhập\n\nBạn cần tôi hỗ trợ gì hôm nay?';
      case 'admin':
        return 'Chào admin! 🛡️ Tôi là AI Analyst.\n\nTôi đang theo dõi:\n• 📈 Doanh thu hôm nay\n• 🔔 Anomalies hệ thống\n• 👥 Hoạt động users\n• ⚠️ Vấn đề cần xử lý\n\nBạn muốn xem gì trước?';
      default:
        return 'Xin chào! 🏠 Tôi là AI Companion của bạn.\n\nTôi có thể:\n• 🔍 Chẩn đoán sự cố (gửi ảnh hoặc mô tả)\n• 💰 Báo giá dịch vụ\n• 🔧 Tìm thợ gần bạn\n• 📋 Theo dõi đơn hàng\n\nHãy thử nói: "Máy lạnh không lạnh"';
    }
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
          <Text style={styles.headerTitle}>{persona === 'customer' ? '🏠' : persona === 'worker' ? '🔧' : '🛡️'}</Text>
          <View>
            <Text style={styles.headerTitleText}>{persona === 'customer' ? 'Khách hàng' : persona === 'worker' ? 'Thợ' : 'Admin'}</Text>
            <Text style={styles.headerSubtitle}>AI Companion của bạn</Text>
          </View>
        </View>
        
        {/* Persona selector - simplified for now */}
        <View style={styles.headerRight}>
          <TouchableOpacity 
            onPress={() => {
              // In a real implementation, this would show a modal to change persona
              Alert.alert('Thông báo', 'Thay đổi persona sẽ được phát triển trong phiên bản tiếp theo');
            }}
          >
            <Text style={styles.headerIcon}>▼</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages */}
      <View style={styles.messagesContainer}>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={({ item }) => renderMessage(item)}
          contentContainerStyle={styles.messagesContent}
          ListFooterComponent={
            loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#2563eb" />
                <Text style={styles.loadingText}>AI đang trả lời...</Text>
              </View>
            ) : null
          }
        />
      </View>

      {/* Image previews */}
      {imageUrls.length > 0 && (
        <View style={styles.imagePreviews}>
          {imageUrls.map((url, index) => (
            <View key={index} style={styles.imagePreview}>
              <Image source={{ uri: url }} style={styles.image} />
              <TouchableOpacity 
                onPress={() => {
                  const newUrls = [...imageUrls];
                  newUrls.splice(index, 1);
                  setImageUrls(newUrls);
                }}
                style={styles.imageDelete}
              >
                <Text style={styles.imageDeleteText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Worker Map View - shown when match_worker action is triggered */}
      {showWorkerMap && (
        <View style={{ flex: 1 }}>
          <AvailableWorkersMap
            requiredSkills={selectedWorkerSkills}
            onWorkerSelect={(workerId) => {
              // When a worker is selected, we can send a message to the chat
              // to continue the conversation with the selected worker context
              setShowWorkerMap(false);
              
              // Send a message indicating worker selection
              setInput(`Tôi đã chọn thợ ID: ${workerId}. Bạn có thể tiếp tục với quy trình đặt dịch vụ.`);
              sendMessage();
            }}
          />
        </View>
      )}

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <View style={styles.inputInner}>
          <TouchableOpacity 
            onPress={handleImageUpload}
            style={styles.imageButton}
          >
            <Text style={styles.imageButtonText}>📷</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.textInput}
            value={input}
            onChangeText={setInput}
            placeholder={placeholder || 'Nhập tin nhắn...'}
            editable={!loading}
            multiline
            onSubmitEditing={() => sendMessage()}
          />
          <TouchableOpacity
            onPress={sendMessage}
            style={styles.sendButton}
            disabled={loading || !input.trim()}
          >
            <Text style={styles.sendButtonText}>{loading ? '...' : 'Gửi'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </React.Fragment>
  );
}

function renderMessage({ item }: { item: Message }) {
  const isUser = item.role === 'user';
  
  return (
    <View style={[styles.messageContainer, isUser ? styles.userMessage : styles.assistantMessage]}>
      <View style={styles.messageHeader}>
        <Text style={styles.messageIcon}>
          {item.role === 'assistant' ? (persona === 'customer' ? '🤖' : persona === 'worker' ? '🔧' : '🛡️') : '👤'}
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
  );
}

function renderAction(action: Action, index: number) {
  return (
    <TouchableOpacity 
      key={index} 
      style={styles.actionBadge}
      onPress={() => handleAction(action)}
      disabled={loading}
    >
      <Text style={styles.actionText}>{action.label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 28,
  },
  headerTitleText: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  headerRight: {
    padding: 8,
  },
  headerIcon: {
    fontSize: 18,
    color: '#9ca3af',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 20,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
  },
  imagePreviews: {
    flexDirection: 'row',
    padding: 8,
    gap: 8,
  },
  imagePreview: {
    position: 'relative',
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageDelete: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'red',
    borderRadius: 12,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageDeleteText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'column',
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  inputInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  imageButton: {
    padding: 10,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
  },
  imageButtonText: {
    fontSize: 18,
  },
  textInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 24,
    fontSize: 16,
  },
  sendButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#2563eb',
    borderRadius: 24,
  },
  sendButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});