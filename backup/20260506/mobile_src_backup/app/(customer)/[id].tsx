// Customer Order Detail
// Per 05_PRODUCT_SOLUTION.md - Customer flow: Track order, view AI diagnosis, accept/reject price
// Uses: TanStack Query, Supabase Realtime (optional), Expo Router

import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, Image } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// TypeScript type for Order
type Order = {
  id: string;
  category: string;
  description: string;
  status: 'pending' | 'matched' | 'in_progress' | 'completed' | 'canceled' | 'disputed';
  estimated_price: number;
  final_price?: number;
  ai_diagnosis?: any;
  before_media?: string[];
  after_media?: string[];
  created_at: string;
  workers?: { user_id: string; profiles?: { email: string } };
};

export default function CustomerOrderDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  // TanStack Query for order details
  const { data: order, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['customer-order', id],
    queryFn: async () => {
      if (!id) throw new Error('Order ID not found');
      
      const { data, error } = await supabase
        .from('orders')
        .select('*, workers(user_id, profiles(email))')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Order;
    },
    enabled: !!id,
  });

  // Accept price (optimistic update)
  async function acceptPrice() {
    if (!order) return;
    
    Alert.alert(
      'Accept Price',
      `Accept estimated price of $${order.estimated_price}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              // Optimistic update
              queryClient.setQueryData(['customer-order', id], (old: any) => ({
                ...old,
                status: 'matched',
              }));

              const { error } = await supabase
                .from('orders')
                .update({ status: 'matched' })
                .eq('id', id);

              if (error) throw error;
              refetch();
              Alert.alert('Success', 'Price accepted! Worker will be assigned soon.');
            } catch (error: any) {
              Alert.alert('Error', error.message);
              refetch(); // Rollback
            }
          },
        },
      ]
    );
  }

  // Reject price - request new quote
  async function rejectPrice() {
    Alert.alert(
      'Reject Price',
      'Request a new quote with different requirements?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request New Quote',
          onPress: () => {
            router.push('/(customer)/service-request');
          },
        },
      ]
    );
  }

  // Get status message
  const getStatusMessage = (status: string, order: Order) => {
    switch (status) {
      case 'pending':
        return order.ai_diagnosis 
          ? 'AI diagnosis complete. Waiting for your price confirmation...'
          : 'Waiting for AI diagnosis...';
      case 'matched':
        return 'Worker assigned! They will arrive soon.';
      case 'in_progress':
        return 'Worker is handling your issue...';
      case 'completed':
        return 'Job completed! Please confirm and rate.';
      case 'disputed':
        return 'Dispute in progress. Admin will review.';
      default:
        return 'Status unknown';
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#d1fae5';
      case 'in_progress': return '#dbeafe';
      case 'pending': return '#fef3c7';
      case 'disputed': return '#fee2e2';
      default: return '#f3f4f6';
    }
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Không tìm thấy đơn hàng</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết đơn hàng</Text>
      </View>

      {/* Status Section */}
      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
        <Text style={styles.statusText}>{order.status}</Text>
        <Text style={styles.statusMessage}>{getStatusMessage(order.status, order)}</Text>
      </View>

      {/* Order Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Thông tin đơn hàng</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>Danh mục:</Text>
          <Text style={styles.value}>{order.category}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Mô tả:</Text>
          <Text style={styles.value}>{order.description}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Ngày tạo:</Text>
          <Text style={styles.value}>{new Date(order.created_at).toLocaleDateString()}</Text>
        </View>
      </View>

      {/* AI Diagnosis */}
      {order.ai_diagnosis && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chẩn đoán AI</Text>
          <View style={styles.aiCard}>
            <Text style={styles.aiLabel}>Chẩn đoán:</Text>
            <Text style={styles.aiValue}>{order.ai_diagnosis.diagnosis}</Text>
            
            <Text style={[styles.aiLabel, { marginTop: 8 }]}>Mức độ:</Text>
            <View style={[styles.severityBadge, 
              order.ai_diagnosis.severity === 'emergency' ? styles.severityEmergency :
              order.ai_diagnosis.severity === 'high' ? styles.severityHigh :
              order.ai_diagnosis.severity === 'medium' ? styles.severityMedium :
              styles.severityLow
            ]}>
              <Text style={styles.severityText}>{order.ai_diagnosis.severity}</Text>
            </View>

            <Text style={[styles.aiLabel, { marginTop: 8 }]}>Kỹ năng cần:</Text>
            <Text style={styles.aiValue}>{order.ai_diagnosis.recommended_skills?.join(', ')}</Text>
          </View>
        </View>
      )}

      {/* Price Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Giá cả</Text>
        <View style={styles.priceCard}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Giá dự kiến:</Text>
            <Text style={styles.estimatedPrice}>${order.estimated_price}</Text>
          </View>

          {order.final_price && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Giá cuối cùng:</Text>
              <Text style={styles.finalPrice}>${order.final_price}</Text>
            </View>
          )}
        </View>

        {/* Accept/Reject Price Actions */}
        {order.status === 'pending' && order.ai_diagnosis && (
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.actionButton, styles.acceptButton]} onPress={acceptPrice}>
              <Text style={styles.actionButtonText}>Chấp nhận giá</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.rejectButton]} onPress={rejectPrice}>
              <Text style={styles.actionButtonText}>Từ chối</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Worker Info */}
      {order.workers && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thợ đang thực hiện</Text>
          <View style={styles.workerCard}>
            <Text style={styles.workerEmail}>{order.workers.profiles?.email}</Text>
          </View>
        </View>
      )}

      {/* Media (Before/After Photos) */}
      {order.before_media && order.before_media.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ảnh trước khi sửa</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {order.before_media.map((uri: string, index: number) => (
              <Image key={index} source={{ uri }} style={styles.mediaImage} />
            ))}
          </ScrollView>
        </View>
      )}

      {order.after_media && order.after_media.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ảnh sau khi sửa</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {order.after_media.map((uri: string, index: number) => (
              <Image key={index} source={{ uri }} style={styles.mediaImage} />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Complete Order Button */}
      {order.status === 'completed' && (
        <TouchableOpacity
          style={styles.completeButton}
          onPress={() => router.push(`/(customer)/orders/${order.id}/review`)}
        >
          <Text style={styles.completeButtonText}>Đánh giá & Xác nhận</Text>
        </TouchableOpacity>
      )}
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
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    marginBottom: 16,
  },
  header: {
    backgroundColor: '#3b82f6',
    padding: 20,
    paddingTop: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  statusBadge: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 18,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  statusMessage: {
    fontSize: 14,
    color: '#333',
    fontStyle: 'italic',
  },
  section: {
    margin: 16,
    marginTop: 0,
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
  infoRow: {
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  value: {
    fontSize: 16,
    color: '#333',
  },
  aiCard: {
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  aiLabel: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: 'bold',
  },
  aiValue: {
    fontSize: 14,
    color: '#1e40af',
    marginTop: 4,
  },
  severityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  severityText: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  severityEmergency: {
    backgroundColor: '#fee2e2',
  },
  severityHigh: {
    backgroundColor: '#fed7aa',
  },
  severityMedium: {
    backgroundColor: '#fef3c7',
  },
  severityLow: {
    backgroundColor: '#d1fae5',
  },
  priceCard: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
  },
  estimatedPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  finalPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10b981',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#10b981',
  },
  rejectButton: {
    backgroundColor: '#ef4444',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  workerCard: {
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  workerEmail: {
    fontSize: 14,
    color: '#166534',
  },
  mediaImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 8,
  },
  completeButton: {
    margin: 16,
    marginTop: 0,
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  completeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
