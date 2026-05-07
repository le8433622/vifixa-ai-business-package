// Worker Dashboard
// Per 05_PRODUCT_SOLUTION.md - Worker flow: View jobs, earnings summary
// Uses: TanStack Query, Supabase, Expo Router

import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// TypeScript types
type Job = {
  id: string;
  category: string;
  description: string;
  status: 'pending' | 'matched' | 'in_progress' | 'completed' | 'canceled' | 'disputed';
  estimated_price: number;
  created_at: string;
};

type Earnings = {
  total_earnings: number;
  completed_jobs: number;
  avg_earnings: number;
  trust_score: number;
};

export default function WorkerDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // TanStack Query for active jobs
  const { data: activeJobs = [], isLoading: jobsLoading, refetch: refetchJobs } = useQuery({
    queryKey: ['worker-active-jobs'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return [];
      }

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('worker_id', session.user.id)
        .in('status', ['matched', 'in_progress'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Job[];
    },
  });

  // TanStack Query for earnings
  const { data: earnings, isLoading: earningsLoading } = useQuery({
    queryKey: ['worker-earnings'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;

      // Call Edge Function for earnings
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/worker-jobs?action=earnings`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) return null;
      const data = await response.json();
      return data as Earnings;
    },
  });

  const isLoading = jobsLoading || earningsLoading;

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={false} onRefresh={refetchJobs} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Việc làm của tôi</Text>
      </View>

      {/* Earnings Summary */}
      <View style={styles.earningsCard}>
        <View style={styles.earningsRow}>
          <View style={styles.earningItem}>
            <Text style={styles.earningValue}>${earnings?.total_earnings || 0}</Text>
            <Text style={styles.earningLabel}>Tổng thu nhập</Text>
          </View>
          <View style={styles.earningItem}>
            <Text style={styles.earningValue}>{earnings?.completed_jobs || 0}</Text>
            <Text style={styles.earningLabel}>Việc đã làm</Text>
          </View>
        </View>
        <View style={styles.earningsRow}>
          <View style={styles.earningItem}>
            <Text style={styles.earningValue}>${earnings?.avg_earnings || 0}</Text>
            <Text style={styles.earningLabel}>Thu nhập TB</Text>
          </View>
          <View style={styles.earningItem}>
            <Text style={[styles.earningValue, { color: '#3b82f6' }]}>{earnings?.trust_score || 50}</Text>
            <Text style={styles.earningLabel}>Điểm uy tín</Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/(worker)/jobs')}
        >
          <Text style={styles.actionButtonText}>Xem tất cả việc làm</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={() => router.push('/(worker)/earnings')}
        >
          <Text style={[styles.actionButtonText, { color: '#3b82f6' }]}>Chi tiết thu nhập</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={() => router.push('/(worker)/profile')}
        >
          <Text style={[styles.actionButtonText, { color: '#3b82f6' }]}>Cập nhật hồ sơ</Text>
        </TouchableOpacity>
      </View>

      {/* Active Jobs */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Việc đang làm</Text>
        
        {activeJobs.length === 0 ? (
          <Text style={styles.emptyText}>Chưa có việc làm nào đang hoạt động</Text>
        ) : (
          activeJobs.map((job) => (
            <TouchableOpacity
              key={job.id}
              style={styles.jobCard}
              onPress={() => router.push(`/(worker)/${job.id}`)}
            >
              <View style={styles.jobHeader}>
                <Text style={styles.jobCategory}>{job.category}</Text>
                <View style={[styles.statusBadge, getStatusColor(job.status)]}>
                  <Text style={styles.statusText}>{job.status}</Text>
                </View>
              </View>
              <Text style={styles.jobDescription} numberOfLines={2}>{job.description}</Text>
              <View style={styles.jobFooter}>
                <Text style={styles.jobPrice}>${job.estimated_price}</Text>
                <Text style={styles.jobDate}>{new Date(job.created_at).toLocaleDateString()}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'in_progress': return { backgroundColor: '#dbeafe' };
    case 'matched': return { backgroundColor: '#fef3c7' };
    default: return { backgroundColor: '#f3f4f6' };
  }
};

const getStatusTextColor = (status: string) => {
  switch (status) {
    case 'in_progress': return '#1e40af';
    case 'matched': return '#92400e';
    default: return '#374151';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    paddingBottom: 32,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#3b82f6',
    padding: 20,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  earningsCard: {
    margin: 16,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  earningsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  earningItem: {
    alignItems: 'center',
  },
  earningValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10b981',
  },
  earningLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  actionButton: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  secondaryButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 12,
  },
  jobCard: {
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
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  jobCategory: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  jobDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  jobPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  jobDate: {
    fontSize: 12,
    color: '#999',
  },
});
