'use client'

import { ReactNode } from 'react'

type Variant = 'text' | 'card' | 'avatar' | 'rect' | 'circle'

interface SkeletonProps {
  variant?: Variant
  width?: string | number
  height?: string | number
  className?: string
  cols?: number
  children?: ReactNode
}

const BASE = 'animate-pulse bg-gray-200 dark:bg-gray-700 rounded shrink-0'

function dim(v: string | number | undefined | null, fb: string | number): string {
  const val = v ?? fb
  return typeof val === 'number' ? `${val}px` : val
}

export default function Skeleton({ variant = 'text', width, height, className = '', cols, children }: SkeletonProps) {
  if (children) {
    return <div className={`animate-pulse ${className}`}>{children}</div>
  }

  switch (variant) {
    case 'text':
      return <div className={`${BASE} h-4 ${className}`} style={{ width: dim(width, '100%') }} />
    case 'card':
      return <div className={`${BASE} h-32 rounded-xl ${className}`} style={{ width: dim(width, '100%'), height: dim(height, '128px') }} />
    case 'avatar':
      return <div className={`${BASE} rounded-full shrink-0 ${className}`} style={{ width: dim(width, 40), height: dim(height, 40) }} />
    case 'circle':
      return <div className={`${BASE} rounded-full ${className}`} style={{ width: dim(width, 40), height: dim(height, 40) }} />
    case 'rect':
      return <div className={`${BASE} ${className}`} style={{ width: dim(width, '100%'), height: dim(height, '80px') }} />
    default:
      return <div className={`${BASE} h-4 ${className}`} style={{ width: dim(width, '100%') }} />
  }
}

export function SkeletonTable({ rows = 3, cols: columnCount = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-3">
          {Array.from({ length: columnCount }).map((_, c) => (
            <Skeleton key={c} variant="text" width={`${100 / columnCount}%`} />
          ))}
        </div>
      ))}
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className="animate-pulse space-y-4 p-4 border border-gray-100 dark:border-gray-700 rounded-xl">
      <Skeleton variant="text" width="60%" />
      <Skeleton variant="text" width="40%" />
      <Skeleton variant="rect" height="60px" />
      <div className="flex gap-2">
        <Skeleton variant="text" width="30%" />
        <Skeleton variant="text" width="20%" />
      </div>
    </div>
  )
}
