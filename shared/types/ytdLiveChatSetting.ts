import type { IconType } from '@/shared/components/icons'

export interface SettingItemType {
  icon: IconType
  title: string
  data: React.ReactNode
  disable?: boolean
  actionWidth?: 'default' | 'wide'
}
