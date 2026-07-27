import { useAtomValue, useSetAtom } from 'jotai'
import type { CSSProperties } from 'react'
import { useCallback } from 'react'
import { IoChatboxSharp } from '@/shared/components/icons'
import { useT } from '@/shared/i18n/react'
import { setYTDLiveChatEnabledAtom, ytdLiveChatEnabledAtom } from '@/shared/state'

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

const ACTIVE_INDICATOR_STYLE: CSSProperties = {
  position: 'absolute',
  bottom: '20%',
  left: '50%',
  transform: 'translateX(-50%)',
  width: '40%',
  height: '2px',
  borderRadius: '2px',
  backgroundColor: 'currentColor',
  pointerEvents: 'none',
}

export const YTDLiveChatSwitch = () => {
  const t = useT()
  const ytdLiveChat = useAtomValue(ytdLiveChatEnabledAtom)
  const setYTDLiveChat = useSetAtom(setYTDLiveChatEnabledAtom)
  const handleClick = useCallback(() => {
    setYTDLiveChat(!ytdLiveChat)
  }, [setYTDLiveChat, ytdLiveChat])
  const isActive = ytdLiveChat

  return (
    <button
      type='button'
      className='ytp-button'
      style={SWITCH_BUTTON_BASE_STYLE}
      aria-label={t('content.aria.toggleLiveChat')}
      aria-pressed={isActive}
      onClick={handleClick}
    >
      <IoChatboxSharp size={'50%'} style={ICON_BASE_STYLE} />
      {isActive ? <span aria-hidden='true' style={ACTIVE_INDICATOR_STYLE} /> : null}
    </button>
  )
}
