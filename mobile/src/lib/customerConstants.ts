// Shared constants for customer screens
// Centralize status colors, labels, and types

import { Dimensions } from 'react-native'

export interface Order {
  id: string
  category: string
  description: string
  status: string
  estimated_price: number
  final_price?: number
  ai_diagnosis?: {
    diagnosis?: string
    severity?: string
    recommended_skills?: string[]
    estimated_price_range?: { min: number; max: number }
  }
  before_media?: string[]
  after_media?: string[]
  media_urls?: string[]
  worker_id?: string
  rating?: number
  review_comment?: string
  created_at: string
  updated_at?: string
}

export const STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ xử lý',
  matched: 'Đã ghép thợ',
  in_progress: 'Đang thực hiện',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
  disputed: 'Khiếu nại',
}

export const STATUS_COLORS: Record<string, string> = {
  pending: '#fef3c7',
  matched: '#dbeafe',
  in_progress: '#ede9fe',
  completed: '#dcfce7',
  cancelled: '#f3f4f6',
  disputed: '#fee2e2',
}

export const STATUS_TEXT_COLORS: Record<string, string> = {
  pending: '#92400e',
  matched: '#1e40af',
  in_progress: '#6b21a8',
  completed: '#166534',
  cancelled: '#4b5563',
  disputed: '#991b1b',
}

export const THEME = {
  primary: '#3b82f6',
  primaryLight: '#eff6ff',
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  background: '#f5f5f5',
  white: '#ffffff',
  textPrimary: '#1f2937',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',
  border: '#e5e7eb',
  shadow: '#000',
} as const

export const { width: SCREEN_WIDTH } = Dimensions.get('window')

export function formatPrice(price: number | undefined | null): string {
  if (!price && price !== 0) return 'Chưa có giá'
  return price.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getStatusColor(status: string) {
  return STATUS_COLORS[status] || '#f3f4f6'
}

export function getStatusTextColor(status: string) {
  return STATUS_TEXT_COLORS[status] || '#4b5563'
}

export function getStatusLabel(status: string) {
  return STATUS_LABELS[status] || status
}