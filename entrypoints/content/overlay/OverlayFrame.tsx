import { DndContext, type DragCancelEvent, type DragEndEvent, useDraggable } from '@dnd-kit/core'
import { restrictToWindowEdges } from '@dnd-kit/modifiers'
import { type HandleStyles, Resizable } from 're-resizable'
import { type CSSProperties, type ReactNode, useEffect, useRef } from 'react'
import { useDocumentFocus } from '@/entrypoints/content/hooks/watchYouTubeUI/useDocumentFocus'
import { useEffectiveChatProfile } from '@/entrypoints/content/settings/ChatEditorStore'
import { ResizableMinHeight, ResizableMinWidth } from '@/shared/constants'
import { CHAT_PANEL_LAYER } from '@/shared/constants/zIndex'
import type { useChatSettingsStore } from '@/shared/settings/chatSettingsStore'
import { getControlRailTop } from '../features/Draggable/hooks/clipGeometry'
import { getDraggableItemStyles } from '../features/Draggable/hooks/draggableItemStyles'
import { ChatSurface } from './ChatSurface'
import { OverlayControlRail } from './OverlayControlRail'
import { useOverlayGeometry } from './useOverlayGeometry'
import { useOverlayInteraction } from './useOverlayInteraction'

const DRAG_MODIFIERS = [restrictToWindowEdges]
const CONTROL_RAIL_GAP = 6
const CONTROL_RAIL_HEIGHT = 46
const CONTROL_VIEWPORT_PADDING = 4
const CONTROL_HOVER_BRIDGE_OVERLAP = 12
const CONTROL_HOVER_BRIDGE_EXTRA_BOTTOM = 12
const RESIZE_HANDLE_POINTER_STYLE: CSSProperties = {
  pointerEvents: 'auto',
  zIndex: CHAT_PANEL_LAYER.interactionOverlay,
}
const RESIZE_HANDLE_STYLES: HandleStyles = {
  top: RESIZE_HANDLE_POINTER_STYLE,
  right: RESIZE_HANDLE_POINTER_STYLE,
  bottom: RESIZE_HANDLE_POINTER_STYLE,
  left: RESIZE_HANDLE_POINTER_STYLE,
  topRight: RESIZE_HANDLE_POINTER_STYLE,
  bottomRight: RESIZE_HANDLE_POINTER_STYLE,
  bottomLeft: RESIZE_HANDLE_POINTER_STYLE,
  topLeft: RESIZE_HANDLE_POINTER_STYLE,
}
const RESIZE_HANDLE_WRAPPER_STYLE: CSSProperties = { pointerEvents: 'none' }

export type OverlayFrameProps = {
  children: ReactNode
  initialDisplayOnMount?: boolean
  ready?: boolean
  settingsOpen?: boolean
  onOpenSettings?: () => void
  onChatVisibilityChange?: (visible: boolean) => void
  onInteractionStateChange?: (state: ReturnType<typeof useOverlayInteraction>['state']) => void
}

type OverlayFrameContentProps = Pick<OverlayFrameProps, 'children' | 'ready' | 'onOpenSettings'> & {
  profile: ReturnType<typeof useChatSettingsStore.getState>['profile']
  geometry: ReturnType<typeof useOverlayGeometry>
  interaction: ReturnType<typeof useOverlayInteraction>
}

const OverlayFrameContent = ({
  children,
  ready = true,
  onOpenSettings = () => {},
  profile,
  geometry,
  interaction,
}: OverlayFrameContentProps) => {
  const { attributes, isDragging, listeners, setNodeRef, transform } = useDraggable({ id: 'wrapper' })

  const { coordinates, size } = geometry.displayGeometry
  const { frameStyle, resizableStyle, innerDivStyle } = getDraggableItemStyles({
    top: coordinates.y,
    left: coordinates.x,
    transform,
  })
  const controlRailTop = getControlRailTop({
    chatHeight: size.height,
    containerTop: coordinates.y,
    controlHeight: CONTROL_RAIL_HEIGHT,
    gap: CONTROL_RAIL_GAP,
    viewportHeight: geometry.viewport.height,
    viewportPadding: CONTROL_VIEWPORT_PADDING,
  })
  const lastVisibleControlRailPlacementRef = useRef({ top: controlRailTop, right: 0 })
  if (interaction.controlsVisible) {
    lastVisibleControlRailPlacementRef.current = { top: controlRailTop, right: 0 }
  }
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

  return (
    <div role='application'>
      <Resizable
        size={size}
        minWidth={ResizableMinWidth}
        minHeight={ResizableMinHeight}
        data-ylc-resizable
        className='absolute'
        onResizeStart={() => {
          interaction.startResizing()
          geometry.startResizing()
        }}
        onResize={geometry.resize}
        onResizeStop={(event, direction, element, delta) => {
          geometry.finishResizing(event, direction, element, delta)
          interaction.finishResizing()
        }}
        handleStyles={RESIZE_HANDLE_STYLES}
        handleWrapperStyle={RESIZE_HANDLE_WRAPPER_STYLE}
        style={{ ...resizableStyle, pointerEvents: resizableStyle.pointerEvents as CSSProperties['pointerEvents'] }}
      >
        <div ref={setNodeRef} data-ylc-draggable-frame className='relative h-full w-full' style={frameStyle}>
          <ChatSurface
            innerStyle={innerDivStyle}
            isDragging={isDragging}
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

          <OverlayControlRail
            attributes={attributes}
            listeners={listeners}
            isDragging={isDragging}
            isReady={ready}
            isVisible={interaction.controlsVisible}
            placement={controlRailPlacement}
            backgroundColor={profile.appearance.backgroundColor}
            fontColor={profile.appearance.fontColor}
            onSettingsClick={onOpenSettings}
            onEnterControls={interaction.enterControls}
            onLeaveControls={interaction.leaveControls}
          />
        </div>
      </Resizable>
    </div>
  )
}

export const OverlayFrame = (props: OverlayFrameProps) => {
  const profile = useEffectiveChatProfile()
  const geometry = useOverlayGeometry()
  const documentFocused = useDocumentFocus()
  const interaction = useOverlayInteraction({
    initialDisplayOnMount: props.initialDisplayOnMount ?? false,
    settingsOpen: props.settingsOpen ?? false,
    documentFocused,
    alwaysVisible: profile.display.idleVisibility === 'always-visible',
  })

  useEffect(() => {
    props.onChatVisibilityChange?.(interaction.chatVisible)
  }, [interaction.chatVisible, props.onChatVisibilityChange])

  useEffect(() => {
    props.onInteractionStateChange?.(interaction.state)
  }, [interaction.state, props.onInteractionStateChange])

  return (
    <div className='absolute overflow-hidden top-0 left-0 w-screen h-screen' style={{ pointerEvents: 'none' }}>
      <DndContext
        onDragStart={interaction.startDragging}
        onDragEnd={(event: DragEndEvent) => {
          geometry.finishDragging(event)
          interaction.finishDragging()
        }}
        onDragCancel={(_event: DragCancelEvent) => {
          // dnd-kit owns the transient transform and clears it on cancel. No
          // persistent geometry write is needed.
          interaction.finishDragging()
        }}
        modifiers={DRAG_MODIFIERS}
      >
        <OverlayFrameContent
          children={props.children}
          ready={props.ready}
          onOpenSettings={props.onOpenSettings}
          profile={profile}
          geometry={geometry}
          interaction={interaction}
        />
      </DndContext>
    </div>
  )
}
