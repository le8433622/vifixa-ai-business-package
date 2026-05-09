// Worker Earnings - Mobile
// Per user request: Complete mobile worker pages

import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { LinearGradient } from 'expo-linear-gradient'

type EarningsData = {
  today: number
  thisWeek: number
  thisMonth: number
  total: number
  pending: number
  jobs: {
    id: string
    category: string
    completed_at: string
    created_at?: string
    actual_price: number
  }[]
}

export default function EarningsScreen() {
  const router = useRouter()
  const [earnings, setEarnings] = useState<EarningsData>({
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    total: 0,
    pending: 0,
    jobs: [],
  })
  const [loading, setLoading] = useState(true)
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'all'>('month')

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
      fetchEarnings(session.user.id)
    } catch (error: any) {
      console.error('checkUser error:', error)
    }
  }

  async function fetchEarnings(userId: string) {
    try {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, category, completed_at, created_at, actual_price, estimated_price, status')
        .eq('worker_id', userId)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })

      if (error) throw error

      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())

      let total = 0
      let thisMonth = 0
      let thisWeek = 0
      let todayEarnings = 0
      let pending = 0

      const jobs = (orders || []).map(order => {
        const price = order.actual_price || order.estimated_price || 0
        total += price
        
        const completedDate = new Date(order.completed_at || new Date().toISOString())
        
        if (completedDate >= monthAgo) {
          thisMonth += price
        }
        if (completedDate >= weekAgo) {
          thisWeek += price
        }
        if (completedDate >= today) {
          todayEarnings += price
        }

        return {
          id: order.id,
          category: order.category,
          completed_at: order.completed_at || order.created_at,
          actual_price: price,
        }
      })

      // Fetch pending payments
      const { data: pendingJobs } = await supabase
        .from('orders')
        .select('estimated_price')
        .eq('worker_id', userId)
        .eq('status', 'in_progress')

      pending = (pendingJobs || []).reduce((sum, job) => sum + (job.estimated_price || 0), 0)

      setEarnings({
        today: todayEarnings,
        thisWeek,
        thisMonth,
        total,
        pending,
        jobs: jobs.filter(job => {
          const completedDate = new Date(job.completed_at)
          if (timeframe === 'week') return completedDate >= weekAgo
          if (timeframe === 'month') return completedDate >= monthAgo
          return true
        }),
      })
    } catch (error: any) {
      console.error('fetchEarnings error:', error)
      Alert.alert('Lỗi', error.message)
    } finally {
      setLoading(false)
    }
  }

  function formatPrice(price: number) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price)
  }

  function getCategoryIcon(category: string) {
    const icons: Record<string, string> = {
      'air_conditioning': '❄️',
      'plumbing': '🚿',
      'electricity': '🔌',
      'camera': '📷',
      'general': '🔧',
    }
    return icons[category] || '🔧'
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    )
  }

  return (
    <ScrollView style={styles.container}>
      <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.header}>
        <Text style={styles.headerTitle}>💰 Thu nhập</Text>
        <Text style={styles.headerSubtitle}>Quản lý thu nhập từ công việc</Text>
      </LinearGradient>

      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Hôm nay</Text>
          <Text style={[styles.statValue, styles.greenText]}>{formatPrice(earnings.today)}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Tuần này</Text>
          <Text style={[styles.statValue, styles.blueText]}>{formatPrice(earnings.thisWeek)}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Tháng này</Text>
          <Text style={[styles.statValue, styles.purpleText]}>{formatPrice(earnings.thisMonth)}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Tổng thu nhập</Text>
          <Text style={[styles.statValue, styles.grayText]}>{formatPrice(earnings.total)}</Text>
        </View>
      </View>

      {/* Pending */}
      {earnings.pending > 0 && (
        <TouchableOpacity
          style={styles.pendingCard}
          onPress={() => router.push('/(worker)/jobs' as any)}
        >
          <Text style={styles.pendingIcon}>💰</Text>
          <View style={styles.pendingContent}>
            <Text style={styles.pendingTitle}>Tiền đang chờ</Text>
            <Text style={styles.pendingAmount}>{formatPrice(earnings.pending)}</Text>
          </View>
          <Text style={styles.pendingArrow}>→</Text>
        </TouchableOpacity>
      )}

      {/* Time Filter */}
      <View style={styles.filterContainer}>
        {(['week', 'month', 'all'] as const).map((tf) => (
          <TouchableOpacity
            key={tf}
            style={[styles.filterButton, timeframe === tf && styles.filterActive]}
            onPress={() => setTimeframe(tf)}
          >
            <Text style={[styles.filterText, timeframe === tf && styles.filterTextActive]}>
              {tf === 'week' ? '7 ngày' : tf === 'month' ? '30 ngày' : 'Tất cả'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Jobs List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Chi tiết thu nhập ({earnings.jobs.length} việc)</Text>
        
        {earnings.jobs.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>💰</Text>
            <Text style={styles.emptyText}>Chưa có thu nhập trong khoảng này</Text>
          </View>
        ) : (
          earnings.jobs.map((job) => (
            <TouchableOpacity
              key={job.id}
              style={styles.jobCard}
              onPress={() => router.push(`/(worker)/jobs/${job.id}` as any)}
            >
              <View style={styles.jobRow}>
                <Text style={styles.jobIcon}>{getCategoryIcon(job.category)}</Text>
                <View style={styles.jobInfo}>
                  <Text style={styles.jobCategory}>{job.category}</Text>
                  <Text style={styles.jobDate}>
                    {new Date(job.completed_at).toLocaleDateString('vi-VN')}
                  </Text>
                </View>
                <View style={styles.jobPrice}>
                  <Text style={styles.priceText}>+{formatPrice(job.actual_price)}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 24,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
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
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  greenText: { color: '#16a34a' },
  blueText: { color: '#2563eb' },
  purpleText: { color: '#7c3aed' },
  grayText: { color: '#111827' },
  pendingCard: {
    backgroundColor: '#fef3c7',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pendingIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  pendingContent: {
    flex: 1,
  },
  pendingTitle: {
    fontSize: 14,
    color: '#92400e',
    fontWeight: '500',
  },
  pendingAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#92400e',
    marginTop: 2,
  },
  pendingArrow: {
    fontSize: 20,
    color: '#92400e',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  filterText: {
    fontSize: 12,
    color: '#374151',
  },
  filterTextActive: {
    color: 'white',
  },
  section: {
    padding: 16,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
  },
  jobCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  jobRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  jobIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  jobInfo: {
    flex: 1,
  },
  jobCategory: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  jobDate: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  jobPrice: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#16a34a',
  },
})
