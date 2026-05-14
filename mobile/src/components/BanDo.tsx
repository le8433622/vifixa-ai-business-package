// 🗺️ BanDo mobile — WebView hiển thị bản đồ Leaflet
// Đồng bộ với web BanDo component, dùng chung HTML template

import { View, StyleSheet, ActivityIndicator } from 'react-native'
import { WebView } from 'react-native-webview'
import { useState } from 'react'

interface DiemBanDo {
  id: string
  lat: number
  lng: number
  loai: 'tho' | 'tho_xac_thuc' | 'khach' | 'don' | 'nha'
  nhan?: string
  moTa?: string
}

interface Props {
  diem?: DiemBanDo[]
  geoJSON?: any
  trungTam?: [number, number]
  zoom?: number
  chieuCao?: number
  onMarkerClick?: (id: string, loai: string) => void
}

// Tạo HTML cho WebView
function taoHTML(diem: DiemBanDo[], geoJSON: any, trungTam: [number, number], zoom: number): string {
  const markers = diem.map(d => `
    L.marker([${d.lat}, ${d.lng}], {icon: icons['${d.loai}']})
      .bindPopup('<b>${d.nhan || ''}</b>${d.moTa ? '<br/>' + d.moTa : ''}')
      .on('click', () => window.ReactNativeWebView.postMessage('${d.id}|${d.loai}'))
  `).join('\n')

  return `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  body{margin:0;padding:0}#map{width:100vw;height:100vh}
  .leaflet-popup-content-wrapper{border-radius:8px;font-size:13px}
</style>
</head><body>
<div id="map"></div>
<script>
  var map = L.map('map').setView([${trungTam[0]}, ${trungTam[1]}], ${zoom});
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {attribution:'© OSM'}).addTo(map);

  var icons = {
    tho: L.divIcon({html:'<span style="font-size:24px">🔧</span>',className:'',iconSize:[24,24],iconAnchor:[12,12]}),
    tho_xac_thuc: L.divIcon({html:'<span style="font-size:24px">✅</span>',className:'',iconSize:[24,24],iconAnchor:[12,12]}),
    khach: L.divIcon({html:'<span style="font-size:24px">📍</span>',className:'',iconSize:[24,24],iconAnchor:[12,12]}),
    don: L.divIcon({html:'<span style="font-size:20px">📋</span>',className:'',iconSize:[20,20],iconAnchor:[10,10]}),
    nha: L.divIcon({html:'<span style="font-size:28px">🏠</span>',className:'',iconSize:[28,28],iconAnchor:[14,14]}),
  };

  ${markers}

  ${geoJSON ? `L.geoJSON(${JSON.stringify(geoJSON)}, {
    pointToLayer: function(f, latlng) {
      var r = Math.max(6, (f.properties.intensity||0.5)*24);
      return L.circleMarker(latlng, {radius:r,fillColor:'#3b82f6',color:'#1d4ed8',weight:1,fillOpacity:0.6});
    },
    onEachFeature: function(f, l) {
      var p = f.properties;
      l.bindPopup('<b>'+(p.name||'')+'</b>'+(p.order_count?'<br/>📋 '+p.order_count+' đơn':'')+(p.avg_revenue?'<br/>💰 '+Math.round(p.avg_revenue/1000)+'K₫':''));
    }
  }).addTo(map)` : ''}
</script>
</body></html>`
}

export default function BanDoMobile({ diem = [], geoJSON, trungTam = [10.77, 106.69], zoom = 12, chieuCao = 300, onMarkerClick }: Props) {
  const [loading, setLoading] = useState(true)
  const html = taoHTML(diem, geoJSON, trungTam, zoom)

  return (
    <View style={[styles.container, { height: chieuCao }]}>
      {loading && <ActivityIndicator size="large" color="#2563eb" style={styles.loading} />}
      <WebView
        source={{ html }}
        style={styles.webview}
        onLoad={() => setLoading(false)}
        onMessage={(e) => {
          const [id, loai] = e.nativeEvent.data.split('|')
          onMarkerClick?.(id, loai)
        }}
        scrollEnabled={false}
        bounces={false}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { overflow: 'hidden', borderRadius: 12 },
  loading: { position: 'absolute', top: '50%', left: '45%', zIndex: 10 },
  webview: { flex: 1, backgroundColor: 'transparent' },
})