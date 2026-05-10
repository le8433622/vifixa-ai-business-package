import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import WalletSettings from '@/app/admin/settings/wallet/page.tsx'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

describe('Wallet Settings Page Smoke Test', () => {
  function createWrapper() {
    return function Wrapper({ children }: { children: React.ReactNode }) {
      return (
        <QueryClientProvider client={new QueryClient()}>
          {children}
        </QueryClientProvider>
      )
    }
  }

  it('renders without crashing', async () => {
    vi.mock('@/lib/supabase', () => {
        const chain: Record<string, unknown> = {
          select: () => chain,
          eq: () => chain,
          in: () => chain,
          single: () => Promise.resolve({ data: null, error: null }),
          order: () => Promise.resolve({ data: [
            { key: 'wallet_address', value: '0x123...', value_type: 'text', category: 'wallet', label: 'Wallet Address', description: 'Your wallet address', is_public: false },
            { key: 'auto_withdraw', value: 'false', value_type: 'boolean', category: 'wallet', label: 'Auto Withdraw', description: 'Auto withdraw setting', is_public: false },
          ], error: null }),
        }
        return { supabase: { from: () => chain } }
      })

    vi.mock('@/components/Toast', () => ({
      useToast: () => ({
        toast: vi.fn(),
      }),
    }))

    vi.mock('@/components/FeatureFlagProvider', () => ({
      useFeatureFlags: () => ({
        isEnabled: () => true,
        flags: {},
        loading: false,
        error: null,
        provider: 'local',
        refresh: vi.fn(),
        updateFromRemote: vi.fn(),
      }),
    }))

    vi.mock('next/navigation', () => ({
      useRouter: () => ({
        push: vi.fn(),
      }),
    }))

    render(
      <QueryClientProvider client={new QueryClient()}>
        <WalletSettings />
      </QueryClientProvider>
    )

    expect(screen.getByText('Wallet & Billing Settings')).toBeInTheDocument()
    expect(screen.getByText('Configure wallet and billing system preferences.')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Wallet Address')).toBeInTheDocument()
      expect(screen.getByText('Auto Withdraw')).toBeInTheDocument()
    })
  })
})