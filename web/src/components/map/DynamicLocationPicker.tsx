'use client'

import dynamic from 'next/dynamic'

const DynamicLocationPicker = dynamic(() => import('./LocationPicker'), {
  ssr: false,
  loading: () => (
    <div style={{ height: 400 }} className="w-full rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 text-sm">
      Đang tải bản đồ...
    </div>
  ),
})

export default DynamicLocationPicker
