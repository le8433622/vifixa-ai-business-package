'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import MapView from './MapView'

interface ClusterMarker {
  position: [number, number]
  title?: string
  color?: string
  onClick?: () => void
}

interface MapWithClusteringProps {
  markers: ClusterMarker[]
  className?: string
  height?: number
  center?: [number, number]
  zoom?: number
}

export default function MapWithClustering({
  markers,
  className = '',
  height = 500,
  center,
  zoom,
}: MapWithClusteringProps) {
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null)

  function handleMapReady(map: L.Map) {
    clusterGroupRef.current = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
    })
    map.addLayer(clusterGroupRef.current)
  }

  useEffect(() => {
    if (!clusterGroupRef.current) return
    clusterGroupRef.current.clearLayers()

    const colors: Record<string, string> = {
      worker: '#2563eb',
      customer: '#16a34a',
      order: '#f59e0b',
      default: '#6b7280',
    }

    const leafletMarkers = markers.map((m) => {
      const color = m.color || colors.default
      const icon = L.divIcon({
        className: 'custom-cluster-marker',
        html: `<div style="width:28px;height:28px;background:${color};border:2px solid white;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,0.3)" />`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      })
      const marker = L.marker(m.position, { icon })
      if (m.title) marker.bindTooltip(m.title)
      if (m.onClick) marker.on('click', m.onClick)
      return marker
    })

    clusterGroupRef.current!.addLayers(leafletMarkers)
  }, [markers])

  return (
    <div className={className} style={{ height }}>
      <MapView
        center={center}
        zoom={zoom}
        onMapReady={handleMapReady}
      />
    </div>
  )
}
