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
    <div className="relative flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 text-xs font-medium overflow-hidden">
      <div
        className={`absolute top-0.5 bottom-0.5 rounded-md bg-blue-600 dark:bg-blue-500 shadow-sm transition-all duration-300 ease-out ${mode === 'auto' ? 'left-0.5 right-1/2' : 'left-1/2 right-0.5'}`}
      />
      <button onClick={() => onChange('auto')}
        className={`relative z-10 flex-1 px-3 py-1.5 rounded-md transition-colors duration-200 ${mode === 'auto' ? 'text-white' : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white'}`}>
        🤖 {t('home.auto')}
      </button>
      <button onClick={() => onChange('manual')}
        className={`relative z-10 flex-1 px-3 py-1.5 rounded-md transition-colors duration-200 ${mode === 'manual' ? 'text-white' : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white'}`}>
        👆 {t('home.manual')}
      </button>
    </div>
  )
}
