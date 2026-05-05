// Admin AI Logs with Quality Metrics
// Per 12_OPERATIONS_AND_TRUST.md - Quality metrics dashboard
// Per Step 7: Trust & Quality - Show quality metrics

'use client';

import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface AILog {
  id: string;
  agent_type: string;
  input: any;
  output: any;
  created_at: string;
}

interface QualityMetrics {
  avg_rating: number;
  dispute_rate: number;
  completion_rate: number;
  total_orders: number;
  disputed_orders: number;
  completed_orders: number;
}

export default function AdminAILogs() {
  const router = useRouter();

  // Fetch AI logs
  const { data: logs = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['admin-ai-logs'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return [];
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/admin-dashboard?action=ai-logs`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch AI logs');
      const data = await response.json();
      return data.logs as AILog[];
    },
  });

  // Fetch quality metrics
  const { data: metrics } = useQuery({
    queryKey: ['quality-metrics'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;

      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

      // Get total orders
      const totalResponse = await fetch(
        `${supabaseUrl}/rest/v1/orders?select=count`,
        {
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Accept': 'application/json',
          },
        }
      );
      const totalData = await totalResponse.json();

      // Get completed orders
      const completedResponse = await fetch(
        `${supabaseUrl}/rest/v1/orders?status=eq.completed&select=count`,
        {
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Accept': 'application/json',
          },
        }
      );
      const completedData = await completedResponse.json();

      // Get disputed orders
      const disputedResponse = await fetch(
        `${supabaseUrl}/rest/v1/orders?status=eq.disputed&select=count`,
        {
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Accept': 'application/json',
          },
        }
      );
      const disputedData = await disputedResponse.json();

      // Get average rating
      const ratingResponse = await fetch(
        `${supabaseUrl}/rest/v1/orders?rating=not.is.null&select=rating`,
        {
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Accept': 'application/json',
          },
        }
      );
      const ratings = await ratingResponse.json();
      const avgRating = ratings.length > 0
        ? ratings.reduce((sum: number, r: any) => sum + r.rating, 0) / ratings.length
        : 0;

      const total = totalData.count || 0;
      const completed = completedData.count || 0;
      const disputed = disputedData.count || 0;

      return {
        avg_rating: avgRating,
        dispute_rate: total > 0 ? (disputed / total) * 100 : 0,
        completion_rate: total > 0 ? (completed / total) * 100 : 0,
        total_orders: total,
        disputed_orders: disputed,
        completed_orders: completed,
      } as QualityMetrics;
    },
  });

  const renderLog = ({ item }: { item: AILog }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.agentType}>{item.agent_type} Agent</Text>
          <Text style={styles.date}>
            {new Date(item.created_at).toLocaleString()}
          </Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.agent_type}</Text>
        </View>
      </View>

      <View style={styles.jsonContainer}>
        <Text style={styles.jsonLabel}>Input:</Text>
        <Text style={styles.jsonText} numberOfLines={3}>
          {JSON.stringify(item.input, null, 2)}
        </Text>
      </View>

      <View style={styles.jsonContainer}>
        <Text style={styles.jsonLabel}>Output:</Text>
        <Text style={styles.jsonText} numberOfLines={3}>
          {JSON.stringify(item.output, null, 2)}
        </Text>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AI Logs & Quality Metrics</Text>
      </View>

      {/* Quality Metrics Summary */}
      {metrics && (
        <View style={styles.metricsCard}>
          <Text style={styles.sectionTitle}>Quality Metrics</Text>
          
          <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{metrics.avg_rating.toFixed(1)}/5</Text>
              <Text style={styles.metricLabel}>Avg Rating</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={[styles.metricValue, { color: metrics.dispute_rate > 10 ? '#ef4444' : '#10b981' }]}>
                {metrics.dispute_rate.toFixed(1)}%
              </Text>
              <Text style={styles.metricLabel}>Dispute Rate</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={[styles.metricValue, { color: metrics.completion_rate > 80 ? '#10b981' : '#f59e0b' }]}>
                {metrics.completion_rate.toFixed(1)}%
              </Text>
              <Text style={styles.metricLabel}>Completion Rate</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{metrics.total_orders}</Text>
              <Text style={styles.metricLabel}>Total Orders</Text>
            </View>
          </View>
        </View>
      )}

      {/* AI Logs List */}
      <FlatList
        data={logs}
        renderItem={renderLog}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>No AI logs yet</Text>
          </View>
        }
      />
    </View>
  );
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
    backgroundColor: '#3b82f6',
    padding: 20,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  metricsCard: {
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricItem: {
    width: '45%',
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  list: {
    padding: 16,
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
    marginBottom: 12,
  },
  agentType: {
    fontSize: 16,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  date: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  badge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1e40af',
  },
  jsonContainer: {
    marginTop: 8,
  },
  jsonLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 4,
  },
  jsonText: {
    fontSize: 11,
    color: '#333',
    backgroundColor: '#f9fafb',
    padding: 8,
    borderRadius: 4,
    fontFamily: 'monospace',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});
