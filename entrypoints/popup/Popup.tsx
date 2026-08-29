import { useAtomValue } from 'jotai'
import { type ReactNode, useEffect } from 'react'
import { type IconType, TbArchive, TbHeart, TbLanguage, TbLink, TbMessageCircle, TbSunMoon } from '@/shared/components/icons'
import { PersistenceNotice } from '@/shared/components/PersistenceNotice'
import { useLocaleDirection, useT } from '@/shared/i18n/react'
import { themeModeAtom } from '@/shared/state'
import { useResolvedThemeMode } from '@/shared/theme'
import { DataTransfer } from './components/DataTransfer'
import { LanguageSelector } from './components/LanguageSelector'
import { Links } from './components/Links'
import { PopupItemRow } from './components/PopupItemRow'
import { ThemeModeSelector } from './components/ThemeModeSelector'
import { YTDLiveChatSwitch } from './components/YTDLiveChatSwitch'

type PopupItem = {
  id: string
  icon?: IconType
  title: string
  data: ReactNode
  asLabel?: boolean
  actionAuto?: boolean
}

export const Popup = () => {
  const t = useT()
  const direction = useLocaleDirection()
  const themeMode = useAtomValue(themeModeAtom)
  const resolvedThemeMode = useResolvedThemeMode(themeMode)

  useEffect(() => {
    document.documentElement.setAttribute('data-ylc-theme', resolvedThemeMode)
    document.body.setAttribute('data-ylc-theme', resolvedThemeMode)
  }, [resolvedThemeMode])

  const items: PopupItem[] = [
    {
      id: 'toggle-chat',
      icon: TbMessageCircle,
      title: t('popup.showChatOnFullscreen'),
      data: <YTDLiveChatSwitch />,
      asLabel: true,
      actionAuto: true,
    },
    {
      id: 'theme',
      icon: TbSunMoon,
      title: t('popup.theme'),
      data: <ThemeModeSelector />,
    },
    {
      id: 'data-transfer',
      icon: TbArchive,
      title: t('popup.dataTransfer'),
      data: <DataTransfer />,
      actionAuto: true,
    },
    {
      id: 'language',
      icon: TbLanguage,
      title: t('popup.language'),
      data: <LanguageSelector />,
    },
    {
      id: 'links',
      icon: TbLink,
      title: t('popup.links'),
      data: <Links />,
      actionAuto: true,
    },
    {
      id: 'donate',
      icon: TbHeart,
      title: t('popup.donate'),
      data: (
        <a href='https://ko-fi.com/D1D01A39U6' target='_blank' rel='noopener noreferrer' className='ylc-btn'>
          <TbHeart size={16} aria-hidden='true' />
          Buy me a coffee
        </a>
      ),
      actionAuto: true,
    },
  ]

  return (
    <div
      data-ylc-theme={resolvedThemeMode}
      dir={direction}
      className='flex flex-col w-[450px] max-w-full box-border m-0 rounded-xl border border-solid ylc-theme-border overflow-hidden ylc-theme-surface'
    >
      <PersistenceNotice />
      <div className='flex-grow ylc-theme-surface-muted py-2'>
        {items.map((item, index) => (
          <PopupItemRow
            key={item.id}
            icon={item.icon}
            title={item.title}
            data={item.data}
            isLast={index === items.length - 1}
            asLabel={item.asLabel}
            actionAuto={item.actionAuto}
          />
        ))}
      </div>
    </div>
  )
}
