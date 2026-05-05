// Admin Disputes List
// Per 05_PRODUCT_SOLUTION.md - Admin flow: Handle disputes
// Per Step 5: Mobile Foundation with TanStack Query

import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface Dispute {
  id: string;
  category: string;
  description: string;
  status: string;
  customer_email?: string;
  created_at: string;
}

export default function AdminDisputes() {
  const router = useRouter();

  const { data: disputes = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['admin-disputes'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return [];
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/admin-dashboard?action=disputes`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch disputes');
      const data = await response.json();
      return data.disputes as Dispute[];
    },
  });

  const renderDispute = ({ item }: { item: Dispute }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.category}>{item.category}</Text>
          <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
        </View>
        <View style={styles.disputeBadge}>
          <Text style={styles.disputeText}>DISPUTED</Text>
        </View>
      </View>

      <Text style={styles.email}>Customer: {item.customer_email || 'Unknown'}</Text>
      <Text style={styles.date}>
        {new Date(item.created_at).toLocaleDateString()}
      </Text>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.completeButton}
          onPress={() => handleResolve(item.id, 'complete')}
        >
          <Text style={styles.buttonText}>Complete</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.refundButton}
          onPress={() => handleResolve(item.id, 'refund')}
        >
          <Text style={styles.buttonText}>Refund</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  async function handleResolve(orderId: string, action: 'complete' | 'refund') {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const newStatus = action === 'complete' ? 'completed' : 'canceled';

      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;
      refetch();
      alert(`Dispute ${action === 'complete' ? 'resolved - order completed' : 'resolved - order refunded'}`);
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  }

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
        <Text style={styles.headerTitle}>Disputes</Text>
      </View>

      <FlatList
        data={disputes}
        renderItem={renderDispute}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>No disputes currently</Text>
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
    marginBottom: 12,
  },
  category: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  disputeBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  disputeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#991b1b',
  },
  email: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
    color: '#999',
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  completeButton: {
    flex: 1,
    backgroundColor: '#10b981',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  refundButton: {
    flex: 1,
    backgroundColor: '#ef4444',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});
