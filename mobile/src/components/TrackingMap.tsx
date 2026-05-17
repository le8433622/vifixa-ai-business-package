import { View, Text, StyleSheet } from 'react-native';

interface TrackingMapProps {
  workerLat?: number;
  workerLng?: number;
  customerLat?: number;
  customerLng?: number;
  workerName?: string;
  etaMinutes?: number;
}

export default function TrackingMap({ workerLat, workerLng, customerLat, customerLng, workerName, etaMinutes }: TrackingMapProps) {
  // In production: use react-native-maps with MapView, Marker, Polyline
  // For now: show status card with location info

  return (
    <View style={styles.container}>
      <View style={styles.statusCard}>
        <View style={styles.header}>
          <Text style={styles.icon}>🗺️</Text>
          <View style={styles.info}>
            <Text style={styles.title}>
              {workerName ? `${workerName} đang đến` : 'Đang tìm thợ...'}
            </Text>
            {etaMinutes ? (
              <Text style={styles.eta}>Cách bạn ~{etaMinutes} phút</Text>
            ) : (
              <Text style={styles.eta}>Đang cập nhật vị trí...</Text>
            )}
          </View>
        </View>

        {(workerLat && workerLng) ? (
          <View style={styles.coords}>
            <Text style={styles.coordText}>📍 Thợ: {workerLat.toFixed(4)}, {workerLng.toFixed(4)}</Text>
            {customerLat && customerLng && (
              <Text style={styles.coordText}>📍 Bạn: {customerLat.toFixed(4)}, {customerLng.toFixed(4)}</Text>
            )}
          </View>
        ) : (
          <View style={styles.loadingBar}>
            <View style={styles.loadingFill} />
          </View>
        )}

        {/* Map placeholder — will be replaced with react-native-maps */}
        <View style={styles.mapPlaceholder}>
          <Text style={styles.mapIcon}>🗺️</Text>
          <Text style={styles.mapText}>Bản đồ thời gian thực</Text>
          <Text style={styles.mapHint}>Cần react-native-maps để hiển thị</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingTop: 0 },
  statusCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { fontSize: 32 },
  info: { flex: 1 },
  title: { fontSize: 16, fontWeight: 'bold' },
  eta: { fontSize: 13, color: '#059669', marginTop: 2 },
  coords: { backgroundColor: '#f3f4f6', padding: 10, borderRadius: 8, marginTop: 12 },
  coordText: { fontSize: 11, color: '#6b7280', fontFamily: 'monospace', marginBottom: 2 },
  loadingBar: { height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, marginTop: 12, overflow: 'hidden' },
  loadingFill: { width: '60%', height: '100%', backgroundColor: '#3b82f6', borderRadius: 2, opacity: 0.5 },
  mapPlaceholder: { height: 120, backgroundColor: '#f0f9ff', borderRadius: 12, marginTop: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#bae6fd', borderStyle: 'dashed' },
  mapIcon: { fontSize: 32, marginBottom: 4 },
  mapText: { fontSize: 14, color: '#0284c7', fontWeight: '500' },
  mapHint: { fontSize: 11, color: '#7dd3fc', marginTop: 2 },
});
