'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface CompanionHeaderProps {
  persona: 'customer' | 'worker' | 'admin'
  onPersonaChange?: (newPersona: 'customer' | 'worker' | 'admin') => void
}

export default function CompanionHeader({ persona, onPersonaChange }: CompanionHeaderProps) {
  const router = useRouter()
  const [personaOptions, setPersonaOptions] = useState([
    { value: 'customer', label: 'Khách hàng', icon: '🏠' },
    { value: 'worker', label: 'Thợ', icon: '🔧' },
    { value: 'admin', label: 'Admin', icon: '🛡️' }
  ])

  const handlePersonaChange = (newPersona: 'customer' | 'worker' | 'admin') => {
    if (onPersonaChange) {
      onPersonaChange(newPersona)
    }
    // Reload current page to reflect new persona context
    router.refresh()
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-b">
      <div className="flex items-center gap-3">
        <div className="text-2xl">{personaOptions.find(p => p.value === persona)?.icon}</div>
        <div>
          <h3 className="font-semibold text-lg">{personaOptions.find(p => p.value === persona)?.label}</h3>
          <p className="text-xs text-gray-500">AI Companion của bạn</p>
        </div>
      </div>
      
      {/* Persona selector */}
      <div className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation()
            // In a real app, this would open a dropdown
          }}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-gray-50"
        >
          {personaOptions.find(p => p.value === persona)?.icon}
          <span className="text-sm font-medium">{personaOptions.find(p => p.value === persona)?.label}</span>
          <span className="ml-1 text-xs">▼</span>
        </button>
      </div>
    </div>
  )
}