import type { Meta, StoryObj } from '@storybook/react-vite'
import { useEffect, useState } from 'react'
import { Switch } from '@/shared/components/Switch'

type SwitchStoryProps = {
  checked: boolean
}

const SwitchPreview = ({ checked }: SwitchStoryProps) => {
  const [isChecked, setIsChecked] = useState(checked)

  useEffect(() => {
    setIsChecked(checked)
  }, [checked])

  return <Switch checked={isChecked} id='storybook-shared-switch' onChange={setIsChecked} />
}

const meta = {
  title: 'Shared/Switch',
  component: SwitchPreview,
  tags: ['autodocs'],
  args: {
    checked: true,
  },
  argTypes: {
    checked: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof SwitchPreview>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
