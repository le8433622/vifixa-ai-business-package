// Worker Job History - Mobile
// Per user request: Complete mobile worker pages

import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, FlatList, Alert, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { LinearGradient } from 'expo-linear-gradient'

type Job = {
  id: string
  category: string
  description: string
  status: 'pending' | 'matched' | 'in_progress' | 'completed' | 'cancelled' | 'disputed'
  created_at: string
  completed_at?: string
  estimated_price: number
  actual_price?: number
  rating?: number
  feedback?: string
}

export default function HistoryScreen() {
  const router = useRouter()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'completed' | 'cancelled'>('all')

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
      fetchJobs()
    } catch (error: any) {
      console.error('checkUser error:', error)
    }
  }

  async function fetchJobs() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('worker_id', session.user.id)
        .in('status', ['completed', 'cancelled'])
        .order('completed_at', { ascending: false, nullsFirst: false })

      if (error) throw error
      setJobs(data as Job[])
    } catch (error: any) {
      console.error('fetchJobs error:', error)
      Alert.alert('Lỗi', error.message)
    } finally {
      setLoading(false)
    }
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

  function formatPrice(price: number | undefined) {
    if (!price && price !== 0) return '—'
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price)
  }

  function renderStars(rating?: number) {
    if (!rating) return <Text style={styles.noRating}>Chưa đánh giá</Text>
    return (
      <Text style={styles.stars}>
        {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
      </Text>
    )
  }

  const filteredJobs = jobs.filter(job => {
    if (filter === 'all') return true
    return job.status === filter
  })

  const totalEarnings = filteredJobs
    .filter(j => j.status === 'completed')
    .reduce((sum, j) => sum + (j.actual_price || j.estimated_price || 0), 0)

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.header}>
        <Text style={styles.headerTitle}>📋 Lịch sử công việc</Text>
        <Text style={styles.headerSubtitle}>
          {filteredJobs.length} việc • {formatPrice(totalEarnings)}
        </Text>
      </LinearGradient>

      {/* Filters */}
      <View style={styles.filterContainer}>
        {(['all', 'completed', 'cancelled'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterButton, filter === f && styles.filterButtonActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' ? 'Tất cả' : f === 'completed' ? 'Hoàn thành' : 'Đã hủy'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredJobs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/(worker)/jobs/${item.id}`)}
          >
            <View style={styles.cardHeader}>
              <View style={styles.categoryRow}>
                <Text style={styles.categoryIcon}>{getCategoryIcon(item.category)}</Text>
                <Text style={styles.category}>{item.category}</Text>
              </View>
              <View style={[styles.statusBadge, { 
                backgroundColor: item.status === 'completed' ? '#d1fae5' : '#f3f4f6' 
              }]}>
                <Text style={[styles.statusText, { 
                  color: item.status === 'completed' ? '#065f46' : '#374151' 
                }]}>
                  {item.status === 'completed' ? 'Hoàn thành' : 'Đã hủy'}
                </Text>
              </View>
            </View>

            <Text style={styles.description} numberOfLines={2}>{item.description}</Text>

            <View style={styles.cardFooter}>
              <View>
                <Text style={styles.date}>
                  {item.completed_at 
                    ? new Date(item.completed_at).toLocaleDateString('vi-VN')
                    : new Date(item.created_at).toLocaleDateString('vi-VN')
                  }
                </Text>
                {renderStars(item.rating)}
              </View>
              <Text style={styles.price}>
                {formatPrice(item.actual_price || item.estimated_price)}
              </Text>
            </View>

            {item.feedback && (
              <View style={styles.feedbackBox}>
                <Text style={styles.feedbackText}>"{item.feedback}"</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>Chưa có lịch sử công việc</Text>
          </View>
        }
      />
    </View>
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
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'white',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  filterText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  filterTextActive: {
    color: 'white',
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryIcon: {
    fontSize: 24,
  },
  category: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  date: {
    fontSize: 12,
    color: '#9ca3af',
  },
  stars: {
    fontSize: 14,
    color: '#fbbf24',
    marginTop: 4,
  },
  noRating: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#16a34a',
  },
  feedbackBox: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  feedbackText: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
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
    fontSize: 16,
    color: '#6b7280',
  },
})
