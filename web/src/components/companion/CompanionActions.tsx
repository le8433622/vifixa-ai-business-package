'use client'

interface ActionProps {
  actions: Array<{ type: string; label: string; data?: any }>
  onAction: (action: { type: string; label: string; data?: any }) => void
}

export default function CompanionActions({ actions, onAction }: ActionProps) {
  if (!actions || actions.length === 0) {
    return null
  }

  return (
    <div className="mt-4 space-y-2">
      {actions.map((action, index) => (
        <button
          key={index}
          onClick={() => onAction(action)}
          className={`w-full py-2 px-4 rounded-full text-xs font-bold transition-all ${
            action.type === 'diagnose' || action.type === 'estimate_price'
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : action.type === 'match_worker' || action.type === 'process_payment'
              ? 'bg-emerald-500 text-white hover:bg-emerald-600'
              : action.type === 'view_history' || action.type === 'view_orders'
              ? 'bg-purple-500 text-white hover:bg-purple-600'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {action.label}
        </button>
      ))}
    </div>
  )
}