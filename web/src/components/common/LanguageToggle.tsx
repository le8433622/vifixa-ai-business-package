'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { translate, type Locale } from '@/lib/i18n'

const LanguageContext = createContext<{
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: string) => string
}>({
  locale: 'vi',
  setLocale: () => {},
  t: (key: string) => key,
})

export function LanguageProvider({ children, initialLocale = 'vi' }: { children: ReactNode; initialLocale?: Locale }) {
  const [locale, setLocale] = useState<Locale>(initialLocale)
  const t = (key: string) => translate(key, locale)
  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}

export default function LanguageToggle() {
  const { locale, setLocale } = useLanguage()
  return (
    <button onClick={() => setLocale(locale === 'vi' ? 'en' : 'vi')}
      className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition flex items-center gap-1">
      <span className="text-base">{locale === 'vi' ? '🇻🇳' : '🇬🇧'}</span>
      <span>{locale === 'vi' ? 'VI' : 'EN'}</span>
    </button>
  )
}
