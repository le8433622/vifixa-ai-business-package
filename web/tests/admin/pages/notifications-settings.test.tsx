import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import NotificationsSettings from '@/app/admin/settings/notifications/page.tsx'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

describe('Notifications Settings Page Smoke Test', () => {
  it('renders with feature flags enabled', async () => {
    vi.mock('@/lib/supabase', () => {
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: () => chain,
        order: () => Promise.resolve({ data: [
          { key: 'notif_smtp_host', value: 'smtp.example.com', value_type: 'text', category: 'notification', label: 'SMTP Host', description: 'SMTP server', is_public: false },
        ], error: null }),
      }
      return { supabase: { from: () => chain } }
    })

    vi.mock('@/components/Toast', () => ({
      useToast: () => ({ toast: vi.fn() }),
    }))

    vi.mock('@/components/FeatureFlagProvider', () => ({
      useFeatureFlags: () => ({
        isEnabled: () => true,
        flags: {},
        loading: false,
        error: null,
      }),
    }))

    vi.mock('next/navigation', () => ({
      useRouter: () => ({ push: vi.fn() }),
    }))

    render(
      <QueryClientProvider client={new QueryClient()}>
        <NotificationsSettings />
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Notifications Settings')).toBeInTheDocument()
      expect(screen.getByText('Configure email (SMTP), SMS, and push notification providers.')).toBeInTheDocument()
    })
  })
})