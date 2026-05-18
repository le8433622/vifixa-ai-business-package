import type { Meta, StoryObj } from '@storybook/react'
import Skeleton, { SkeletonTable, SkeletonCard } from './Skeleton'

const meta = {
  title: 'UI/Skeleton',
  component: Skeleton,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof Skeleton>

export default meta
type Story = StoryObj<typeof meta>

export const Text: Story = {
  args: { variant: 'text', width: '200px' },
}

export const Card: Story = {
  args: { variant: 'card', width: '300px' },
}

export const Avatar: Story = {
  args: { variant: 'avatar' },
}

export const Circle: Story = {
  args: { variant: 'circle', width: 60, height: 60 },
}

export const Rect: Story = {
  args: { variant: 'rect', width: '300px', height: '80px' },
}

export const Table: StoryObj = {
  render: () => <SkeletonTable rows={3} cols={4} />,
}

export const CardLayout: StoryObj = {
  render: () => <SkeletonCard />,
}
