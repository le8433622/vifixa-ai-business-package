'use client'

import { useState } from 'react'
import L from 'leaflet'
import MapView from './MapView'

const PIN_ICON = L.divIcon({
  className: 'custom-pin',
  html: '<div style="width:32px;height:32px;background:#2563eb;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);transform:translate(-50%,-50%)" />',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
})

interface LocationPickerProps {
  value?: { lat: number; lng: number }
  onChange: (location: { lat: number; lng: number; address?: string }) => void
  className?: string
  height?: number
}

export default function LocationPicker({
  value,
  onChange,
  className = '',
  height = 400,
}: LocationPickerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)

  const markers = value
    ? [{ position: [value.lat, value.lng] as [number, number], icon: PIN_ICON }]
    : []

  async function handleSearch() {
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const response = await fetch(
        `/api/locations/search?q=${encodeURIComponent(searchQuery)}&limit=5`
      )
      if (!response.ok) return
      const data = await response.json()
      if (data.results?.length > 0) {
        const r = data.results[0]
        onChange({ lat: r.lat, lng: r.lng, address: r.display_name })
      }
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Tìm địa chỉ..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleSearch}
          disabled={searching}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
        >
          {searching ? '...' : '🔍'}
        </button>
      </div>
      <div style={{ height }}>
        <MapView
          center={value ? [value.lat, value.lng] : undefined}
          markers={markers}
          onClick={(latlng) => onChange({ lat: latlng.lat, lng: latlng.lng })}
        />
      </div>
      {value && (
        <p className="text-xs text-gray-500">
          {value.lat.toFixed(6)}, {value.lng.toFixed(6)}
        </p>
      )}
    </div>
  )
}
