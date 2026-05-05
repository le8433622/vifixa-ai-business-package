// Service Request Page
// Per 05_PRODUCT_SOLUTION.md - Customer flow: Create service request

import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';

export default function ServiceRequest() {
  const router = useRouter();
  const { category } = useLocalSearchParams<{ category: string }>();
  const [description, setDescription] = useState('');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setMediaUrls([...mediaUrls, result.assets[0].uri]);
    }
  };

  const uploadMedia = async (uri: string): Promise<string> => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const filename = `service-${Date.now()}.jpg`;
    
    const { data, error } = await supabase.storage
      .from('service-media')
      .upload(filename, blob);

    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage
      .from('service-media')
      .getPublicUrl(data.path);
      
    return publicUrl;
  };

  const handleSubmit = async () => {
    if (!description) {
      Alert.alert('Lỗi', 'Vui lòng mô tả vấn đề');
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      // Upload media first
      const uploadedUrls = [];
      for (const uri of mediaUrls) {
        const url = await uploadMedia(uri);
        uploadedUrls.push(url);
      }

      // Call AI diagnosis via Supabase Edge Function
      const diagnosisResponse = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/ai-diagnose`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            category,
            description,
            media_urls: uploadedUrls,
          }),
        }
      );

      const diagnosis = await diagnosisResponse.json();

      // Create order
      const { data: order, error } = await supabase
        .from('orders')
        .insert({
          customer_id: session.user.id,
          category,
          description,
          media_urls: uploadedUrls,
          ai_diagnosis: diagnosis,
          estimated_price: diagnosis.estimated_price_range?.min || 0,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      Alert.alert('Thành công', 'Yêu cầu dịch vụ đã được tạo');
      router.push(`/(customer)/${order.id}`);
    } catch (error: any) {
      Alert.alert('Lỗi', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tạo yêu cầu dịch vụ</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Mô tả vấn đề</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Mô tả chi tiết vấn đề bạn gặp phải..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={6}
        />

        <Text style={styles.label}>Hình ảnh/Video</Text>
        <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
          <Text style={styles.uploadButtonText}>+ Thêm hình ảnh</Text>
        </TouchableOpacity>

        {mediaUrls.map((uri, index) => (
          <View key={index} style={styles.imagePreview}>
            <Text style={styles.imageText}>Hình ảnh {index + 1}</Text>
          </View>
        ))}

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Đang gửi...' : 'Gửi yêu cầu'}
          </Text>
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
  form: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 16,
  },
  textArea: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  uploadButton: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3b82f6',
    alignItems: 'center',
    marginTop: 8,
  },
  uploadButtonText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: 'bold',
  },
  imagePreview: {
    backgroundColor: '#e0e0e0',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  imageText: {
    fontSize: 14,
    color: '#666',
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  disabledButton: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
