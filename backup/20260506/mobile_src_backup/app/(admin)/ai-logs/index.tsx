// Admin AI Logs List
// Per Step 5: Mobile Foundation - AI usage monitoring dashboard
// Uses Supabase client, TanStack Query, Expo Router

import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// TypeScript type for AI Log
type AILog = {
  id: string;
  agent_type: string;
  input: any;
  output: any;
  tokens_used: number;
  cost: number;
  created_at: string;
  user_id: string;
};

export default function AdminAILogs() {
  const router = useRouter();

  // TanStack Query for data fetching with caching
  const { data: logs = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['admin-ai-logs'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return [];
      }

      // Call Edge Function to get AI logs (server-side with admin privileges)
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

  // Format cost to display in USD
  const formatCost = (cost: number) => {
    return `$${cost.toFixed(4)}`;
  };

  // Render each log item
  const renderLog = ({ item }: { item: AILog }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.agentType}>{item.agent_type}</Text>
          <Text style={styles.date}>
            {new Date(item.created_at).toLocaleDateString()} {new Date(item.created_at).toLocaleTimeString()}
          </Text>
        </View>
        <View style={styles.costBadge}>
          <Text style={styles.costText}>{formatCost(item.cost)}</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Tokens</Text>
          <Text style={styles.statValue}>{item.tokens_used || 0}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Cost</Text>
          <Text style={styles.statValue}>{formatCost(item.cost)}</Text>
        </View>
      </View>

      <View style={styles.inputPreview}>
        <Text style={styles.sectionLabel}>Input:</Text>
        <Text style={styles.previewText} numberOfLines={2}>
          {typeof item.input === 'string' ? item.input : JSON.stringify(item.input).substring(0, 100)}...
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
        <Text style={styles.headerTitle}>AI Logs</Text>
      </View>

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
            <Text style={styles.emptyText}>Chưa có AI logs</Text>
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
    padding: 20,
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
  },
  date: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  costBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  costText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#92400e',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  stat: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  inputPreview: {
    backgroundColor: '#f9fafb',
    padding: 8,
    borderRadius: 6,
  },
  sectionLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  previewText: {
    fontSize: 12,
    color: '#374151',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});
