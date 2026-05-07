// Customer Dashboard - AI-Centric Design
// Per user request: AI as centerpiece, form as foundation

import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

type Order = {
  id: string;
  category: string;
  description: string;
  status: 'pending' | 'matched' | 'in_progress' | 'completed' | 'cancelled' | 'disputed';
  estimated_price: number;
  created_at: string;
};

type Device = {
  id: string;
  device_type: string;
  brand?: string;
  model?: string;
  purchase_date?: string;
};

type ServiceCategory = {
  id: string;
  name: string;
  icon: string;
  desc: string;
};

export default function CustomerDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const CATEGORIES: ServiceCategory[] = [
    { id: 'air_conditioning', name: 'Máy lạnh', icon: '❄️', desc: 'Sửa, lắp, vệ sinh' },
    { id: 'electricity', name: 'Điện nước', icon: '💡', desc: 'Sửa điện, nước' },
    { id: 'plumbing', name: 'Nước rò rỉ', icon: '🚿', desc: 'Thông tắc, sửa ống' },
    { id: 'camera', name: 'Camera', icon: '📷', desc: 'Lắp đặt camera' },
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

  // Devices query
  const { data: devices = [] } = useQuery({
    queryKey: ['customer-devices-preview'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];

      const { data, error } = await supabase
        .from('device_profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .limit(3);

      if (error) return [];
      return data as Device[];
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
      {/* Hero Section - AI Chat CTA */}
      <View style={styles.hero}>
        <Text style={styles.heroEmoji}>💬</Text>
        <Text style={styles.heroTitle}>Chat với AI</Text>
        <Text style={styles.heroSubtitle}>Đặt dịch vụ thông minh</Text>
        <TouchableOpacity
          style={styles.heroButton}
          onPress={() => router.push('/(customer)/chat')}
        >
          <Text style={styles.heroButtonText}>💬 Bắt đầu chat ngay</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push('/(customer)/service-request')}
        >
          <Text style={styles.secondaryButtonText}>📝 Dùng form cũ</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
        <View style={styles.grid}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={styles.card}
              onPress={() => router.push('/(customer)/chat')}
            >
              <Text style={styles.cardIcon}>{cat.icon}</Text>
              <Text style={styles.cardText}>{cat.name}</Text>
              <Text style={styles.cardDesc}>{cat.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Recent Orders */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>📋 Đơn hàng gần đây</Text>
          <TouchableOpacity onPress={() => router.push('/(customer)/orders')}>
            <Text style={styles.viewAll}>Xem tất cả</Text>
          </TouchableOpacity>
        </View>

        {recentOrders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Chưa có đơn hàng nào</Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => router.push('/(customer)/chat')}
            >
              <Text style={styles.createButtonText}>💬 Chat với AI để đặt dịch vụ</Text>
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

      {/* Devices Preview */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🔧 Thiết bị của tôi</Text>
          <TouchableOpacity onPress={() => router.push('/(customer)/devices')}>
            <Text style={styles.viewAll}>Xem tất cả</Text>
          </TouchableOpacity>
        </View>

        {devices.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Chưa có thiết bị nào</Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => router.push('/(customer)/devices')}
            >
              <Text style={styles.createButtonText}>+ Thêm thiết bị đầu tiên</Text>
            </TouchableOpacity>
          </View>
        ) : (
          devices.map((device) => (
            <TouchableOpacity
              key={device.id}
              style={styles.deviceCard}
              onPress={() => router.push('/(customer)/devices')}
            >
              <Text style={styles.deviceIcon}>🔧</Text>
              <View style={styles.deviceInfo}>
                <Text style={styles.deviceName}>{device.brand} {device.model}</Text>
                {device.purchase_date && (
                  <Text style={styles.deviceDate}>Mua: {new Date(device.purchase_date).toLocaleDateString()}</Text>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Footer Links */}
      <View style={styles.footer}>
        <TouchableOpacity onPress={() => router.push('/(customer)/chat')}>
          <Text style={styles.footerLink}>💬 Chat AI</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/(customer)/service-request')}>
          <Text style={styles.footerLink}>📝 Form cũ</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/(customer)/profile')}>
          <Text style={styles.footerLink}>👤 Tài khoản</Text>
        </TouchableOpacity>
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
  // Hero Section
  hero: {
    backgroundColor: '#3b82f6',
    padding: 24,
    paddingTop: 60,
    alignItems: 'center',
  },
  heroEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 20,
  },
  heroButton: {
    backgroundColor: 'white',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 8,
    width: '100%',
    alignItems: 'center',
  },
  heroButtonText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    width: '100%',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: 'white',
    fontSize: 14,
  },
  // Sections
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
  // Grid
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
  cardDesc: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
  },
  // Orders
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
  // Devices
  deviceCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deviceIcon: {
    fontSize: 24,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  deviceDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  // Empty state
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
  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  footerLink: {
    color: '#3b82f6',
    fontSize: 14,
  },
});
