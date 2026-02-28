import type { CSSProperties } from 'react'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { IoChatboxSharp } from '@/shared/components/icons'
import { useGlobalSettingStore } from '@/shared/stores'

const SWITCH_BUTTON_BASE_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  WebkitAlignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  width: '100%',
  position: 'relative',
  cursor: 'pointer',
  color: 'var(--yt-spec-static-brand-white, #fff)',
  transition: 'opacity .1s cubic-bezier(0, 0, 0.2, 1)',
}

const ICON_BASE_STYLE: CSSProperties = {
  color: 'currentColor',
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
}

export const YTDLiveChatSwitch = () => {
  const { t } = useTranslation()
  const ytdLiveChat = useGlobalSettingStore(state => state.ytdLiveChat)
  const setYTDLiveChat = useGlobalSettingStore(state => state.setYTDLiveChat)
  const handleClick = useCallback(() => {
    const current = useGlobalSettingStore.getState().ytdLiveChat
    setYTDLiveChat(!current)
  }, [setYTDLiveChat])
  const isActive = ytdLiveChat

  const buttonStyle = useMemo<CSSProperties>(
    () => ({
      ...SWITCH_BUTTON_BASE_STYLE,
      opacity: isActive ? 1 : 0.6,
    }),
    [isActive],
  )

  const iconStyle = useMemo<CSSProperties>(
    () => ({
      ...ICON_BASE_STYLE,
      opacity: isActive ? 1 : 0.72,
    }),
    [isActive],
  )

  return (
    <button
      type='button'
      className='ytp-button'
      style={buttonStyle}
      aria-label={t('content.aria.toggleLiveChat')}
      aria-pressed={isActive}
      onClick={handleClick}
    >
      <IoChatboxSharp size={'50%'} style={iconStyle} />
    </button>
  )
}
