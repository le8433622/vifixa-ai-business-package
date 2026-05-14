// Worker AI Coach - Mobile
// Per user request: Complete mobile worker pages (AI Coach)

import { useState, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { LinearGradient } from 'expo-linear-gradient'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

type WorkerStats = {
  totalJobs: number
  completedJobs: number
  avgRating: number
  trustScore: number
  topCategory: string
}

export default function CoachScreen() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'assistant', 
      content: 'Xin chào! Tôi là AI Coach của Vifixa. Tôi có thể giúp bạn:\n\n• Phân tích hiệu suất làm việc\n• Gợi ý kỹ năng cần học\n• Dự đoán xu hướng việc làm\n• Tư vấn cách tăng điểm tin cậy\n• Tối ưu thu nhập 🚀\n\nBạn muốn hỏi gì?' 
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<WorkerStats | null>(null)
  const [revenueInsights, setRevenueInsights] = useState<any>(null)
  const [loadingRevenue, setLoadingRevenue] = useState(false)
  const [showRevenue, setShowRevenue] = useState(false)

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
      fetchStats(session.user.id)
    } catch (error: any) {
      console.error('checkUser error:', error)
    }
  }

  async function fetchStats(userId: string) {
    try {
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('category, status, rating')
        .eq('worker_id', userId)

      if (ordersError) throw ordersError

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('trust_score')
        .eq('id', userId)
        .single()

      if (profileError) throw profileError

      const totalJobs = orders?.length || 0
      const completedJobs = orders?.filter(o => o.status === 'completed').length || 0
      const ratings = orders?.filter(o => o.rating).map(o => o.rating) || []
      const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0
      
      const categoryCount: Record<string, number> = {}
      orders?.forEach(o => {
        categoryCount[o.category] = (categoryCount[o.category] || 0) + 1
      })
      const topCategory = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Chưa có'

      setStats({
        totalJobs,
        completedJobs,
        avgRating: Math.round(avgRating * 10) / 10,
        trustScore: profile?.trust_score || 0,
        topCategory,
      })
    } catch (error: any) {
      console.error('fetchStats error:', error)
    }
  }

  async function fetchRevenueInsights() {
    setLoadingRevenue(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/ai-worker-revenue`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ worker_id: session.user.id }),
      })
      if (res.ok) setRevenueInsights(await res.json())
    } catch { /* best-effort */ }
    finally { setLoadingRevenue(false); setShowRevenue(true) }
  }

  async function handlePriceNegotiation(orderId: string, estimatedPrice: number) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/ai-negotiate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, estimated_price: estimatedPrice, category: stats?.topCategory || 'general', description: 'Price negotiation from mobile' }),
      })
      if (res.ok) {
        const data = await res.json()
        Alert.alert('💰 Gợi ý giá', `Giá hợp lý: ${data.fair_price?.toLocaleString()}đ\nKhoảng: ${data.min_acceptable?.toLocaleString()}đ - ${data.max_suggested?.toLocaleString()}đ\n\n${data.reasoning || ''}`)
      }
    } catch { Alert.alert('Lỗi', 'Không thể thương lượng giá') }
  }

  async function sendMessage() {
    if (!input.trim()) return

    const userMessage = input.trim()
    setInput('')
    setLoading(true)

    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/ai-chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            { 
              role: 'system' as const, 
              content: `Bạn là AI Coach cho thợ sửa chữa tại Vifixa. Nhiệm vụ: Tư vấn thợ cách tăng hiệu suất, cải thiện dịch vụ, tăng điểm tin cậy.
              
Thông tin thợ:
- Tổng việc: ${stats?.totalJobs || 0}
- Việc hoàn thành: ${stats?.completedJobs || 0}
- Điểm trung bình: ${stats?.avgRating || 0}/5
- Điểm tin cậy: ${stats?.trustScore || 0}/100
- Chuyên môn chính: ${stats?.topCategory || 'Chưa có'}

Trả lời ngắn gọn, thực tế, chuyên nghiệp. Sử dụng tiếng Việt.` 
            },
            ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
            { role: 'user' as const, content: userMessage }
          ],
          session_id: `coach-${session.user.id}`,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Lỗi AI')
      }

      const data = await response.json()
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.message || 'Cảm ơn câu hỏi. Tôi sẽ phản hồi sớm.' 
      }])
    } catch (error: any) {
      console.error('sendMessage error:', error)
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Xin lỗi, tôi đang gặp sự cố kết nối. Vui lòng thử lại sau.' 
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🤖 AI Coach</Text>
        <Text style={styles.headerSubtitle}>Tư vấn và hỗ trợ thợ sửa chữa</Text>
      </LinearGradient>

      {/* Stats Overview */}
      {stats && (
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalJobs}</Text>
            <Text style={styles.statLabel}>Tổng việc</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#16a34a' }]}>{stats.completedJobs}</Text>
            <Text style={styles.statLabel}>Hoàn thành</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#ca8a04' }]}>{stats.avgRating}/5</Text>
            <Text style={styles.statLabel}>Đánh giá TB</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#7c3aed' }]}>{stats.trustScore}/100</Text>
            <Text style={styles.statLabel}>Điểm tin cậy</Text>
          </View>
        </View>
      )}

      {/* Chat Interface */}
      <View style={styles.chatContainer}>
        <ScrollView 
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
        >
          {messages.map((msg, index) => (
            <View
              key={index}
              style={[
                styles.messageBubble,
                msg.role === 'user' ? styles.userBubble : styles.assistantBubble
              ]}
            >
              <Text style={[styles.messageText, msg.role === 'user' && styles.userMessageText]}>
                {msg.content}
              </Text>
            </View>
          ))}
          {loading && (
            <View style={[styles.messageBubble, styles.assistantBubble]}>
              <View style={styles.loadingDots}>
                <View style={[styles.dot, { opacity: 0.4 }]} />
                <View style={[styles.dot, { opacity: 0.6, marginHorizontal: 4 }]} />
                <View style={[styles.dot, { opacity: 0.8 }]} />
              </View>
            </View>
      )}

      {/* Revenue Insights + Quick Actions */}
      {stats && (
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 }}>
          <TouchableOpacity onPress={fetchRevenueInsights} style={[styles.actionButton, { flex: 1, backgroundColor: '#059669', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, borderRadius: 10, gap: 6 }]}>
            <Text style={{ color: 'white', fontSize: 14, fontWeight: '600' }}>🚀</Text>
            <Text style={{ color: 'white', fontSize: 13, fontWeight: '600' }}>Phân tích thu nhập</Text>
          </TouchableOpacity>
        </View>
      )}

      {showRevenue && revenueInsights && (
        <View style={{ margin: 16, marginTop: 0, padding: 14, backgroundColor: '#ecfdf5', borderRadius: 12, borderWidth: 1, borderColor: '#a7f3d0' }}>
          <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#065f46', marginBottom: 8 }}>📊 Phân tích thu nhập</Text>
          <Text style={{ fontSize: 13, color: '#047857', marginBottom: 4 }}>Thu nhập: {revenueInsights.revenue?.total?.toLocaleString()}đ</Text>
          <Text style={{ fontSize: 13, color: '#047857', marginBottom: 4 }}>TB/đơn: {revenueInsights.revenue?.avg_per_job?.toLocaleString()}đ</Text>
          <Text style={{ fontSize: 13, color: '#047857', marginBottom: 4 }}>Giờ tốt nhất: {revenueInsights.insights?.best_hour || 'N/A'}</Text>
          <Text style={{ fontSize: 13, color: '#047857', marginBottom: 4 }}>Dịch vụ chính: {revenueInsights.insights?.best_category || 'N/A'}</Text>
          {revenueInsights.ai_recommendations?.quick_wins?.length > 0 && (
            <View style={{ marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#a7f3d0' }}>
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#065f46', marginBottom: 4 }}>Quick Wins:</Text>
              {revenueInsights.ai_recommendations.quick_wins.slice(0, 3).map((w: string, i: number) => (
                <Text key={i} style={{ fontSize: 12, color: '#047857', marginBottom: 2 }}>• {w}</Text>
              ))}
            </View>
          )}
          {revenueInsights.ai_recommendations?.monthly_projection && (
            <View style={{ marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#a7f3d0' }}>
              <Text style={{ fontSize: 12, color: '#065f46' }}>
                Dự báo: {revenueInsights.ai_recommendations.monthly_projection.current?.toLocaleString()}đ → 
                <Text style={{ fontWeight: 'bold' }}> {revenueInsights.ai_recommendations.monthly_projection.optimized?.toLocaleString()}đ</Text>
                {revenueInsights.ai_recommendations.monthly_projection.growth_pct && (
                  <Text style={{ color: '#16a34a' }}> (+{revenueInsights.ai_recommendations.monthly_projection.growth_pct}%)</Text>
                )}
              </Text>
            </View>
          )}
          <TouchableOpacity onPress={() => setShowRevenue(false)} style={{ marginTop: 8, alignItems: 'center' }}>
            <Text style={{ color: '#6b7280', fontSize: 12 }}>Đóng</Text>
          </TouchableOpacity>
        </View>
      )}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            value={input}
            onChangeText={setInput}
            onSubmitEditing={sendMessage}
            placeholder="Hỏi AI Coach..."
            style={styles.input}
            editable={!loading}
            multiline
          />
          <TouchableOpacity
            onPress={sendMessage}
            disabled={loading || !input.trim()}
            style={[styles.sendButton, (loading || !input.trim()) && styles.sendButtonDisabled]}
          >
            <Text style={styles.sendButtonText}>Gửi</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.inputHint}>
          Ví dụ: "Làm sao để tăng điểm tin cậy?"
        </Text>
      </View>

      {/* Quick Tips */}
      <View style={styles.tipsCard}>
        <Text style={styles.tipsTitle}>💡 Mẹo nhanh từ AI</Text>
        <View style={styles.tipsList}>
          <Text style={styles.tipItem}>• Điểm tin cậy ≥80 sẽ được ưu tiên nhận việc</Text>
          <Text style={styles.tipItem}>• Phản hồi nhanh trong 5 phút đầu tăng 30% cơ hội</Text>
          <Text style={styles.tipItem}>• Upload chứng chỉ kỹ năng để tăng uy tín</Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 24,
    paddingTop: 60,
  },
  backButton: {
    marginBottom: 8,
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 8,
  },
  statCard: {
    width: '48%',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  chatContainer: {
    flex: 1,
    margin: 16,
    marginTop: 0,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  messagesContainer: {
    flex: 1,
    padding: 16,
  },
  messagesContent: {
    gap: 12,
    paddingBottom: 8,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#3b82f6',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#f3f4f6',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    color: '#111827',
    lineHeight: 20,
  },
  userMessageText: {
    color: 'white',
  },
  loadingDots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6b7280',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    maxHeight: 80,
  },
  sendButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  inputHint: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'center',
  },
  tipsCard: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 8,
  },
  tipsList: {
    gap: 6,
  },
  tipItem: {
    fontSize: 12,
    color: '#1e40af',
    lineHeight: 18,
  },
})
