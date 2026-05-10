'use client'

import Link from 'next/link'

interface SettingsPageProps {
  title: string
  description: string
  children: React.ReactNode
}

export default function SettingsPage({ title, description, children }: SettingsPageProps) {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="text-gray-600 mt-1">{description}</p>
        </div>
        <Link href="/admin/settings" className="text-sm text-blue-600 hover:underline">
          ← Back to Settings
        </Link>
      </div>
      {children}
    </div>
  )
}
