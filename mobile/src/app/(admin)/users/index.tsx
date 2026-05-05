// Admin Users List
// Per Step 5: Mobile Foundation - User management with role switching
// Uses Supabase client, TanStack Query, Expo Router

import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// TypeScript type for Profile from Supabase
type Profile = {
  id: string;
  email: string;
  phone?: string;
  role: 'customer' | 'worker' | 'admin';
  created_at: string;
};

export default function AdminUsers() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // TanStack Query for data fetching with caching
  const { data: users = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return [];
      }

      // Call Edge Function to get users (server-side with admin privileges)
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/admin-dashboard?action=users`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      return data.users as Profile[];
    },
  });

  // Switch user role (customer <-> worker <-> admin)
  async function switchRole(userId: string, currentRole: string) {
    const roles: ('customer' | 'worker' | 'admin')[] = ['customer', 'worker', 'admin'];
    const currentIndex = roles.indexOf(currentRole as any);
    const nextRole = roles[(currentIndex + 1) % roles.length];

    Alert.alert(
      'Switch Role',
      `Change role from ${currentRole} to ${nextRole}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (!session) return;

              const response = await fetch(
                `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/admin-dashboard?action=update-user-role`,
                {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ user_id: userId, role: nextRole }),
                }
              );

              if (!response.ok) throw new Error('Failed to update role');
              queryClient.invalidateQueries({ queryKey: ['admin-users'] });
              Alert.alert('Success', `Role updated to ${nextRole}`);
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  }

  // Get role badge color
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return '#fecaca';
      case 'worker': return '#dbeafe';
      case 'customer': return '#d1fae5';
      default: return '#f3f4f6';
    }
  };

  const getRoleTextColor = (role: string) => {
    switch (role) {
      case 'admin': return '#991b1b';
      case 'worker': return '#1e40af';
      case 'customer': return '#065f46';
      default: return '#374151';
    }
  };

  // Render each user item
  const renderUser = ({ item }: { item: Profile }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.email}>{item.email}</Text>
          <Text style={styles.phone}>{item.phone || 'Chưa có SĐT'}</Text>
        </View>
        <TouchableOpacity
          style={[styles.roleBadge, { backgroundColor: getRoleColor(item.role) }]}
          onPress={() => switchRole(item.id, item.role)}
        >
          <Text style={[styles.roleText, { color: getRoleTextColor(item.role) }]}>
            {item.role}
          </Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.date}>
        Tạo: {new Date(item.created_at).toLocaleDateString()}
      </Text>
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
        <Text style={styles.headerTitle}>Quản lý Users</Text>
      </View>

      <FlatList
        data={users}
        renderItem={renderUser}
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
    alignItems: 'center',
    marginBottom: 8,
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
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  roleText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  date: {
    fontSize: 12,
    color: '#999',
  },
});
