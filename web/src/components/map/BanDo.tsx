// 🗺️ BanDo v2 — Map component trung tâm cho toàn bộ hệ thống
// Hỗ trợ: GeoJSON, clusters, vẽ vùng, markers tùy chỉnh, popup

'use client'

import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, Circle, FeatureGroup, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix icon mặc định
const iconDefault = L.icon({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
})
L.Marker.prototype.options.icon = iconDefault

// Custom markers dạng emoji
function emojiIcon(emoji: string, size = 32): L.DivIcon {
  return L.divIcon({
    className: '', html: `<span style="font-size:${size}px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))">${emoji}</span>`,
    iconSize: [size, size], iconAnchor: [size / 2, size / 2],
  })
}

const ICONS: Record<string, L.DivIcon> = {
  worker: emojiIcon('🔧', 28),
  worker_verified: emojiIcon('✅', 28),
  customer: emojiIcon('📍', 28),
  order_pending: emojiIcon('📋', 24),
  order_in_progress: emojiIcon('🔨', 24),
  order_completed: emojiIcon('✅', 24),
  home: emojiIcon('🏠', 32),
  worker_location: emojiIcon('🛠️', 32),
  heat: emojiIcon('🔥', 20),
}

// GeoJSON Style theo loại
function geoStyle(feature: any) {
  const props = feature?.properties || {}
  const type = feature?.geometry?.type
  if (type === 'Point') {
    return { radius: Math.max(4, (props.intensity || props.order_count || 1) * 8), fillColor: '#3b82f6', color: '#1d4ed8', weight: 1, fillOpacity: 0.6 }
  }
  return { color: '#3b82f6', weight: 2, fillColor: '#3b82f6', fillOpacity: 0.1 }
}

function geoPointToLayer(feature: any, latlng: L.LatLng): L.Layer {
  const props = feature?.properties || {}
  const size = Math.max(8, (props.intensity || 0.5) * 30)
  return L.circleMarker(latlng, { radius: size, fillColor: '#3b82f6', color: '#1d4ed8', weight: 1, fillOpacity: 0.6 })
}

function onEachFeature(feature: any, layer: L.Layer) {
  const p = feature?.properties || {}
  const html = `<div style="font-size:12px;min-width:120px">
    ${p.name ? `<b>${p.name}</b><br/>` : ''}
    ${p.order_count ? `📋 ${p.order_count} đơn<br/>` : ''}
    ${p.avg_revenue ? `💰 ${(p.avg_revenue/1000).toFixed(0)}K₫<br/>` : ''}
    ${p.rating ? `⭐ ${p.rating}/5<br/>` : ''}
    ${p.distance_km ? `📍 ${p.distance_km}km<br/>` : ''}
    ${p.status ? `📌 ${p.status}<br/>` : ''}
    ${p.estimated_price ? `💰 ${(p.estimated_price/1000).toFixed(0)}K₫` : ''}
  </div>`
  layer.bindPopup(html)
}

// Component tự động cập nhật view
function SetView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap()
  useEffect(() => { map.setView(center, zoom) }, [center, zoom, map])
  return null
}

// Component bắt sự kiện click map
function MapClick({ onMapClick }: { onMapClick?: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onMapClick?.(e.latlng.lat, e.latlng.lng) })
  return null
}

export interface BanDoProps {
  geoJSON?: any
  points?: Array<{ id: string; lat: number; lng: number; type: string; label?: string; desc?: string; radius?: number; data?: any }>
  center?: [number, number]
  zoom?: number
  height?: string
  onMapClick?: (lat: number, lng: number) => void
  onMarkerClick?: (id: string, type: string, data: any) => void
  showControls?: boolean
  showDraw?: boolean
  className?: string
}

export default function BanDo({
  geoJSON, points = [], center = [10.77, 106.69], zoom = 12,
  height = '400px', onMapClick, onMarkerClick, showControls = true, showDraw = false, className = '',
}: BanDoProps) {

  return (
    <div className={`rounded-xl overflow-hidden border ${className}`} style={{ height }}>
      <MapContainer center={center} zoom={zoom} className="w-full h-full" zoomControl={showControls}>
        <TileLayer attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <SetView center={center} zoom={zoom} />
        {onMapClick && <MapClick onMapClick={onMapClick} />}

        {/* GeoJSON layer */}
        {geoJSON && <GeoJSON key={JSON.stringify(geoJSON)} data={geoJSON} style={geoStyle} pointToLayer={geoPointToLayer} onEachFeature={onEachFeature} />}

        {/* Points layer */}
        {points.map((p, i) => (
          <Marker key={`${p.id}-${i}`} position={[p.lat, p.lng]}
            icon={ICONS[p.type] || iconDefault}
            eventHandlers={onMarkerClick ? { click: () => onMarkerClick(p.id, p.type, p.data || {}) } : undefined}>
            {(p.label || p.desc) && (
              <Popup><div className="text-sm min-w-[120px]">
                {p.label && <p className="font-bold text-gray-900">{p.label}</p>}
                {p.desc && <p className="text-gray-600 mt-1 text-xs">{p.desc}</p>}
                {p.radius && <Circle center={[p.lat, p.lng]} radius={p.radius * 1000} pathOptions={{ color: '#3b82f6', fillOpacity: 0.1 }} />}
              </div></Popup>
            )}
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}