// Admin Dashboard
// Per 05_PRODUCT_SOLUTION.md - Admin flow: View stats, quick links
// Uses: TanStack Query, Supabase, Expo Router

import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

type DashboardStats = {
  total_users: number;
  total_workers: number;
  total_orders: number;
  total_ai_calls: number;
};

type QuickLink = {
  title: string;
  description: string;
  route: string;
  color: string;
};

export default function AdminDashboard() {
  const router = useRouter();

  // TanStack Query for dashboard stats
  const { data: stats, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return null;
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/admin-dashboard?action=dashboard`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch dashboard stats');
      const data = await response.json();
      return data.stats as DashboardStats;
    },
  });

  const quickLinks: QuickLink[] = [
    { title: 'Users', description: 'Quản lý người dùng', route: '/(admin)/users', color: '#3b82f6' },
    { title: 'Workers', description: 'Quản lý thợ', route: '/(admin)/workers', color: '#8b5cf6' },
    { title: 'Orders', description: 'Quản lý đơn hàng', route: '/(admin)/orders', color: '#10b981' },
    { title: 'Disputes', description: 'Xử lý tranh chấp', route: '/(admin)/disputes', color: '#f59e0b' },
    { title: 'AI Logs', description: 'Xem lịch sử AI', route: '/(admin)/ai-log-s', color: '#ef4444' },
  ];

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
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <Text style={styles.headerSubtitle}>Vifixa AI Management</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: '#dbeafe' }]}>
          <Text style={styles.statValue}>{stats?.total_users || 0}</Text>
          <Text style={styles.statLabel}>Users</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#ede9fe' }]}>
          <Text style={styles.statValue}>{stats?.total_workers || 0}</Text>
          <Text style={styles.statLabel}>Workers</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#d1fae5' }]}>
          <Text style={styles.statValue}>{stats?.total_orders || 0}</Text>
          <Text style={styles.statLabel}>Orders</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#fee2e2' }]}>
          <Text style={styles.statValue}>{stats?.total_ai_calls || 0}</Text>
          <Text style={styles.statLabel}>AI Calls</Text>
        </View>
      </View>

      {/* Quick Links */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quản lý nhanh</Text>
        <View style={styles.linksGrid}>
          {quickLinks.map((link) => (
            <TouchableOpacity
              key={link.route}
              style={[styles.linkCard, { borderLeftColor: link.color }]}
              onPress={() => router.push(link.route)}
            >
              <Text style={styles.linkTitle}>{link.title}</Text>
              <Text style={styles.linkDescription}>{link.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statCard: {
    width: '45%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e40af',
  },
  statLabel: {
    fontSize: 12,
    color: '#1e40af',
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
  linksGrid: {
    gap: 12,
  },
  linkCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  linkTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  linkDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
});
