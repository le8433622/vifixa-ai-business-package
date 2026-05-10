import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import GeneralSettings from '@/app/admin/settings/general/page.tsx'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

describe('General Settings Page Smoke Test', () => {
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
    vi.mock('@/lib/supabase', () => ({
      supabase: {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [
                {
                  key: 'app_name',
                  value: 'Vifixa AI',
                  value_type: 'text',
                  category: 'general',
                  label: 'Application Name',
                  description: 'Name of the application',
                  is_public: true,
                },
                {
                  key: 'maintenance_mode',
                  value: 'false',
                  value_type: 'boolean',
                  category: 'general',
                  label: 'Maintenance Mode',
                  description: 'Enable maintenance mode',
                  is_public: false,
                },
              ], error: null }),
            }),
          }),
        }),
      },
    }))

    vi.mock('@/components/Toast', () => ({
      useToast: () => ({
        toast: vi.fn(),
      }),
    }))

    vi.mock('next/navigation', () => ({
      useRouter: () => ({
        push: vi.fn(),
      }),
    }))

    render(
      <QueryClientProvider client={new QueryClient()}>
        <GeneralSettings />
      </QueryClientProvider>
    )

    expect(screen.getByText('General Settings')).toBeInTheDocument()
    expect(screen.getByText('Configure application name, description, and contact information.')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Application Name')).toBeInTheDocument()
      expect(screen.getByText('Maintenance Mode')).toBeInTheDocument()
    })
  })
})