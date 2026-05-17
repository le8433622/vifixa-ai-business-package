import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminSettingsScreen() {
  const [features, setFeatures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('feature_flags').select('*').then(({ data }) => {
      if (data) setFeatures(data);
      setLoading(false);
    });
  }, []);

  async function toggleFeature(key: string, current: boolean) {
    await supabase.from('feature_flags').update({ enabled: !current }).eq('key', key);
    setFeatures(prev => prev.map(f => f.key === key ? { ...f, enabled: !current } : f));
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>⚙️ Cài đặt</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tính năng</Text>
        {features.map(f => (
          <View key={f.key} style={styles.featureRow}>
            <View style={styles.featureInfo}>
              <Text style={styles.featureName}>{f.name || f.key}</Text>
              <Text style={styles.featureDesc}>{f.description || ''}</Text>
            </View>
            <TouchableOpacity
              style={[styles.toggle, f.enabled ? styles.toggleOn : styles.toggleOff]}
              onPress={() => toggleFeature(f.key, f.enabled)}
            >
              <View style={[styles.toggleDot, f.enabled ? styles.toggleDotOn : styles.toggleDotOff]} />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hệ thống</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Phiên bản</Text>
          <Text style={styles.infoValue}>1.0.0</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Môi trường</Text>
          <Text style={styles.infoValue}>Production</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' }, content: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#e2e8f0', marginBottom: 16, marginTop: 8 },
  section: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 12 },
  featureRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#334155' },
  featureInfo: { flex: 1, marginRight: 12 },
  featureName: { fontSize: 14, fontWeight: '500', color: '#e2e8f0' },
  featureDesc: { fontSize: 11, color: '#64748b', marginTop: 2 },
  toggle: { width: 44, height: 24, borderRadius: 12, padding: 2 },
  toggleOn: { backgroundColor: '#6366f1' },
  toggleOff: { backgroundColor: '#475569' },
  toggleDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: 'white' },
  toggleDotOn: { alignSelf: 'flex-end' },
  toggleDotOff: { alignSelf: 'flex-start' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#334155' },
  infoLabel: { fontSize: 13, color: '#94a3b8' },
  infoValue: { fontSize: 13, color: '#e2e8f0', fontWeight: '500' },
});
