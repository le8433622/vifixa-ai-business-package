'use client'

import { useEffect, useState } from 'react'

interface PortfolioItem {
  id: string
  media_type: string
  title: string
  description: string | null
  media_url: string
  tags: string[]
  created_at: string
}

interface Props {
  workerId: string
}

const TYPE_ICONS: Record<string, string> = {
  before_after: '📸',
  certificate: '📜',
  worksample: '🔧',
  other: '📁',
}

export default function PortfolioView({ workerId }: Props) {
  const [items, setItems] = useState<PortfolioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/worker/portfolio?worker_id=${workerId}`)
      .then(r => r.json())
      .then(res => { setItems(res.data || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [workerId])

  if (loading) return null
  if (items.length === 0) return null

  return (
    <div className="space-y-3">
      {selected && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 cursor-pointer" onClick={() => setSelected(null)}>
          <img src={selected} alt="Portfolio" className="max-w-full max-h-[90vh] rounded-lg object-contain" />
          <button onClick={() => setSelected(null)} className="absolute top-4 right-4 text-white text-3xl hover:text-gray-300">✕</button>
        </div>
      )}

      <h4 className="text-sm font-semibold text-gray-900">📂 Portfolio</h4>
      <div className="grid grid-cols-3 gap-2">
        {items.slice(0, 6).map(item => (
          <button key={item.id} onClick={() => setSelected(item.media_url)}
            className="group relative rounded-lg overflow-hidden aspect-square">
            <img src={item.media_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition flex items-end p-2">
              <div>
                <p className="text-xs text-white font-medium truncate">{item.title}</p>
                <span className="text-[10px] text-gray-300">{TYPE_ICONS[item.media_type] || '📁'}</span>
              </div>
            </div>
          </button>
        ))}
        {items.length > 6 && (
          <button className="rounded-lg bg-gray-100 flex items-center justify-center text-sm text-gray-500 font-medium hover:bg-gray-200">
            +{items.length - 6}
          </button>
        )}
      </div>
    </div>
  )
}
