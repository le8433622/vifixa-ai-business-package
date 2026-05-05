// Worker Job Detail
// Per 05_PRODUCT_SOLUTION.md - Worker flow: Accept/start/complete job, upload photos
// Uses: TanStack Query, Supabase, Expo Router, Expo ImagePicker

import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, Image } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';

type Job = {
  id: string;
  category: string;
  description: string;
  status: 'pending' | 'matched' | 'in_progress' | 'completed' | 'canceled' | 'disputed';
  estimated_price: number;
  final_price?: number;
  before_media?: string[];
  after_media?: string[];
  materials?: string;
  created_at: string;
};

export default function WorkerJobDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  // TanStack Query for job details
  const { data: job, isLoading, refetch } = useQuery({
    queryKey: ['worker-job', id],
    queryFn: async () => {
      if (!id) throw new Error('Job ID not found');
      
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Job;
    },
    enabled: !!id,
  });

  // Accept job
  async function acceptJob() {
    if (!job) return;
    
    Alert.alert(
      'Accept Job',
      `Accept this $${job.estimated_price} job?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('orders')
                .update({ status: 'in_progress' })
                .eq('id', id);

              if (error) throw error;
              refetch();
              Alert.alert('Success', 'Job accepted! Please upload before photos.');
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  }

  // Upload photos
  async function uploadPhotos(type: 'before' | 'after') {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsMultipleSelection: true,
      });

      if (result.canceled) return;

      const urls: string[] = [];
      for (const asset of result.assets) {
        const fileName = `${type}-${Date.now()}-${asset.uri.split('/').pop()}`;
        const response = await fetch(asset.uri);
        const blob = await response.blob();

        const { data, error } = await supabase.storage
          .from('order-evidence')
          .upload(fileName, blob);

        if (!error && data) {
          const { data: { publicUrl } } = supabase.storage
            .from('order-evidence')
            .getPublicUrl(data.path);
          urls.push(publicUrl);
        }
      }

      // Update job with photo URLs
      const field = type === 'before' ? 'before_media' : 'after_media';
      const existing = type === 'before' ? job?.before_media || [] : job?.after_media || [];
      const newUrls = [...existing, ...urls];

      const { error } = await supabase
        .from('orders')
        .update({ [field]: newUrls })
        .eq('id', id);

      if (error) throw error;
      refetch();
      Alert.alert('Success', `Uploaded ${urls.length} photos`);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }

  // Complete job
  async function completeJob() {
    if (!job) return;

    Alert.alert(
      'Complete Job',
      'Mark this job as completed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('orders')
                .update({ 
                  status: 'completed',
                  final_price: job.estimated_price // Default to estimated price
                })
                .eq('id', id);

              if (error) throw error;
              refetch();
              Alert.alert('Success', 'Job completed!');
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  }

  if (isLoading || !job) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
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
        <Text style={styles.headerTitle}>Chi tiết việc làm</Text>
      </View>

      {/* Status */}
      <View style={[styles.statusBadge, getStatusStyle(job.status)]}>
        <Text style={styles.statusText}>{job.status}</Text>
      </View>

      {/* Job Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Thông tin việc làm</Text>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Danh mục:</Text>
          <Text style={styles.value}>{job.category}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Mô tả:</Text>
          <Text style={styles.value}>{job.description}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Giá dự kiến:</Text>
          <Text style={styles.price}>${job.estimated_price}</Text>
        </View>
        {job.final_price && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>Giá cuối cùng:</Text>
            <Text style={[styles.price, { color: '#10b981' }]}>${job.final_price}</Text>
          </View>
        )}
      </View>

      {/* Before Photos */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Ảnh trước khi sửa</Text>
          {job.status === 'in_progress' && (
            <TouchableOpacity onPress={() => uploadPhotos('before')}>
              <Text style={styles.addButton}>+ Thêm</Text>
            </TouchableOpacity>
          )}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {job.before_media?.map((uri: string, index: number) => (
            <Image key={index} source={{ uri }} style={styles.mediaImage} />
          ))}
        </ScrollView>
      </View>

      {/* After Photos */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Ảnh sau khi sửa</Text>
          {job.status === 'in_progress' && (
            <TouchableOpacity onPress={() => uploadPhotos('after')}>
              <Text style={styles.addButton}>+ Thêm</Text>
            </TouchableOpacity>
          )}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {job.after_media?.map((uri: string, index: number) => (
            <Image key={index} source={{ uri }} style={styles.mediaImage} />
          ))}
        </ScrollView>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {job.status === 'matched' && (
          <TouchableOpacity style={[styles.actionButton, styles.acceptButton]} onPress={acceptJob}>
            <Text style={styles.actionButtonText}>Chấp nhận việc</Text>
          </TouchableOpacity>
        )}

        {job.status === 'in_progress' && (
          <TouchableOpacity style={[styles.actionButton, styles.completeButton]} onPress={completeJob}>
            <Text style={styles.actionButtonText}>Hoàn thành</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'matched': return { backgroundColor: '#fef3c7' };
    case 'in_progress': return { backgroundColor: '#dbeafe' };
    case 'completed': return { backgroundColor: '#d1fae5' };
    default: return { backgroundColor: '#f3f4f6' };
  }
};

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
  statusBadge: {
    margin: 16,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    textTransform: 'capitalize',
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
    fontSize: 14,
    color: '#333',
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  addButton: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: 'bold',
  },
  mediaImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 8,
  },
  actions: {
    padding: 16,
    gap: 8,
  },
  actionButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#3b82f6',
  },
  completeButton: {
    backgroundColor: '#10b981',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
