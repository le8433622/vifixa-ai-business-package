// Reusable UI components for Admin AI pages
// Bộ 3: loading, empty, error + stat card + filter bar

export function LoadingState({ text = 'Đang tải...' }: { text?: string }) {
  return (
    <div className="text-center py-12">
      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
      <p className="text-gray-600 text-sm">{text}</p>
    </div>
  )
}

export function EmptyState({ icon = '📭', title, description, action }: {
  icon?: string
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
      <p className="text-4xl mb-3">{icon}</p>
      <p className="text-gray-500 font-medium">{title}</p>
      {description && <p className="text-sm text-gray-400 mt-1">{description}</p>}
      {action && (
        <button onClick={action.onClick} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
          {action.label}
        </button>
      )}
    </div>
  )
}

export function ErrorAlert({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
      <span className="text-xl">⚠️</span>
      <div className="flex-1">
        <p className="text-sm font-medium text-red-800">Có lỗi xảy ra</p>
        <p className="text-xs text-red-600 mt-1">{message}</p>
      </div>
      {onRetry && (
        <button onClick={onRetry} className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs hover:bg-red-200 shrink-0">
          Thử lại
        </button>
      )}
    </div>
  )
}

export function StatCard({ label, value, color = 'blue', format, trend }: {
  label: string
  value: string | number
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'gray'
  format?: (v: number) => string
  trend?: { direction: 'up' | 'down'; value: string }
}) {
  const colorMap: Record<string, string> = {
    blue: 'text-blue-600', green: 'text-green-600', yellow: 'text-yellow-600',
    red: 'text-red-600', gray: 'text-gray-900',
  }
  const displayValue = typeof value === 'number' && format ? format(value) : value
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border">
      <p className="text-sm text-gray-600 mb-1">{label}</p>
      <div className="flex items-end gap-2">
        <p className={`text-2xl font-bold ${colorMap[color]}`}>{displayValue}</p>
        {trend && (
          <span className={`text-xs mb-1 ${trend.direction === 'up' ? 'text-green-500' : 'text-red-500'}`}>
            {trend.direction === 'up' ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>
    </div>
  )
}

export function FilterBar({ options, selected, onChange }: {
  options: { key: string; label: string; count?: number }[]
  selected: string
  onChange: (key: string) => void
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map(opt => (
        <button
          key={opt.key}
          onClick={() => onChange(opt.key)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            selected === opt.key
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {opt.label}{opt.count !== undefined ? ` (${opt.count})` : ''}
        </button>
      ))}
    </div>
  )
}

export function PageHeader({ title, description, actions }: {
  title: string
  description?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-3xl font-bold">{title}</h1>
        {description && <p className="text-gray-600 mt-1">{description}</p>}
      </div>
      {actions && <div className="flex gap-2 shrink-0">{actions}</div>}
    </div>
  )
}

export function InfoBadge({ label, color = 'gray' }: { label: string; color?: 'green' | 'red' | 'yellow' | 'blue' | 'gray' | 'amber' | 'purple' }) {
  const colorMap: Record<string, string> = {
    green: 'bg-green-100 text-green-800', red: 'bg-red-100 text-red-800',
    yellow: 'bg-yellow-100 text-yellow-800', blue: 'bg-blue-100 text-blue-800',
    gray: 'bg-gray-100 text-gray-600', amber: 'bg-amber-100 text-amber-800',
    purple: 'bg-purple-100 text-purple-800',
  }
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colorMap[color]}`}>{label}</span>
  )
}