import { type CSSProperties, type KeyboardEvent, type PointerEvent, useCallback, useId, useLayoutEffect, useRef, useState } from 'react'
import { TbAdjustmentsHorizontal, TbArrowsHorizontal, TbGripVertical } from '@/shared/components/icons'
import { CHAT_PANEL_LAYER } from '@/shared/constants/zIndex'
import { useT } from '@/shared/i18n/react'
import type { RGBA } from '@/shared/settings/model'
import { useOverlayMenuDismiss } from './useOverlayMenuDismiss'

const ICON_STROKE_WIDTH = 1.55
const CONTROL_GAP = 2
const TOOLTIP_GAP = 6
const TOOLTIP_VIEWPORT_PADDING = 8
const CONTROL_SELECTORS = {
  settings: '[data-ylc-settings-btn]',
  drag: '[data-ylc-drag-handle]',
  placement: '[data-ylc-placement-button]',
} as const
type ControlName = 'settings' | 'drag' | 'placement'

type OverlayControlRailProps = {
  isDragging: boolean
  isResizing?: boolean
  isReady: boolean
  isVisible: boolean
  placement: CSSProperties
  placementAnchor?: { right: number; top: number }
  viewportSize?: { width: number; height: number }
  placementPanelMaxHeight?: number
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
  isResizing = false,
  isReady,
  isVisible,
  placement,
  placementAnchor,
  viewportSize,
  placementPanelMaxHeight,
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
  const [hoveredControl, setHoveredControl] = useState<ControlName | null>(null)
  const [focusedControl, setFocusedControl] = useState<ControlName | null>(null)
  const [adjustmentAnchor, setAdjustmentAnchor] = useState<{
    right: number
    top: number
    maxHeight: number | undefined
  } | null>(null)
  const placementButtonRef = useRef<HTMLButtonElement>(null)
  const railRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [tooltipLayout, setTooltipLayout] = useState<{ left: number; top: number; side: 'top' | 'bottom' } | null>(null)
  const dismissPlacement = useCallback(() => {
    setPlacementOpen(false)
    setAdjustmentAnchor(null)
  }, [])
  useOverlayMenuDismiss(placementOpen && isReady, railRef, dismissPlacement)
  // Menu actions move the frame beneath the pointer. Keep their targets in
  // place until closing or a direct manipulation / viewport change reanchors.
  useLayoutEffect(() => {
    setAdjustmentAnchor(null)
    if (!isReady) {
      setPlacementOpen(false)
      setHoveredControl(null)
      setFocusedControl(null)
    }
  }, [isDragging, isResizing, isReady, placementOpen, viewportSize?.width, viewportSize?.height])
  const closePlacement = () => {
    dismissPlacement()
    placementButtonRef.current?.focus({ preventScroll: true })
  }
  const preserveAdjustmentAnchor = () => {
    if (!placementAnchor) return
    setAdjustmentAnchor(current => current ?? { ...placementAnchor, maxHeight: placementPanelMaxHeight })
  }
  const displayed = isReady && (isVisible || focused || placementOpen)
  const color = toRgba(fontColor)
  const dragCursorClass = isDragging ? 'cursor-grabbing' : 'cursor-grab'
  const tooltipControl = hoveredControl ?? focusedControl
  const tooltipLabel =
    tooltipControl &&
    {
      settings: t('content.aria.openSettings'),
      drag: `${t('content.aria.dragToMove')} · ${t('content.aria.arrowKeysToMove')}`,
      placement: t('content.placement.open'),
    }[tooltipControl]
  const tooltipVisible = displayed && Boolean(tooltipLabel) && !placementOpen && !isDragging && !isResizing
  useLayoutEffect(() => {
    const rail = railRef.current
    const tooltip = tooltipRef.current
    const button = tooltipControl && rail?.querySelector<HTMLButtonElement>(CONTROL_SELECTORS[tooltipControl])
    if (!tooltipVisible || !rail || !tooltip || !button) return
    const updatePosition = () => {
      // Geometry is in player coordinates. Remove the rail's visibility scale
      // from fractional tooltip dimensions before positioning in that space.
      const railBounds = rail.getBoundingClientRect()
      const scaleX = (rail.offsetWidth && railBounds.width / rail.offsetWidth) || 1
      const scaleY = (rail.offsetHeight && railBounds.height / rail.offsetHeight) || 1
      const railLeft = placementAnchor ? placementAnchor.right - rail.offsetWidth : railBounds.left
      const railTop = placementAnchor?.top ?? railBounds.top
      const viewportWidth = viewportSize?.width ?? rail.ownerDocument.defaultView?.innerWidth ?? 240
      const viewportHeight = viewportSize?.height ?? rail.ownerDocument.defaultView?.innerHeight ?? 240
      const tooltipBounds = tooltip.getBoundingClientRect()
      const width = tooltipBounds.width / scaleX
      const height = tooltipBounds.height / scaleY
      const center = railLeft + button.offsetLeft + button.offsetWidth / 2
      const left = Math.max(TOOLTIP_VIEWPORT_PADDING, Math.min(center - width / 2, viewportWidth - width - TOOLTIP_VIEWPORT_PADDING))
      const below = railTop + rail.offsetHeight + TOOLTIP_GAP
      const side = below + height <= viewportHeight - TOOLTIP_VIEWPORT_PADDING ? 'bottom' : 'top'
      const top = Math.max(
        TOOLTIP_VIEWPORT_PADDING,
        Math.min(side === 'bottom' ? below : railTop - height - TOOLTIP_GAP, viewportHeight - height - TOOLTIP_VIEWPORT_PADDING),
      )
      const next = { left: left - railLeft, top: top - railTop, side } as const
      setTooltipLayout(current => (current?.left === next.left && current.top === next.top && current.side === next.side ? current : next))
    }
    updatePosition()
    // Reflowed translations and late-loading fonts can change the help's size.
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(updatePosition)
    observer.observe(tooltip)
    observer.observe(rail)
    return () => observer.disconnect()
  }, [
    tooltipControl,
    tooltipLabel,
    tooltipVisible,
    placementAnchor?.right,
    placementAnchor?.top,
    viewportSize?.width,
    viewportSize?.height,
  ])
  const tooltipEvents = (control: ControlName) => ({
    onMouseEnter: () => setHoveredControl(control),
    onMouseLeave: () => setHoveredControl(null),
    onFocus: () => {
      setHoveredControl(null)
      setFocusedControl(control)
    },
    onBlur: () => setFocusedControl(null),
  })
  const runtimeStyle = {
    '--ylc-overlay-control-rail-bg-runtime': toRgba(backgroundColor),
    '--ylc-overlay-control-hover-runtime': toRgba(fontColor, 0.1),
    color,
  } as CSSProperties

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Hover only keeps controls visible; buttons inside remain semantic.
    <div
      ref={railRef}
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
        {...tooltipEvents('settings')}
        type='button'
        data-ylc-settings-btn
        className='ylc-overlay-control-icon cursor-pointer ylc-theme-focus-ring'
        aria-label={t('content.aria.openSettings')}
        disabled={!isReady}
        tabIndex={isReady ? 0 : -1}
        onClick={event => {
          dismissPlacement()
          onSettingsClick(event.currentTarget)
        }}
      >
        <TbAdjustmentsHorizontal size={22} color={color} strokeWidth={ICON_STROKE_WIDTH} />
      </button>
      <button
        {...tooltipEvents('drag')}
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
        <span id={dragDescriptionId} className='ylc-visually-hidden'>
          {t('content.aria.arrowKeysToMove')}
        </span>
      </button>
      <button
        {...tooltipEvents('placement')}
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
      {tooltipVisible ? (
        <div
          ref={tooltipRef}
          data-ylc-control-tooltip
          data-ylc-tooltip-side={tooltipLayout?.side}
          aria-hidden='true'
          className='absolute rounded-md border border-solid ylc-theme-border px-2.5 py-1.5 text-xs font-medium leading-snug shadow-sm pointer-events-none'
          style={{
            left: tooltipLayout?.left ?? 0,
            top: tooltipLayout?.top ?? 0,
            visibility: tooltipLayout ? 'visible' : 'hidden',
            width: 'max-content',
            maxWidth: Math.min(220, Math.max(0, (viewportSize?.width ?? 240) - TOOLTIP_VIEWPORT_PADDING * 2)),
            boxSizing: 'border-box',
            background: 'var(--ylc-bg-surface-elevated)',
            color: 'var(--ylc-text-primary)',
            whiteSpace: 'normal',
            textAlign: 'center',
          }}
        >
          {tooltipLabel}
        </div>
      ) : null}
      {placementOpen && isReady ? (
        // biome-ignore lint/a11y/useSemanticElements: A fieldset's anonymous content box prevents bounded scrolling; retain the labelled group semantics.
        <div
          role='group'
          aria-label={t('content.placement.open')}
          data-ylc-placement-panel
          className='absolute right-0 bottom-full mb-1 grid grid-cols-2 gap-1 rounded-lg border border-solid ylc-theme-border p-2 shadow-lg'
          style={{
            background: toRgba(backgroundColor, 1),
            color,
            width: 240,
            minWidth: 0,
            maxHeight: adjustmentAnchor ? adjustmentAnchor.maxHeight : placementPanelMaxHeight,
            transform:
              adjustmentAnchor && placementAnchor
                ? `translate(${adjustmentAnchor.right - placementAnchor.right}px, ${adjustmentAnchor.top - placementAnchor.top}px)`
                : undefined,
            overflowY: 'auto',
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
                preserveAdjustmentAnchor()
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
        </div>
      ) : null}
    </div>
  )
}
