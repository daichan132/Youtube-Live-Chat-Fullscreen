import { type CSSProperties, type KeyboardEvent, type PointerEvent, useId, useRef, useState } from 'react'
import { TbAdjustmentsHorizontal, TbArrowsHorizontal, TbGripVertical } from '@/shared/components/icons'
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
  onSettingsClick: (source: HTMLElement) => void
  onPointerDown: (event: PointerEvent<HTMLElement>) => void
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void
  onEnterControls: () => void
  onLeaveControls: () => void
  onMoveBy?: (delta: { x: number; y: number }) => void
  onResizeBy?: (delta: { width: number; height: number }) => void
  onFocusControls?: (focused: boolean) => void
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
  onFocusControls,
  onMoveBy,
  onResizeBy,
}: OverlayControlRailProps) => {
  const t = useT()
  const dragDescriptionId = useId()
  const [focused, setFocused] = useState(false)
  const [placementOpen, setPlacementOpen] = useState(false)
  const placementButtonRef = useRef<HTMLButtonElement>(null)
  const closePlacement = () => {
    setPlacementOpen(false)
    placementButtonRef.current?.focus()
  }
  const displayed = isReady && (isVisible || focused || placementOpen)
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
      onKeyDown={event => {
        if (event.key === 'Escape' && placementOpen) {
          event.preventDefault()
          event.stopPropagation()
          closePlacement()
        }
      }}
      onFocusCapture={() => {
        setFocused(true)
        onFocusControls?.(true)
      }}
      onBlurCapture={event => {
        if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return
        setFocused(false)
        onFocusControls?.(false)
      }}
      onMouseEnter={onEnterControls}
      onMouseLeave={onLeaveControls}
      style={{
        ...placement,
        transition: focused ? 'none' : undefined,
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
        disabled={!isReady}
        tabIndex={isReady ? 0 : -1}
        onClick={event => onSettingsClick(event.currentTarget)}
      >
        <TbAdjustmentsHorizontal size={22} color={color} strokeWidth={ICON_STROKE_WIDTH} />
      </button>
      <button
        type='button'
        data-ylc-drag-handle
        className={dragCursorClass}
        style={{ border: 0, background: 'transparent', padding: 0, color: 'inherit' }}
        onPointerDown={handlePointerDown}
        onKeyDown={onKeyDown}
        disabled={!isReady}
        tabIndex={isReady ? 0 : -1}
        aria-label={t('content.aria.dragToMove')}
        aria-roledescription={t('content.aria.dragHandle')}
        aria-describedby={dragDescriptionId}
      >
        <div className={`ylc-overlay-control-icon ${dragCursorClass} ${isDragging ? 'ylc-overlay-control-icon-active' : ''}`}>
          <TbGripVertical size={22} color={color} strokeWidth={ICON_STROKE_WIDTH} />
        </div>
        <span id={dragDescriptionId} style={VISUALLY_HIDDEN_STYLE}>
          {t('content.aria.arrowKeysToMove')}
        </span>
      </button>
      <button
        type='button'
        ref={placementButtonRef}
        className='ylc-overlay-control-icon ylc-theme-focus-ring cursor-pointer'
        data-ylc-placement-button
        disabled={!isReady}
        aria-label={t('content.placement.open')}
        aria-expanded={placementOpen}
        onClick={() => setPlacementOpen(value => !value)}
      >
        <TbArrowsHorizontal size={22} color={color} strokeWidth={ICON_STROKE_WIDTH} />
      </button>
      {placementOpen && isReady ? (
        <fieldset
          aria-label={t('content.placement.open')}
          data-ylc-placement-panel
          className='absolute right-0 bottom-full mb-1 grid grid-cols-2 gap-1 rounded-lg p-2 shadow-lg'
          style={{
            background: toRgba(backgroundColor, 1),
            color,
            width: 240,
            minWidth: 0,
            boxSizing: 'border-box',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 8,
          }}
        >
          {(['up', 'down', 'left', 'right', 'narrower', 'wider', 'shorter', 'taller'] as const).map(action => (
            <button
              key={action}
              type='button'
              className='ylc-theme-focus-ring rounded border border-solid ylc-theme-border px-2 py-2 text-xs leading-tight cursor-pointer'
              onClick={() => {
                if (action === 'up') onMoveBy?.({ x: 0, y: -10 })
                if (action === 'down') onMoveBy?.({ x: 0, y: 10 })
                if (action === 'left') onMoveBy?.({ x: -10, y: 0 })
                if (action === 'right') onMoveBy?.({ x: 10, y: 0 })
                if (action === 'narrower') onResizeBy?.({ width: -10, height: 0 })
                if (action === 'wider') onResizeBy?.({ width: 10, height: 0 })
                if (action === 'shorter') onResizeBy?.({ width: 0, height: -10 })
                if (action === 'taller') onResizeBy?.({ width: 0, height: 10 })
              }}
            >
              {t(`content.placement.${action}`)}
            </button>
          ))}
          <button type='button' className='ylc-btn ylc-theme-focus-ring col-span-2' onClick={closePlacement}>
            {t('popup.importClose')}
          </button>
        </fieldset>
      ) : null}
    </div>
  )
}
