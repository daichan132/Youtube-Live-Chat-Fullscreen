import { useAtomValue } from 'jotai'
import { type CSSProperties, type KeyboardEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { useDocumentFocus } from '@/entrypoints/content/hooks/watchYouTubeUI/useDocumentFocus'
import { CHAT_PANEL_LAYER } from '@/shared/constants/zIndex'
import { effectiveProfileAtom } from '@/shared/state'
import { ChatSurface } from './ChatSurface'
import { getControlRailLayout } from './controlRailLayout'
import { OverlayControlRail } from './OverlayControlRail'
import { ResizeHandles } from './ResizeHandles'
import { useOverlayGeometry } from './useOverlayGeometry'
import { useOverlayInteraction } from './useOverlayInteraction'

const CONTROL_RAIL_GAP = 6
const CONTROL_RAIL_HEIGHT = 46
const CONTROL_VIEWPORT_PADDING = 4

export type OverlayFrameProps = {
  children: ReactNode
  initialDisplayOnMount?: boolean
  ready?: boolean
  purchaseActive?: boolean
  chatInputFocused?: boolean
  settingsOpen?: boolean
  onOpenSettings?: (source: HTMLElement) => void
  onChatVisibilityChange?: (visible: boolean) => void
  onInteractionStateChange?: (state: ReturnType<typeof useOverlayInteraction>['state']) => void
}

export const OverlayFrame = ({
  children,
  ready = true,
  purchaseActive = false,
  chatInputFocused = false,
  initialDisplayOnMount = false,
  settingsOpen = false,
  onOpenSettings = () => {},
  onChatVisibilityChange,
  onInteractionStateChange,
}: OverlayFrameProps) => {
  const profile = useAtomValue(effectiveProfileAtom)
  const documentFocused = useDocumentFocus()
  const interaction = useOverlayInteraction({
    initialDisplayOnMount,
    settingsOpen,
    documentFocused,
    alwaysVisible: chatInputFocused || purchaseActive || profile.display.idleVisibility === 'always-visible',
  })
  const [referenceElement, setReferenceElement] = useState<HTMLDivElement | null>(null)
  const [controlRailSize, setControlRailSize] = useState({ length: 130, thickness: CONTROL_RAIL_HEIGHT })
  const measureControlRail = useCallback(({ width, height }: { width: number; height: number }) => {
    const next = { length: Math.max(width, height), thickness: Math.min(width, height) }
    setControlRailSize(current => (current.length === next.length && current.thickness === next.thickness ? current : next))
  }, [])
  const geometry = useOverlayGeometry({
    referenceElement,
    settingsOpen,
    automaticPlacementPaused: purchaseActive,
    interactionState: interaction.state,
    onGestureStart: type => (type === 'resize' ? interaction.startResizing() : interaction.startDragging()),
    onGestureEnd: interaction.finishDragging,
  })
  // Native purchase cards need room even when the saved chat is deliberately small.
  // This is a transient presentation: the user's geometry is never committed here.
  const purchaseLayout = useMemo(() => {
    const current = geometry.displayGeometry
    if (!purchaseActive) return current
    const width = Math.min(Math.max(0, geometry.viewport.width - 20), Math.max(360, current.size.width))
    const height = Math.min(Math.max(0, geometry.viewport.height - 20), Math.max(480, current.size.height))
    return {
      coordinates: {
        x: Math.max(10, Math.min(current.coordinates.x, geometry.viewport.width - width - 10)),
        y: Math.max(10, Math.min(current.coordinates.y, geometry.viewport.height - height - 10)),
      },
      size: { width, height },
    }
  }, [geometry.displayGeometry, geometry.viewport, purchaseActive])
  const { coordinates, size } = purchaseLayout
  const controlLayout = getControlRailLayout({
    chat: { left: coordinates.x, top: coordinates.y, width: size.width, height: size.height },
    viewport: geometry.viewport,
    ...controlRailSize,
    gap: CONTROL_RAIL_GAP,
    padding: CONTROL_VIEWPORT_PADDING,
  })
  // Leave 4px above the placement panel and its 4px gap below it.
  const placementPanelMaxHeight = Math.max(0, coordinates.y + controlLayout.rail.top - 8)
  const controlHoverBridgeStyle: CSSProperties = {
    ...controlLayout.bridge,
    pointerEvents: interaction.state === 'resizing' ? 'none' : 'auto',
    zIndex: CHAT_PANEL_LAYER.hoverBridge,
  }
  const frameStyle = useMemo<CSSProperties>(
    () => ({ left: coordinates.x, top: coordinates.y, width: size.width, height: size.height, pointerEvents: 'auto' }),
    [coordinates.x, coordinates.y, size.height, size.width],
  )
  const chatBoundsRevision = `${coordinates.x}:${coordinates.y}:${size.width}:${size.height}`

  useEffect(() => onChatVisibilityChange?.(interaction.chatVisible), [interaction.chatVisible, onChatVisibilityChange])
  useEffect(() => onInteractionStateChange?.(interaction.state), [interaction.state, onInteractionStateChange])

  const handleKeyboardMove = (event: KeyboardEvent<HTMLElement>) => {
    if (
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.shiftKey &&
      ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)
    ) {
      event.preventDefault()
      const delta =
        event.key === 'ArrowUp'
          ? { x: 0, y: -10 }
          : event.key === 'ArrowDown'
            ? { x: 0, y: 10 }
            : event.key === 'ArrowLeft'
              ? { x: -10, y: 0 }
              : { x: 10, y: 0 }
      geometry.moveBy(delta)
    }
  }

  return (
    <div ref={setReferenceElement} className='absolute inset-0 overflow-clip' style={{ pointerEvents: 'none' }}>
      <div role='application' data-ylc-resizable className='absolute' style={frameStyle}>
        <div data-ylc-draggable-frame className='relative h-full w-full'>
          <ChatSurface
            innerStyle={{ overflow: 'hidden', borderRadius: 6 }}
            boundsRevision={chatBoundsRevision}
            isDragging={interaction.state === 'dragging'}
            onEnterChat={interaction.enterChat}
            onLeaveChat={interaction.leaveChat}
          >
            {children}
          </ChatSurface>
          {!purchaseActive && controlLayout.bridge && controlLayout.bridge.width > 0 && controlLayout.bridge.height > 0 ? (
            // biome-ignore lint/a11y/noStaticElementInteractions: This transparent bridge preserves hover between chat and controls.
            <div
              data-ylc-control-hover-bridge
              className='absolute bg-transparent'
              style={controlHoverBridgeStyle}
              onMouseEnter={interaction.enterControls}
              onMouseMove={interaction.enterControls}
              onMouseLeave={interaction.leaveControls}
            />
          ) : null}
          {!purchaseActive ? (
            <>
              <ResizeHandles onPointerDown={geometry.onPointerDown} />
              <OverlayControlRail
                isDragging={interaction.state === 'dragging'}
                isResizing={interaction.state === 'resizing'}
                isReady={ready && !settingsOpen}
                isVisible={interaction.controlsVisible && controlLayout.hoverEnabled}
                vertical={controlLayout.vertical}
                onSizeChange={measureControlRail}
                placement={{ top: controlLayout.rail.top, left: controlLayout.rail.left }}
                placementAnchor={{
                  left: coordinates.x + controlLayout.rail.left,
                  right: coordinates.x + controlLayout.rail.left + controlLayout.rail.width,
                  top: coordinates.y + controlLayout.rail.top,
                }}
                viewportSize={geometry.viewport}
                placementPanelMaxHeight={placementPanelMaxHeight}
                onSettingsClick={onOpenSettings}
                onPointerDown={event => {
                  geometry.onPointerDown(event)
                }}
                onKeyDown={handleKeyboardMove}
                onEnterControls={interaction.enterControls}
                onLeaveControls={interaction.leaveControls}
                onFocusControls={interaction.setControlsFocused}
                onAdjustmentOpenChange={geometry.onAdjustmentOpenChange}
                onRestoreAdjustment={geometry.restoreAdjustment}
                canRestoreAdjustment={geometry.canRestoreAdjustment}
                canMoveBy={geometry.canMoveBy}
                canResizeBy={geometry.canResizeBy}
                onMoveBy={geometry.moveBy}
                onResizeBy={geometry.resizeBy}
              />
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
