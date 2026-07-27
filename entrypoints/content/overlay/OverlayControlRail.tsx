import { type CSSProperties, type KeyboardEvent, type PointerEvent, useId } from 'react'
import { TbAdjustmentsHorizontal, TbGripVertical } from '@/shared/components/icons'
import { CHAT_PANEL_LAYER } from '@/shared/constants/zIndex'
import { useT } from '@/shared/i18n/react'
import type { RGBA } from '@/shared/settings/model'

const ICON_STROKE_WIDTH = 1.55
const CONTROL_GAP = 2
const VISUALLY_HIDDEN_STYLE: CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0,0,0,0)',
  whiteSpace: 'nowrap',
  border: 0,
}

type OverlayControlRailProps = {
  isDragging: boolean
  isReady: boolean
  isVisible: boolean
  placement: CSSProperties
  backgroundColor: RGBA
  fontColor: RGBA
  onSettingsClick: () => void
  onPointerDown: (event: PointerEvent<HTMLElement>) => void
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void
  onEnterControls: () => void
  onLeaveControls: () => void
}

const toRgba = (color: RGBA, alpha = color.a) => `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`

export const OverlayControlRail = ({
  isDragging,
  isReady,
  isVisible,
  placement,
  backgroundColor,
  fontColor,
  onSettingsClick,
  onPointerDown: handlePointerDown,
  onKeyDown,
  onEnterControls,
  onLeaveControls,
}: OverlayControlRailProps) => {
  const t = useT()
  const dragDescriptionId = useId()
  const displayed = isReady && isVisible
  const color = toRgba(fontColor)
  const dragCursorClass = isDragging ? 'cursor-grabbing' : 'cursor-grab'
  const runtimeStyle = {
    '--ylc-overlay-control-rail-bg-runtime': toRgba(backgroundColor),
    '--ylc-overlay-control-hover-runtime': toRgba(fontColor, 0.1),
    color,
  } as CSSProperties

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Hover only keeps controls visible; buttons inside remain semantic.
    <div
      data-ylc-control-rail
      className='ylc-overlay-control-rail absolute flex items-center'
      onMouseEnter={onEnterControls}
      onMouseLeave={onLeaveControls}
      style={{
        ...placement,
        gap: CONTROL_GAP,
        opacity: displayed ? 1 : 0,
        pointerEvents: displayed ? 'auto' : 'none',
        zIndex: CHAT_PANEL_LAYER.controls,
        transform: displayed ? 'translateY(0) scale(1)' : 'translateY(-2px) scale(0.98)',
        ...runtimeStyle,
      }}
    >
      <button
        type='button'
        data-ylc-settings-btn
        className='ylc-overlay-control-icon cursor-pointer ylc-theme-focus-ring'
        aria-label={t('content.aria.openSettings')}
        disabled={!displayed}
        tabIndex={displayed ? 0 : -1}
        onClick={onSettingsClick}
      >
        <TbAdjustmentsHorizontal size={22} color={color} strokeWidth={ICON_STROKE_WIDTH} />
      </button>
      <button
        type='button'
        className={dragCursorClass}
        style={{ border: 0, background: 'transparent', padding: 0, color: 'inherit' }}
        onPointerDown={handlePointerDown}
        onKeyDown={onKeyDown}
        disabled={!displayed}
        tabIndex={displayed ? 0 : -1}
        aria-label={t('content.aria.dragToMove')}
        aria-roledescription='drag handle'
        aria-describedby={dragDescriptionId}
      >
        <div className={`ylc-overlay-control-icon ${dragCursorClass} ${isDragging ? 'ylc-overlay-control-icon-active' : ''}`}>
          <TbGripVertical size={22} color={color} strokeWidth={ICON_STROKE_WIDTH} />
        </div>
        <span id={dragDescriptionId} style={VISUALLY_HIDDEN_STYLE}>
          {t('content.aria.arrowKeysToMove')}
        </span>
      </button>
    </div>
  )
}
