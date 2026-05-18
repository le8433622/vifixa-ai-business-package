import type { Meta, StoryObj } from '@storybook/react'
import EmptyState from './EmptyState'

const meta = {
  title: 'UI/EmptyState',
  component: EmptyState,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof EmptyState>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    icon: '📦',
    title: 'Chưa có dữ liệu',
    description: 'Chưa có đơn hàng nào trong hệ thống.',
  },
}

export const WithAction: Story = {
  args: {
    icon: '🔍',
    title: 'Không tìm thấy kết quả',
    description: 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.',
    actionLabel: 'Đặt lại bộ lọc',
    onAction: () => alert('Reset!'),
  },
}

export const CustomIcon: Story = {
  args: {
    icon: '🚀',
    title: 'Sẵn sàng!',
    description: 'Bạn đã hoàn thành tất cả các bước thiết lập.',
  },
}
