'use client'

import { useCurrency, CurrencyCode } from './CurrencyProvider'
import { useLanguage } from './LanguageToggle'

const FLAGS: Record<CurrencyCode, string> = {
  VND: '🇻🇳',
  USD: '🇺🇸',
  THB: '🇹🇭',
  IDR: '🇮🇩',
}

export default function CurrencyToggle() {
  const { currency, setCurrency, availableCurrencies } = useCurrency()
  const { t } = useLanguage()

  return (
    <div className="flex items-center gap-1" title={t('common.currency') || 'Currency'}>
      {availableCurrencies.map(c => (
        <button
          key={c}
          onClick={() => setCurrency(c)}
          className={`px-2 py-1 text-xs rounded-full font-medium transition ${
            currency === c
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 ring-1 ring-blue-300'
              : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
          }`}
        >
          {FLAGS[c]} {c}
        </button>
      ))}
    </div>
  )
}
