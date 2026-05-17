import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';

const PLUGINS = [
  { id: 'repair', name: '🔧 Sửa chữa', desc: 'Built-in — đang hoạt động', active: true },
  { id: 'shopee', name: '🛒 Shopee', desc: 'Xử lý đơn hàng, trả hàng', active: false },
  { id: 'lazada', name: '🛒 Lazada', desc: 'Xử lý đơn hàng, trả hàng', active: false },
  { id: 'vietnamworks', name: '💼 VietnamWorks', desc: 'Kết nối việc làm', active: false },
  { id: 'topcv', name: '💼 TopCV', desc: 'Kết nối việc làm', active: false },
];

export default function AdminIntegrations() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>🔌 Tích hợp</Text>
      <Text style={styles.subtitle}>{PLUGINS.filter(p => p.active).length} đang hoạt động · {PLUGINS.filter(p => !p.active).length} sắp ra mắt</Text>

      {PLUGINS.map(p => (
        <View key={p.id} style={[styles.card, p.active && styles.cardActive]}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardName}>{p.name}</Text>
              <Text style={styles.cardDesc}>{p.desc}</Text>
            </View>
            {p.active ? <View style={styles.activeBadge}><Text style={styles.activeText}>✅ Active</Text></View>
            : <View style={styles.comingBadge}><Text style={styles.comingText}>📅 Sắp ra mắt</Text></View>}
          </View>
        </View>
      ))}

      <View style={styles.docsCard}>
        <Text style={styles.docsTitle}>📝 Thêm integration mới</Text>
        <Text style={styles.docsDesc}>Mọi nền tảng đều có thể kết nối qua cơ chế plugin trong service-registry.ts</Text>
        <View style={styles.codeBlock}>
          <Text style={styles.codeText}>
{`serviceRegistry.register({{
  id: 'platform',
  name: 'Tên nền tảng',
  onDiagnose: async (i) => api(i),
  onResolve: async (d) => api(d),
}})`}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#e2e8f0', marginBottom: 4, marginTop: 10 },
  subtitle: { fontSize: 12, color: '#64748b', marginBottom: 20 },
  card: { backgroundColor: '#1e293b', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  cardActive: { borderColor: '#065f46' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardName: { color: '#e2e8f0', fontSize: 16, fontWeight: '600' },
  cardDesc: { color: '#64748b', fontSize: 12, marginTop: 4 },
  activeBadge: { backgroundColor: '#064e3b', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  activeText: { color: '#34d399', fontSize: 10, fontWeight: 'bold' },
  comingBadge: { backgroundColor: '#334155', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  comingText: { color: '#94a3b8', fontSize: 10, fontWeight: 'bold' },
  docsCard: { backgroundColor: '#1e293b', padding: 16, borderRadius: 16, marginTop: 8, borderWidth: 1, borderColor: '#374151' },
  docsTitle: { color: '#e2e8f0', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  docsDesc: { color: '#94a3b8', fontSize: 12, marginBottom: 12 },
  codeBlock: { backgroundColor: '#0f172a', padding: 12, borderRadius: 8 },
  codeText: { color: '#64748b', fontSize: 10, fontFamily: 'monospace' },
});
