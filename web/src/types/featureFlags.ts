// TypeScript types and interfaces for Feature Flags System

export type FeatureCategory = 'payment' | 'wallet' | 'ai' | 'notification' | 'security' | 'system'

export interface FeatureFlag {
  key: string
  label: string
  description: string
  enabled: boolean
  category: FeatureCategory
  requires_config: boolean
  config_completed: boolean
  created_at?: string
  updated_at?: string
  updated_by?: string
}

export interface AppSetting {
  key: string
  value: string | null
  value_type: 'text' | 'number' | 'boolean' | 'json'
  category: string
  label: string
  description: string
  is_public: boolean
  created_at?: string
  updated_at?: string
}

export interface FeatureFlagGuardProps {
  flag: string
  fallback?: React.ReactNode
  children: React.ReactNode
}

export interface FeatureFlagContextType {
  flags: Record<string, boolean>
  loading: boolean
  error: string | null
  isEnabled: (key: string) => boolean
  refetch: () => Promise<void>
}

export interface AppSettings {
  [key: string]: string | null
}

export interface FeatureFlagToggleRequest {
  key: string
  enabled: boolean
}

export interface FeatureFlagResponse {
  key: string
  enabled: boolean
  requires_config: boolean
  config_completed: boolean
  label?: string
  description?: string
}

export interface ListFlagsResponse {
  flags: FeatureFlag[]
}
