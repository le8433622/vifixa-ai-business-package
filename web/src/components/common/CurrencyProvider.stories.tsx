import type { Meta, StoryObj } from '@storybook/react'
import { CurrencyProvider, useCurrency } from './CurrencyProvider'

const CurrencyDisplay = () => {
  const { currency, setCurrency, format } = useCurrency()
  return (
    <div className="p-4 space-y-3">
      <p>Currency: <strong>{currency}</strong></p>
      <p>149,000 VND = {format(149000)}</p>
      <div className="flex gap-2">
        {(['VND', 'USD', 'THB', 'IDR'] as const).map(c => (
          <button
            key={c}
            onClick={() => setCurrency(c)}
            className={`px-3 py-1 rounded ${currency === c ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  )
}

const meta = {
  title: 'Common/CurrencyToggle',
  component: CurrencyProvider,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof CurrencyProvider>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: <CurrencyDisplay />,
  },
}
