// Admin Orders List
// Per Step 5: Mobile Foundation - Order management with customer/worker info
// Uses Supabase client, TanStack Query, Expo Router

import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// TypeScript type for Order from Supabase (with customer/worker info)
type Order = {
  id: string;
  customer_id: string;
  worker_id?: string;
  category: string;
  description: string;
  status: 'pending' | 'matched' | 'in_progress' | 'completed' | 'canceled' | 'disputed';
  created_at: string;
  final_price?: number;
  profiles?: { email: string };
  workers?: { profiles?: { email: string } };
};

export default function AdminOrders() {
  const router = useRouter();

  // TanStack Query for data fetching with caching
  const { data: orders = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return [];
      }

      // Call Edge Function to get orders with customer/worker info
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/admin-dashboard?action=orders`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch orders');
      const data = await response.json();
      return data.orders as Order[];
    },
  });

  // Get status color for badge
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#d1fae5';
      case 'in_progress': return '#dbeafe';
      case 'pending': return '#fef3c7';
      case 'disputed': return '#fee2e2';
      default: return '#f3f4f6';
    }
  };

  const getStatusTextColor = (status: string) => {
    switch (status) {
      case 'completed': return '#065f46';
      case 'in_progress': return '#1e40af';
      case 'pending': return '#92400e';
      case 'disputed': return '#991b1b';
      default: return '#374151';
    }
  };

  // Render each order item
  const renderOrder = ({ item }: { item: Order }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.category}>{item.category}</Text>
          <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={[styles.statusText, { color: getStatusTextColor(item.status) }]}>
            {item.status}
          </Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Khách hàng:</Text>
        <Text style={styles.infoValue}>{item.profiles?.email || 'N/A'}</Text>
      </View>

      {item.worker_id && (
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Thợ:</Text>
          <Text style={styles.infoValue}>{item.workers?.profiles?.email || 'N/A'}</Text>
        </View>
      )}

      <View style={styles.cardFooter}>
        <View>
          <Text style={styles.priceLabel}>Giá chốt</Text>
          <Text style={styles.price}>{item.final_price ? `$${item.final_price}` : 'Chưa có'}</Text>
        </View>
        <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
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
        <Text style={styles.headerTitle}>Quản lý Orders</Text>
      </View>

      <FlatList
        data={orders}
        renderItem={renderOrder}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
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
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginRight: 8,
    width: 80,
  },
  infoValue: {
    fontSize: 12,
    color: '#333',
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  priceLabel: {
    fontSize: 12,
    color: '#666',
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  date: {
    fontSize: 12,
    color: '#999',
  },
});
