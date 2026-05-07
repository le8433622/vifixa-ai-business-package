// Worker Profile Edit
// Per 05_PRODUCT_SOLUTION.md - Worker flow: Update profile, skills, service areas
// Uses: TanStack Query, Supabase, Expo Router, Expo ImagePicker

import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';

// TypeScript types
type WorkerProfile = {
  user_id: string;
  skills: string[];
  service_areas: string[];
  is_verified: boolean;
  trust_score: number;
  avg_earnings: number;
  profiles?: { email: string; phone?: string };
};

const AVAILABLE_SKILLS = [
  'Plumbing', 'Electrical', 'HVAC', 'Appliance Repair',
  'Carpentry', 'Painting', 'Cleaning', 'Lock Smith',
];

const SERVICE_AREAS = [
  'District 1', 'District 2', 'District 3', 'District 4', 'District 5',
  'District 6', 'District 7', 'District 8', 'District 9', 'District 10',
  'District 11', 'District 12', 'Binh Thanh', 'Phu Nhuan', 'Go Vap',
];

export default function WorkerProfile() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // TanStack Query for profile data
  const { data: profile, isLoading, refetch } = useQuery({
    queryKey: ['worker-profile'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return null;
      }

      const { data, error } = await supabase
        .from('workers')
        .select('*, profiles(email, phone)')
        .eq('user_id', session.user.id)
        .single();

      if (error) throw error;
      return data as WorkerProfile;
    },
  });

  // Toggle skill
  async function toggleSkill(skill: string) {
    if (!profile) return;
    const newSkils = profile.skills?.includes(skill)
      ? profile.skills.filter(s => s !== skill)
      : [...(profile.skills || []), skill];

    try {
      const { error } = await supabase
        .from('workers')
        .update({ skills: newSkils })
        .eq('user_id', profile.user_id);

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['worker-profile'] });
      Alert.alert('Success', 'Kỹ năng đã cập nhật');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }

  // Toggle service area
  async function toggleArea(area: string) {
    if (!profile) return;
    const newAreas = profile.service_areas?.includes(area)
      ? profile.service_areas.filter(a => a !== area)
      : [...(profile.service_areas || []), area];

    try {
      const { error } = await supabase
        .from('workers')
        .update({ service_areas: newAreas })
        .eq('user_id', profile.user_id);

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['worker-profile'] });
      Alert.alert('Success', 'Khu vực đã cập nhật');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }

  // Upload ID document
  async function uploadIDDocument() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (result.canceled) return;

      const { uri } = result.assets[0];
      const fileName = `id-${Date.now()}-${uri.split('/').pop()}`;
      const response = await fetch(uri);
      const blob = await response.blob();

      const { data, error } = await supabase.storage
        .from('worker-documents')
        .upload(fileName, blob);

      if (error) throw error;
      Alert.alert('Success', 'Đã tải lên giấy tờ');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Không tìm thấy hồ sơ</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hồ sơ thợ</Text>
      </View>

      {/* Profile Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Thông tin cơ bản</Text>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Email:</Text>
          <Text style={styles.value}>{profile.profiles?.email}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>SĐT:</Text>
          <Text style={styles.value}>{profile.profiles?.phone || 'Chưa có'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Trạng thái:</Text>
          <View style={[styles.badge, profile.is_verified ? styles.verified : styles.unverified]}>
            <Text style={styles.badgeText}>
              {profile.is_verified ? 'Đã xác thực' : 'Chờ xác thực'}
            </Text>
          </View>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Thống kê</Text>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{profile.trust_score || 50}</Text>
            <Text style={styles.statLabel}>Điểm uy tín</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>${profile.avg_earnings || 0}</Text>
            <Text style={styles.statLabel}>Avg Earnings</Text>
          </View>
        </View>
      </View>

      {/* Skills */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Kỹ năng</Text>
        <View style={styles.chipContainer}>
          {AVAILABLE_SKILLS.map(skill => (
            <TouchableOpacity
              key={skill}
              style={[styles.chip, profile.skills?.includes(skill) && styles.chipSelected]}
              onPress={() => toggleSkill(skill)}
            >
              <Text style={[styles.chipText, profile.skills?.includes(skill) && styles.chipTextSelected]}>
                {skill}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Service Areas */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Khu vực hoạt động</Text>
        <View style={styles.chipContainer}>
          {SERVICE_AREAS.map(area => (
            <TouchableOpacity
              key={area}
              style={[styles.chip, profile.service_areas?.includes(area) && styles.chipSelected]}
              onPress={() => toggleArea(area)}
            >
              <Text style={[styles.chipText, profile.service_areas?.includes(area) && styles.chipTextSelected]}>
                {area}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ID Document Upload */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Giấy tờ</Text>
        <TouchableOpacity style={styles.uploadButton} onPress={uploadIDDocument}>
          <Text style={styles.uploadButtonText}>+ Tải lên giấy tờ</Text>
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
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
    color: 'white',
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  section: {
    margin: 16,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: '#666',
    width: 80,
  },
  value: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  badge: {
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
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  chipSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  chipText: {
    fontSize: 14,
    color: '#374151',
  },
  chipTextSelected: {
    color: 'white',
    fontWeight: 'bold',
  },
  uploadButton: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  uploadButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
