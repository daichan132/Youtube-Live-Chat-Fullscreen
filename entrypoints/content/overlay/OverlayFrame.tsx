import { useAtomValue } from 'jotai'
import { type CSSProperties, type KeyboardEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { useDocumentFocus } from '@/entrypoints/content/hooks/watchYouTubeUI/useDocumentFocus'
import { CHAT_PANEL_LAYER } from '@/shared/constants/zIndex'
import { effectiveProfileAtom } from '@/shared/state'
import { getControlRailTop } from '../features/Draggable/hooks/clipGeometry'
import { ChatSurface } from './ChatSurface'
import { OverlayControlRail } from './OverlayControlRail'
import { ResizeHandles } from './ResizeHandles'
import { useOverlayGeometry } from './useOverlayGeometry'
import { useOverlayInteraction } from './useOverlayInteraction'

const CONTROL_RAIL_GAP = 6
const CONTROL_RAIL_HEIGHT = 46
const CONTROL_VIEWPORT_PADDING = 4
const CONTROL_HOVER_BRIDGE_OVERLAP = 12
const CONTROL_HOVER_BRIDGE_EXTRA_BOTTOM = 12

export type OverlayFrameProps = {
  children: ReactNode
  initialDisplayOnMount?: boolean
  ready?: boolean
  settingsOpen?: boolean
  onOpenSettings?: () => void
  onChatVisibilityChange?: (visible: boolean) => void
  onInteractionStateChange?: (state: ReturnType<typeof useOverlayInteraction>['state']) => void
}

export const OverlayFrame = ({
  children,
  ready = true,
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
    alwaysVisible: profile.display.idleVisibility === 'always-visible',
  })
  const [referenceElement, setReferenceElement] = useState<HTMLDivElement | null>(null)
  const geometry = useOverlayGeometry({
    referenceElement,
    settingsOpen,
    interactionState: interaction.state,
    onGestureStart: type => (type === 'resize' ? interaction.startResizing() : interaction.startDragging()),
    onGestureEnd: interaction.finishDragging,
  })
  const { coordinates, size } = geometry.displayGeometry
  const controlRailTop = getControlRailTop({
    chatHeight: size.height,
    containerTop: coordinates.y,
    controlHeight: CONTROL_RAIL_HEIGHT,
    gap: CONTROL_RAIL_GAP,
    viewportHeight: geometry.viewport.height,
    viewportPadding: CONTROL_VIEWPORT_PADDING,
  })
  const lastVisibleControlRailPlacementRef = useRef({ top: controlRailTop, right: 0 })
  if (interaction.controlsVisible) lastVisibleControlRailPlacementRef.current = { top: controlRailTop, right: 0 }
  const controlRailPlacement = interaction.controlsVisible ? { top: controlRailTop, right: 0 } : lastVisibleControlRailPlacementRef.current
  const controlHoverBridgeTop = Math.max(0, size.height - CONTROL_HOVER_BRIDGE_OVERLAP)
  const controlHoverBridgeBottom = controlRailTop + CONTROL_RAIL_HEIGHT + CONTROL_HOVER_BRIDGE_EXTRA_BOTTOM
  const controlHoverBridgeHeight = Math.max(0, controlHoverBridgeBottom - controlHoverBridgeTop)
  const controlHoverBridgeStyle: CSSProperties = {
    top: controlHoverBridgeTop,
    left: 0,
    right: 0,
    height: controlHoverBridgeHeight,
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
      geometry.moveByKeyboard(delta)
    }
  }

  return (
    <div ref={setReferenceElement} className='absolute inset-0 overflow-hidden' style={{ pointerEvents: 'none' }}>
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
          {controlHoverBridgeHeight > 0 ? (
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
          <ResizeHandles onPointerDown={geometry.onPointerDown} />
          <OverlayControlRail
            isDragging={interaction.state === 'dragging'}
            isReady={ready}
            isVisible={interaction.controlsVisible}
            placement={controlRailPlacement}
            backgroundColor={profile.appearance.backgroundColor}
            fontColor={profile.appearance.fontColor}
            onSettingsClick={onOpenSettings}
            onPointerDown={event => {
              geometry.onPointerDown(event)
            }}
            onKeyDown={handleKeyboardMove}
            onEnterControls={interaction.enterControls}
            onLeaveControls={interaction.leaveControls}
          />
        </div>
      </div>
    </div>
  )
}
