'use client'

import { ReactNode } from 'react'

export default function PageTransition({ children }: { children: ReactNode }) {
  return <div className="animate-fade-in w-full">{children}</div>
}
