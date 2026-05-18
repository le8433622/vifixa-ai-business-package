'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  resolved: 'light' | 'dark'
  setTheme: (t: Theme) => void
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'system',
  resolved: 'light',
  setTheme: () => {},
  toggle: () => {},
})

export function ThemeProvider({ children, storageKey = 'vifixa-theme' }: { children: ReactNode; storageKey?: string }) {
  const [theme, setThemeState] = useState<Theme>('system')
  const [resolved, setResolved] = useState<'light' | 'dark'>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem(storageKey) as Theme | null
    if (stored && ['light', 'dark', 'system'].includes(stored)) {
      setThemeState(stored)
    }
  }, [storageKey])

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')

    function apply() {
      const isDark = theme === 'dark' || (theme === 'system' && media.matches)
      setResolved(isDark ? 'dark' : 'light')
      document.documentElement.classList.toggle('dark', isDark)
      document.documentElement.classList.toggle('light', !isDark)
    }

    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])

  function setTheme(t: Theme) {
    setThemeState(t)
    localStorage.setItem(storageKey, t)
  }

  function toggle() {
    setTheme(resolved === 'dark' ? 'light' : 'dark')
  }

  if (!mounted) {
    return <div style={{ visibility: 'hidden' }}>{children}</div>
  }

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}

export default function ThemeToggle() {
  const { resolved, toggle } = useTheme()
  return (
    <button onClick={toggle}
      className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition flex items-center gap-1">
      <span className="text-base">{resolved === 'dark' ? '🌙' : '☀️'}</span>
      <span className="hidden md:inline">{resolved === 'dark' ? 'Tối' : 'Sáng'}</span>
    </button>
  )
}
