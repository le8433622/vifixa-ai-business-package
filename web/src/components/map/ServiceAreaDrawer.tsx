'use client'

import { useRef } from 'react'
import L from 'leaflet'
import 'leaflet-draw'
import 'leaflet-draw/dist/leaflet.draw.css'
import MapView from './MapView'

interface ServiceAreaDrawerProps {
  value?: [number, number][] | null
  onChange: (polygon: [number, number][]) => void
  className?: string
  height?: number
}

export default function ServiceAreaDrawer({
  value,
  onChange,
  className = '',
  height = 500,
}: ServiceAreaDrawerProps) {
  const drawControlRef = useRef<L.Control | null>(null)

  function handleMapReady(map: L.Map) {
    const drawnItems = new L.FeatureGroup()
    map.addLayer(drawnItems)

    if (value && value.length > 0) {
      const polygon = L.polygon(value as [number, number][]).addTo(drawnItems)
      map.fitBounds(polygon.getBounds().pad(0.2))
    }

    const DrawControl = L.Control.Draw
    drawControlRef.current = new DrawControl({
      edit: { featureGroup: drawnItems },
      draw: {
        polygon: { allowIntersection: false, showArea: true },
        polyline: false,
        rectangle: false,
        circle: false,
        circlemarker: false,
        marker: false,
      },
    })
    map.addControl(drawControlRef.current)

    map.on(L.Draw.Event.CREATED, (event: Record<string, unknown>) => {
      drawnItems.clearLayers()
      const layer = event.layer
      drawnItems.addLayer(layer)
      const latlngs = (layer as L.Polygon).getLatLngs()[0] as L.LatLng[]
      onChange(latlngs.map((ll) => [ll.lat, ll.lng]))
    })

    map.on(L.Draw.Event.EDITED, () => {
      drawnItems.eachLayer((layer) => {
        const latlngs = (layer as L.Polygon).getLatLngs()[0] as L.LatLng[]
        onChange(latlngs.map((ll) => [ll.lat, ll.lng]))
      })
    })

    map.on(L.Draw.Event.DELETED, () => {
      onChange([])
    })
  }

  return (
    <div className={className}>
      <p className="text-xs text-gray-500 mb-1">
        Vẽ khu vực phục vụ trên bản đồ. Click để thêm điểm, double-click để kết thúc.
      </p>
      <div style={{ height }}>
        <MapView onMapReady={handleMapReady} />
      </div>
    </div>
  )
}
