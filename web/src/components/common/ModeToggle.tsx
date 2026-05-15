'use client'

import { useLanguage } from './LanguageToggle'

export type AppMode = 'auto' | 'manual'

interface ModeToggleProps {
  mode: AppMode
  onChange: (mode: AppMode) => void
}

export default function ModeToggle({ mode, onChange }: ModeToggleProps) {
  const { t } = useLanguage()
  return (
    <div className="flex bg-gray-100 rounded-lg p-0.5 text-xs font-medium">
      <button onClick={() => onChange('auto')}
        className={`px-3 py-1.5 rounded-md transition-all ${mode === 'auto' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>
        🤖 {t('home.auto')}
      </button>
      <button onClick={() => onChange('manual')}
        className={`px-3 py-1.5 rounded-md transition-all ${mode === 'manual' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>
        👆 {t('home.manual')}
      </button>
    </div>
  )
}
