'use client'

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

export type CurrencyCode = 'VND' | 'USD' | 'THB' | 'IDR'

const CURRENCIES: Record<CurrencyCode, { symbol: string; locale: string; decimals: number }> = {
  VND: { symbol: '₫', locale: 'vi-VN', decimals: 0 },
  USD: { symbol: '$', locale: 'en-US', decimals: 2 },
  THB: { symbol: '฿', locale: 'th-TH', decimals: 2 },
  IDR: { symbol: 'Rp', locale: 'id-ID', decimals: 0 },
}

interface CurrencyContextType {
  currency: CurrencyCode
  setCurrency: (c: CurrencyCode) => void
  rates: Record<string, number>
  convert: (amount: number, from: CurrencyCode) => number
  format: (amount: number, target?: CurrencyCode) => string
  availableCurrencies: CurrencyCode[]
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: 'VND',
  setCurrency: () => {},
  rates: { VND: 1, USD: 25450, THB: 695, IDR: 1.58 },
  convert: (a) => a,
  format: (a) => a.toLocaleString() + '₫',
  availableCurrencies: ['VND', 'USD', 'THB', 'IDR'],
})

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>('VND')
  const [rates, setRates] = useState<Record<string, number>>({
    VND: 1, USD: 25450, THB: 695, IDR: 1.58,
  })

  useEffect(() => {
    const stored = localStorage.getItem('preferred_currency') as CurrencyCode | null
    if (stored && ['VND', 'USD', 'THB', 'IDR'].includes(stored)) {
      setCurrencyState(stored)
    }
  }, [])

  useEffect(() => {
    supabase.from('exchange_rates').select('from_currency, to_currency, rate')
      .then(({ data }) => {
        if (data) {
          const map: Record<string, number> = { VND: 1 }
          for (const r of data) {
            if (r.to_currency === 'VND') map[r.from_currency] = Number(r.rate)
          }
          setRates(map)
        }
      })
  }, [])

  const setCurrency = useCallback((c: CurrencyCode) => {
    setCurrencyState(c)
    localStorage.setItem('preferred_currency', c)
  }, [])

  const convert = useCallback((amount: number, from: CurrencyCode = 'VND'): number => {
    if (from === currency) return amount
    const inVnd = from === 'VND' ? amount : amount * (rates[from] || 1)
    if (currency === 'VND') return inVnd
    return inVnd / (rates[currency] || 1)
  }, [currency, rates])

  const format = useCallback((amount: number, target?: CurrencyCode): string => {
    const c = target || currency
    const info = CURRENCIES[c]
    const converted = target ? amount : convert(amount)
    try {
      return new Intl.NumberFormat(info.locale, {
        style: 'currency',
        currency: c,
        minimumFractionDigits: info.decimals,
        maximumFractionDigits: info.decimals,
      }).format(converted)
    } catch {
      return info.symbol + converted.toLocaleString(info.locale)
    }
  }, [currency, convert])

  return (
    <CurrencyContext.Provider value={{
      currency,
      setCurrency,
      rates,
      convert,
      format,
      availableCurrencies: ['VND', 'USD', 'THB', 'IDR'],
    }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  return useContext(CurrencyContext)
}
