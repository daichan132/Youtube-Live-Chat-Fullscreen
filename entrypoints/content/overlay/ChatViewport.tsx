import { useAtomValue } from 'jotai'
import { useId, useMemo } from 'react'
import { CHAT_PANEL_LAYER } from '@/shared/constants/zIndex'
import { useT } from '@/shared/i18n/react'
import { effectiveProfileAtom } from '@/shared/state'
import { useChatRuntimeInstance } from '../runtime/ChatRuntimeContext'

type ChatViewportProps = {
  loading: boolean
  visible: boolean
}

const LOADING_OVERLAY_STYLE = {
  zIndex: CHAT_PANEL_LAYER.interactionOverlay,
} as const

export const ChatViewport = ({ loading, visible }: ChatViewportProps) => {
  const chatRuntime = useChatRuntimeInstance()
  const t = useT()
  const carrierId = useId()
  const appearance = useAtomValue(effectiveProfileAtom).appearance
  const chatVisible = visible && !loading
  const loaderColor = useMemo(() => {
    const { r, g, b, a } = appearance.fontColor
    const grayLuma = Math.round(r * 0.299 + g * 0.587 + b * 0.114)
    const desaturateMix = 0.68
    return {
      r: Math.round(r * (1 - desaturateMix) + grayLuma * desaturateMix),
      g: Math.round(g * (1 - desaturateMix) + grayLuma * desaturateMix),
      b: Math.round(b * (1 - desaturateMix) + grayLuma * desaturateMix),
      a: Math.min(0.5, Math.max(0.22, a * 0.55)),
    }
  }, [appearance.fontColor])
  const backgroundColor = appearance.backgroundColor
  const backdropFilter = appearance.blur > 0 ? `blur(${appearance.blur}px)` : 'none'

  return (
    <>
      <div
        data-ylc-chat-background
        className='absolute inset-0 rounded-md transition-[background-color,opacity] duration-200 ease-out'
        style={{
          backgroundColor: `rgba(${backgroundColor.r}, ${backgroundColor.g}, ${backgroundColor.b}, ${backgroundColor.a})`,
          backdropFilter,
          WebkitBackdropFilter: backdropFilter,
          opacity: chatVisible ? 1 : 0,
        }}
      />
      <div
        data-ylc-chat-viewport
        className='relative h-full w-full overflow-hidden rounded-md transition-opacity duration-320 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[opacity]'
        style={{ opacity: chatVisible ? 1 : 0 }}
      >
        <div id={carrierId} ref={chatRuntime.setOverlayContainer} data-ylc-iframe-carrier className='absolute inset-0' />
      </div>
      {loading ? (
        <div
          aria-hidden='true'
          data-ylc-loading-overlay
          className='absolute inset-0 flex items-center justify-center pointer-events-auto transition-opacity duration-140 ease-out'
          style={LOADING_OVERLAY_STYLE}
        >
          <div className='flex justify-center'>
            <div
              className='animate-ping h-5 w-5 rounded-full'
              style={{
                backgroundColor: `rgba(${loaderColor.r}, ${loaderColor.g}, ${loaderColor.b}, ${loaderColor.a})`,
              }}
            />
          </div>
        </div>
      ) : null}
      {/* <output> carries an implicit role=status. A live region announces its content, never its name, and
          only once it is already in the tree, so the wait is spoken as text in a region that always exists. */}
      <output className='ylc-visually-hidden'>{loading ? t('content.aria.loading') : ''}</output>
    </>
  )
}
