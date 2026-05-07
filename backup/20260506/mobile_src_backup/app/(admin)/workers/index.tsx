// Admin Workers List
// Per Step 5: Mobile Foundation - Worker management with verification toggle
// Uses Supabase client, TanStack Query, Expo Router

import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// TypeScript type for Worker from workers table
type Worker = {
  user_id: string;
  skills: string[];
  service_areas: string[];
  is_verified: boolean;
  trust_score: number;
  avg_earnings: number;
  profiles?: { email: string; phone?: string };
};

export default function AdminWorkers() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // TanStack Query for data fetching with caching
  const { data: workers = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['admin-workers'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return [];
      }

      // Call Edge Function to get workers (server-side with admin privileges)
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/admin-dashboard?action=workers`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch workers');
      const data = await response.json();
      return data.workers as Worker[];
    },
  });

  // Toggle worker verification status
  async function toggleVerification(userId: string, currentStatus: boolean) {
    Alert.alert(
      'Toggle Verification',
      `Change verification status from ${currentStatus ? 'Verified' : 'Unverified'} to ${currentStatus ? 'Unverified' : 'Verified'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (!session) return;

              // Call API route to update worker verification
              const response = await fetch('/api/admin/workers/verify', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${session.access_token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  user_id: userId,
                  is_verified: !currentStatus,
                }),
              });

              if (!response.ok) throw new Error('Failed to update verification');
              queryClient.invalidateQueries({ queryKey: ['admin-workers'] });
              Alert.alert('Success', 'Verification status updated');
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  }

  // Render each worker item
  const renderWorker = ({ item }: { item: Worker }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.email}>{item.profiles?.email || 'N/A'}</Text>
          <Text style={styles.phone}>{item.profiles?.phone || 'Chưa có SĐT'}</Text>
        </View>
        <TouchableOpacity
          style={[styles.verifyBadge, item.is_verified ? styles.verified : styles.unverified]}
          onPress={() => toggleVerification(item.user_id, item.is_verified)}
        >
          <Text style={styles.verifyText}>
            {item.is_verified ? 'Verified' : 'Pending'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.skillsContainer}>
        <Text style={styles.sectionLabel}>Kỹ năng:</Text>
        <Text style={styles.skillsText}>{item.skills?.join(', ') || 'Chưa có'}</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Trust Score</Text>
          <Text style={styles.statValue}>{item.trust_score || 50}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Avg Earnings</Text>
          <Text style={styles.statValue}>${item.avg_earnings || 0}</Text>
        </View>
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
        <Text style={styles.headerTitle}>Quản lý Workers</Text>
      </View>

      <FlatList
        data={workers}
        renderItem={renderWorker}
        keyExtractor={(item) => item.user_id}
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
    alignItems: 'center',
    marginBottom: 12,
  },
  email: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  phone: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  verifyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  verified: {
    backgroundColor: '#d1fae5',
  },
  unverified: {
    backgroundColor: '#fef3c7',
  },
  verifyText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  skillsContainer: {
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  skillsText: {
    fontSize: 14,
    color: '#333',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  stat: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
});
