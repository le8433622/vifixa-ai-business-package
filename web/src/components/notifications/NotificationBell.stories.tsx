import type { Meta, StoryObj } from '@storybook/react'
import NotificationBell from './NotificationBell'

const meta = {
  title: 'Notifications/NotificationBell',
  component: NotificationBell,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof NotificationBell>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
}
