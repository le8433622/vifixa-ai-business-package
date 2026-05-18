import type { Meta, StoryObj } from '@storybook/react'
import ErrorBoundary from './ErrorBoundary'

const SafeContent = () => <div className="p-8 text-center">Nội dung bình thường — không có lỗi</div>

const meta = {
  title: 'UI/ErrorBoundary',
  component: ErrorBoundary,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof ErrorBoundary>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: <SafeContent />,
  },
}

export const WithCustomFallback: Story = {
  args: {
    fallback: <div className="p-8 text-center text-red-500">Fallback tùy chỉnh</div>,
    children: <SafeContent />,
  },
}
