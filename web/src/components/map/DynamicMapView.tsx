'use client'

import dynamic from 'next/dynamic'

const DynamicMapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[300px] rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 text-sm">
      Đang tải bản đồ...
    </div>
  ),
})

export default DynamicMapView
