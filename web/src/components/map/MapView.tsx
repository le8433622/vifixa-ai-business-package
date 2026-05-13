'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface MapViewProps {
  center?: [number, number]
  zoom?: number
  markers?: Array<{
    position: [number, number]
    title?: string
    icon?: L.DivIcon
    onClick?: () => void
  }>
  className?: string
  style?: React.CSSProperties
  onMapReady?: (map: L.Map) => void
  onClick?: (latlng: L.LatLng) => void
}

export default function MapView({
  center = [10.8231, 106.6297],
  zoom = 12,
  markers = [],
  className = '',
  style,
  onMapReady,
  onClick,
}: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const markersRef = useRef<L.Marker[]>([])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center,
      zoom,
      zoomControl: true,
      attributionControl: true,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://openstreetmap.org/copyright">OSM</a>',
      maxZoom: 19,
    }).addTo(map)

    if (onClick) {
      map.on('click', (e: L.LeafletMouseEvent) => onClick(e.latlng))
    }

    mapRef.current = map
    onMapReady?.(map)

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    if (!mapRef.current) return
    markersRef.current = markers.map((m) => {
      const marker = L.marker(m.position, { icon: m.icon })
        .addTo(mapRef.current!)
        .bindTooltip(m.title || '')
      if (m.onClick) marker.on('click', m.onClick)
      return marker
    })
  }, [markers])

  useEffect(() => {
    if (!mapRef.current) return
    mapRef.current.setView(center, zoom)
  }, [center, zoom])

  return (
    <div
      ref={containerRef}
      className={`w-full h-full min-h-[300px] rounded-lg overflow-hidden ${className}`}
      style={style}
    />
  )
}
