'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AvailableWorkersMap from '@/components/map/AvailableWorkersMap'

const SKILL_OPTIONS = [
  { value: '', label: 'Tất cả' },
  { value: 'máy lạnh', label: 'Máy lạnh' },
  { value: 'điện', label: 'Điện' },
  { value: 'nước', label: 'Nước' },
  { value: 'camera', label: 'Camera' },
  { value: 'tủ lạnh', label: 'Tủ lạnh' },
  { value: 'máy giặt', label: 'Máy giặt' },
  { value: 'đồ gia dụng', label: 'Đồ gia dụng' },
]

export default function CustomerMapPage() {
  const router = useRouter()
  const [requiredSkills, setRequiredSkills] = useState<string[]>([])
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/login'); return }
      setChecking(false)
    })
  }, [router])

  if (checking) {
    return (
      <div className="h-[calc(100vh-3.5rem)] flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col bg-gray-50">
      <div className="shrink-0 bg-white border-b px-4 py-2.5 flex items-center gap-2 overflow-x-auto">
        {SKILL_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setRequiredSkills(opt.value ? [opt.value] : [])}
            className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              (opt.value === '' && requiredSkills.length === 0) || requiredSkills.includes(opt.value)
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div className="flex-1 min-h-0">
        <AvailableWorkersMap
          requiredSkills={requiredSkills}
          className="w-full h-full"
        />
      </div>
    </div>
  )
}
