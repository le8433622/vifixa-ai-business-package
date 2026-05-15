'use client'

interface MessageProps {
  message: {
    id: string
    role: 'user' | 'assistant'
    content: string
    actions?: Array<{ type: string; label: string; data?: any }>
  }
  persona: 'customer' | 'worker' | 'admin'
}

export default function CompanionMessage({ message, persona }: MessageProps) {
  // Get avatar icon based on persona and role
  const getAvatarIcon = () => {
    if (message.role === 'user') return '👤'
    switch (persona) {
      case 'customer': return '🤖'
      case 'worker': return '🔧'
      case 'admin': return '🛡️'
      default: return '🤖'
    }
  }

  return (
    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] p-3 rounded-2xl ${
        message.role === 'user'
          ? 'bg-blue-600 text-white rounded-br-md'
          : 'bg-white border rounded-bl-md shadow-sm'
      }`}>
        {message.role === 'assistant' && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{getAvatarIcon()}</span>
          </div>
        )}
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        {message.actions?.map((action, index) => (
          <button
            key={index}
            onClick={() => {
              // Action triggered — parent handles it
            }}
            className={`mt-2 w-full py-2 px-4 rounded-full text-xs font-bold transition-all ${
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
    </div>
  )
}