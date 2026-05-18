import type { Meta, StoryObj } from '@storybook/react'
import { ThemeProvider, useTheme } from './ThemeProvider'

const ThemeDisplay = () => {
  const { theme, toggle } = useTheme()
  return (
    <div className="p-4 space-y-2">
      <p>Current theme: <strong>{theme}</strong></p>
      <button onClick={toggle} className="px-4 py-2 bg-primary text-white rounded-lg">
        Toggle
      </button>
    </div>
  )
}

const meta = {
  title: 'Common/ThemeToggle',
  component: ThemeProvider,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof ThemeProvider>

export default meta
type Story = StoryObj<typeof meta>

export const LightMode: Story = {
  args: {
    children: <ThemeDisplay />,
  },
}
