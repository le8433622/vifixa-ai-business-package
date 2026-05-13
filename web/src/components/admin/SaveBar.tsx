'use client'

interface SaveBarProps {
  pendingCount: number
  saving: boolean
  onSave: () => void
  onCancel: () => void
}

export default function SaveBar({ pendingCount, saving, onSave, onCancel }: SaveBarProps) {
  if (pendingCount === 0) return null

  return (
    <div className="mt-6 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-4">
      <p className="text-sm text-blue-700">
        {pendingCount} thay đổi đang chờ
      </p>
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 bg-white disabled:opacity-50"
        >
Hủy
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>
      </div>
    </div>
  )
}
