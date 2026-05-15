'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface PluginDef {
  id: string; name: string; icon: string; description: string; status: 'active' | 'inactive' | 'coming_soon'
  category: string; docsUrl?: string
}

const PLUGINS: PluginDef[] = [
  { id: 'repair', name: 'Sửa chữa thiết bị', icon: '🔧', description: 'Dịch vụ sửa máy lạnh, điện nước, camera... (Built-in)', status: 'active', category: 'Nội bộ' },
  { id: 'shopee', name: 'Shopee', icon: '🛒', description: 'Xử lý đơn hàng, trả hàng, hoàn tiền từ Shopee', status: 'coming_soon', category: 'TMĐT' },
  { id: 'lazada', name: 'Lazada', icon: '🛒', description: 'Xử lý đơn hàng, trả hàng, hoàn tiền từ Lazada', status: 'coming_soon', category: 'TMĐT' },
  { id: 'tiki', name: 'Tiki', icon: '🛒', description: 'Xử lý đơn hàng, trả hàng, hoàn tiền từ Tiki', status: 'coming_soon', category: 'TMĐT' },
  { id: 'vietnamworks', name: 'VietnamWorks', icon: '💼', description: 'Kết nối ứng viên, việc làm từ VietnamWorks', status: 'coming_soon', category: 'Tuyển dụng' },
  { id: 'topcv', name: 'TopCV', icon: '💼', description: 'Kết nối ứng viên, việc làm từ TopCV', status: 'coming_soon', category: 'Tuyển dụng' },
  { id: 'linkedin', name: 'LinkedIn', icon: '💼', description: 'Kết nối mạng lưới việc làm toàn cầu', status: 'coming_soon', category: 'Tuyển dụng' },
]

export default function AdminIntegrations() {
  const router = useRouter()
  const [filter, setFilter] = useState<string>('all')

  const categories = [...new Set(PLUGINS.map(p => p.category))]
  const filtered = filter === 'all' ? PLUGINS : PLUGINS.filter(p => p.category === filter)

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-100">🔌 Integrations</h1>
        <span className="text-xs text-gray-500">{PLUGINS.filter(p => p.status === 'active').length} active · {PLUGINS.filter(p => p.status === 'coming_soon').length} coming soon</span>
      </div>

      {/* Category filter */}
      <div className="flex gap-2">
        <button onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filter === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
          Tất cả
        </button>
        {categories.map(cat => (
          <button key={cat} onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filter === cat ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
            {cat}
          </button>
        ))}
      </div>

      {/* Plugin grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(plugin => (
          <div key={plugin.id} className={`bg-gray-800 rounded-xl border p-5 transition ${
            plugin.status === 'active' ? 'border-emerald-800/50' : plugin.status === 'coming_soon' ? 'border-gray-700' : 'border-gray-700'
          }`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{plugin.icon}</span>
                <div>
                  <h3 className="font-semibold text-gray-200">{plugin.name}</h3>
                  <p className="text-xs text-gray-500">{plugin.category}</p>
                </div>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                plugin.status === 'active' ? 'bg-emerald-900/50 text-emerald-300'
                : 'bg-gray-700 text-gray-500'
              }`}>{plugin.status === 'active' ? '✅ Active' : '📅 Sắp ra mắt'}</span>
            </div>
            <p className="text-sm text-gray-400">{plugin.description}</p>
            {plugin.status === 'active' ? (
              <div className="mt-3 flex gap-2">
                <button className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700">Cấu hình</button>
                <button className="px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg text-xs font-medium hover:bg-gray-600">Docs</button>
              </div>
            ) : (
              <div className="mt-3">
                <button className="px-3 py-1.5 bg-gray-700 text-gray-500 rounded-lg text-xs font-medium cursor-not-allowed">Chưa khả dụng</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* How to add new plugin */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
        <h3 className="font-semibold text-gray-200 mb-2">📝 Thêm integration mới</h3>
        <p className="text-sm text-gray-400 mb-3">
          Mọi nền tảng đều có thể kết nối qua cơ chế plugin. Chỉ cần 1 file:
        </p>
        <pre className="bg-gray-900 rounded-lg p-4 text-xs text-gray-400 overflow-x-auto">
{`serviceRegistry.register({
  id: 'your-platform',
  name: 'Tên nền tảng',
  icon: '🛒',
  keywords: ['từ khóa'],
  onDiagnose: async (input) => platformAPI.diagnose(input),
  onResolve: async (diag) => platformAPI.resolve(diag),
})`}
        </pre>
        <button className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
          📖 Xem docs tích hợp
        </button>
      </div>
    </div>
  )
}
