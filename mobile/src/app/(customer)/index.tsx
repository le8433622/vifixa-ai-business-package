import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';

type Order = {
  id: string; category: string; description: string;
  status: string; estimated_price: number; created_at: string;
};

type Device = {
  id: string; device_type: string; brand?: string; model?: string; purchase_date?: string;
};

const CATEGORIES = [
  { id: 'air_conditioning', name: 'Máy lạnh', icon: '❄️' },
  { id: 'electricity', name: 'Điện nước', icon: '💡' },
  { id: 'plumbing', name: 'Nước rò rỉ', icon: '🚿' },
  { id: 'camera', name: 'Camera', icon: '📷' },
];

export default function CustomerDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['customer-orders'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return []; }
      const { data } = await supabase.from('orders').select('*').eq('customer_id', session.user.id)
        .order('created_at', { ascending: false }).limit(5);
      return data as Order[];
    },
  });

  const { data: devices = [] } = useQuery({
    queryKey: ['customer-devices'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];
      const { data } = await supabase.from('device_profiles').select('*').eq('user_id', session.user.id).limit(3);
      return data as Device[];
    },
  });

  const activeOrders = orders.filter(o => ['pending', 'matched', 'in_progress'].includes(o.status));
  const completedCount = orders.filter(o => o.status === 'completed').length;
  const totalSpent = orders.reduce((s, o) => s + (o.estimated_price || 0), 0);

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#3b82f6" /></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* AI Hero */}
      <View style={styles.hero}>
        <Text style={styles.heroEmoji}>💬</Text>
        <Text style={styles.heroTitle}>AI Companion</Text>
        <Text style={styles.heroSubtitle}>Nói với tôi như người bạn trong nhà</Text>

        {/* Mode Toggle */}
        <View style={styles.modeToggle}>
          <TouchableOpacity style={[styles.modeBtn, mode === 'auto' && styles.modeActive]}
            onPress={() => setMode('auto')}>
            <Text style={[styles.modeText, mode === 'auto' && styles.modeTextActive]}>🤖 Auto</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.modeBtn, mode === 'manual' && styles.modeActive]}
            onPress={() => setMode('manual')}>
            <Text style={[styles.modeText, mode === 'manual' && styles.modeTextActive]}>👆 Manual</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.heroButton} onPress={() => router.push('/(customer)/chat')}>
          <Text style={styles.heroButtonText}>💬 Chat với AI ngay</Text>
        </TouchableOpacity>
      </View>

      {/* Auto mode: contextual widgets */}
      {mode === 'auto' && (
        <>
          {activeOrders.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📋 Đơn đang xử lý</Text>
              {activeOrders.slice(0, 2).map(order => (
                <TouchableOpacity key={order.id} style={styles.orderCard}
                  onPress={() => router.push(`/(customer)/${order.id}`)}>
                  <View style={styles.orderHeader}>
                    <Text style={styles.orderCategory}>{order.category}</Text>
                    <Text style={styles.orderPrice}>{order.estimated_price.toLocaleString('vi-VN')}₫</Text>
                  </View>
                  <Text style={styles.orderDescription} numberOfLines={1}>{order.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {devices.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🔧 Thiết bị cần chú ý</Text>
              {devices.slice(0, 2).map(device => (
                <View key={device.id} style={styles.deviceCard}>
                  <Text style={styles.deviceIcon}>🔧</Text>
                  <View style={styles.deviceInfo}>
                    <Text style={styles.deviceName}>{device.brand} {device.model}</Text>
                    {device.purchase_date && (
                      <Text style={styles.deviceDate}>Mua: {new Date(device.purchase_date).toLocaleDateString()}</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </>
      )}

      {/* Manual mode: full action menu */}
      {mode === 'manual' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Menu dịch vụ</Text>
          <View style={styles.grid}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity key={cat.id} style={styles.card}
                onPress={() => router.push('/(customer)/chat')}>
                <Text style={styles.cardIcon}>{cat.icon}</Text>
                <Text style={styles.cardText}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(customer)/orders')}>
              <Text style={styles.actionBtnText}>📋 Đơn hàng</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtnOutline} onPress={() => router.push('/(customer)/devices')}>
              <Text style={styles.actionBtnOutlineText}>🔧 Thiết bị</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Stats footer */}
      <View style={styles.statsFooter}>
        <Text style={styles.statsText}>
          {orders.length} đơn · {completedCount} hoàn thành · {totalSpent.toLocaleString('vi-VN')}₫ đã chi
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scrollContent: { paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hero: { backgroundColor: '#3b82f6', padding: 24, paddingTop: 60, alignItems: 'center' },
  heroEmoji: { fontSize: 48, marginBottom: 8 },
  heroTitle: { fontSize: 24, fontWeight: 'bold', color: 'white', marginBottom: 4 },
  heroSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 16 },
  modeToggle: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, marginBottom: 16 },
  modeBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8 },
  modeActive: { backgroundColor: 'white' },
  modeText: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  modeTextActive: { color: '#3b82f6', fontWeight: 'bold' },
  heroButton: { backgroundColor: 'white', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, width: '100%', alignItems: 'center' },
  heroButtonText: { color: '#3b82f6', fontSize: 16, fontWeight: 'bold' },
  section: { padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  orderCard: { backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  orderCategory: { fontSize: 14, fontWeight: 'bold' },
  orderPrice: { fontSize: 14, fontWeight: 'bold', color: '#3b82f6' },
  orderDescription: { fontSize: 12, color: '#666' },
  deviceCard: { backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12 },
  deviceIcon: { fontSize: 24 },
  deviceInfo: { flex: 1 },
  deviceName: { fontSize: 14, fontWeight: '500', color: '#374151' },
  deviceDate: { fontSize: 12, color: '#999', marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  card: { width: '45%', backgroundColor: 'white', padding: 16, borderRadius: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  cardIcon: { fontSize: 32, marginBottom: 8 },
  cardText: { fontSize: 14, fontWeight: '500', textAlign: 'center' },
  actionRow: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, backgroundColor: '#3b82f6', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  actionBtnText: { color: 'white', fontSize: 14, fontWeight: 'bold' },
  actionBtnOutline: { flex: 1, borderWidth: 1, borderColor: '#3b82f6', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  actionBtnOutlineText: { color: '#3b82f6', fontSize: 14, fontWeight: 'bold' },
  statsFooter: { padding: 20, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  statsText: { fontSize: 12, color: '#999' },
});
