// Customer Dashboard
// Per 05_PRODUCT_SOLUTION.md - Customer flow: Quick actions, recent orders
// Uses: TanStack Query, Supabase, Expo Router

import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

type Order = {
  id: string;
  category: string;
  description: string;
  status: 'pending' | 'matched' | 'in_progress' | 'completed' | 'canceled' | 'disputed';
  estimated_price: number;
  created_at: string;
};

type ServiceCategory = {
  id: string;
  name: string;
  icon: string;
};

export default function CustomerDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const CATEGORIES: ServiceCategory[] = [
    { id: 'electricity', name: 'Điện lạnh', icon: '❄️' },
    { id: 'plumbing', name: 'Điện nước', icon: '🚿' },
    { id: 'appliance', name: 'Điện gia dụng', icon: '🔌' },
    { id: 'camera', name: 'Camera/Khóa', icon: '📷' },
  ];

  // TanStack Query for recent orders
  const { data: recentOrders = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['customer-recent-orders'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return [];
      }

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data as Order[];
    },
  });

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
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Vifixa AI</Text>
        <Text style={styles.headerSubtitle}>Dịch vụ thông minh cho đời sống thật</Text>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dịch vụ phổ biến</Text>
        <View style={styles.grid}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={styles.card}
              onPress={() => router.push({
                pathname: '/(customer)/service-request',
                params: { category: cat.id }
              })}
            >
              <Text style={styles.cardIcon}>{cat.icon}</Text>
              <Text style={styles.cardText}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Recent Orders */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Đơn hàng gần đây</Text>
          <TouchableOpacity onPress={() => router.push('/(customer)/orders')}>
            <Text style={styles.viewAll}>Xem tất cả</Text>
          </TouchableOpacity>
        </View>

        {recentOrders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Chưa có đơn hàng nào</Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => router.push('/(customer)/service-request')}
            >
              <Text style={styles.createButtonText}>Tạo yêu cầu dịch vụ</Text>
            </TouchableOpacity>
          </View>
        ) : (
          recentOrders.map((order) => (
            <TouchableOpacity
              key={order.id}
              style={styles.orderCard}
              onPress={() => router.push(`/(customer)/${order.id}`)}
            >
              <View style={styles.orderHeader}>
                <Text style={styles.orderCategory}>{order.category}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
                  <Text style={[styles.statusText, { color: getStatusTextColor(order.status) }]}>
                    {order.status}
                  </Text>
                </View>
              </View>
              <Text style={styles.orderDescription} numberOfLines={2}>{order.description}</Text>
              <View style={styles.orderFooter}>
                <Text style={styles.orderPrice}>${order.estimated_price}</Text>
                <Text style={styles.orderDate}>{new Date(order.created_at).toLocaleDateString()}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}

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
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  viewAll: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: 'bold',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: '45%',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  cardText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  emptyCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 12,
  },
  createButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  orderCard: {
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
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderCategory: {
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
  },
  orderDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  orderDate: {
    fontSize: 12,
    color: '#999',
  },
});
