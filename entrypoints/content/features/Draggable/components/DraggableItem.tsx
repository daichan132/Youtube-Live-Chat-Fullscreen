import { useDraggable } from '@dnd-kit/core'
import { type HandleStyles, type NumberSize, Resizable } from 're-resizable'
import type { Direction } from 're-resizable/lib/resizer'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'

import { ResizableMinHeight, ResizableMinWidth } from '@/shared/constants'
import { CHAT_PANEL_LAYER } from '@/shared/constants/zIndex'
import { useYTDLiveChatNoLsStore } from '@/shared/stores/ytdLiveChatNoLsStore'
import { useYTDLiveChatStore } from '@/shared/stores/ytdLiveChatStore'
import { deriveResizedLayout, fitLayoutWithinViewportWidth, getControlRailTop, isSameLayoutGeometry } from '../hooks/clipGeometry'
import { getDraggableItemStyles } from '../hooks/draggableItemStyles'
import { ControlIcons } from './ControlIcons'
import { ChatOnlyChromeEffect } from './EffectComponent/ChatOnlyChromeEffect'

interface DraggableItemProps {
  children: React.ReactNode
  initialDisplayOnMount?: boolean
}

const ACTIVITY_EVENTS: (keyof DocumentEventMap)[] = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll']
const IDLE_TIMEOUT_MS = 1e3
const CONTROL_RAIL_GAP = 6
const CONTROL_RAIL_HEIGHT = 46
const CONTROL_VIEWPORT_PADDING = 4
const CONTROL_HIDE_DELAY_MS = 160
const CONTROL_FADE_OUT_MS = 180
const CONTROL_HOVER_BRIDGE_OVERLAP = 12
const CONTROL_HOVER_BRIDGE_EXTRA_BOTTOM = 12
const RESIZE_HANDLE_POINTER_STYLE: React.CSSProperties = {
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
const RESIZE_HANDLE_WRAPPER_STYLE: React.CSSProperties = {
  pointerEvents: 'none',
}
const DRAG_SHIELD_STYLE: React.CSSProperties = {
  zIndex: CHAT_PANEL_LAYER.dragShield,
}

type VisibleChatBounds = {
  top: number
  right: number
  bottom: number
  left: number
}

type HoverRegion = 'none' | 'chat' | 'controls'

const useDisplayIdle = (initialDisplayOnMount: boolean) => {
  const [idle, setIdle] = useState(!initialDisplayOnMount)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>

    const reset = () => {
      setIdle(false)
      clearTimeout(timer)
      timer = setTimeout(() => setIdle(true), IDLE_TIMEOUT_MS)
    }

    if (initialDisplayOnMount) {
      reset()
    }

    for (const event of ACTIVITY_EVENTS) {
      document.addEventListener(event, reset, { passive: true })
    }

    return () => {
      clearTimeout(timer)
      for (const event of ACTIVITY_EVENTS) {
        document.removeEventListener(event, reset)
      }
    }
  }, [initialDisplayOnMount])

  return idle
}

const getYouTubeAppElement = () => {
  const ytdAppElement = document.body.querySelector('ytd-app')
  return ytdAppElement instanceof HTMLElement ? ytdAppElement : null
}

export const DraggableItem = ({ children, initialDisplayOnMount = false }: DraggableItemProps) => {
  const { attributes, isDragging, listeners, setNodeRef, transform } = useDraggable({ id: 'wrapper' })
  const [isResizing, setIsResizing] = useState(false)
  const [isControlRailHiding, setIsControlRailHiding] = useState(false)
  const [hoverRegion, setHoverRegion] = useState<HoverRegion>('none')
  const [viewportHeight, setViewportHeight] = useState(() => window.innerHeight)

  const { coordinates, size, setSize, setCoordinates } = useYTDLiveChatStore(
    useShallow(state => ({
      coordinates: state.coordinates,
      size: state.size,
      setSize: state.setSize,
      setCoordinates: state.setCoordinates,
    })),
  )

  const top = coordinates.y
  const left = coordinates.x

  const { isHover, isOpenSettingModal, setIsOpenSettingModal, setIsDisplay, setIsHover } = useYTDLiveChatNoLsStore(
    useShallow(state => ({
      isHover: state.isHover,
      isOpenSettingModal: state.isOpenSettingModal,
      setIsOpenSettingModal: state.setIsOpenSettingModal,
      setIsDisplay: state.setIsDisplay,
      setIsHover: state.setIsHover,
    })),
  )
  const isIdle = useDisplayIdle(initialDisplayOnMount)
  const controlHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const controlFadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const resizeStartCoordinatesRef = useRef({ x: left, y: top })
  const resizeStartSizeRef = useRef(size)

  const handleResizeStart = useCallback(() => {
    setIsResizing(true)
    resizeStartCoordinatesRef.current = { x: left, y: top }
    resizeStartSizeRef.current = size
  }, [left, top, size])

  const handleResize = useCallback(
    (_event: MouseEvent | TouchEvent, direction: Direction, _ref: HTMLElement, delta: NumberSize) => {
      const nextLayout = deriveResizedLayout({
        startCoordinates: resizeStartCoordinatesRef.current,
        currentSize: resizeStartSizeRef.current,
        direction,
        delta,
      })

      if (
        nextLayout.coordinates.x !== resizeStartCoordinatesRef.current.x ||
        nextLayout.coordinates.y !== resizeStartCoordinatesRef.current.y
      ) {
        setCoordinates(nextLayout.coordinates)
      }

      setSize(nextLayout.size)
    },
    [setCoordinates, setSize],
  )

  const handleResizeStop = useCallback(
    (_event: MouseEvent | TouchEvent, _direction: Direction, ref: HTMLElement, _delta: NumberSize) => {
      setIsResizing(false)
      setSize({
        width: Math.max(ResizableMinWidth, ref.offsetWidth),
        height: Math.max(ResizableMinHeight, ref.offsetHeight),
      })
    },
    [setSize],
  )

  const keepWithinViewportWidth = useCallback(() => {
    const {
      size: currentSize,
      coordinates: currentCoordinates,
      setCoordinates: updateCoordinates,
      setSize: updateSize,
    } = useYTDLiveChatStore.getState()
    const currentLayout = { coordinates: currentCoordinates, size: currentSize }
    const nextLayout = fitLayoutWithinViewportWidth(currentLayout, window.innerWidth)

    if (isSameLayoutGeometry(currentLayout, nextLayout)) return

    if (currentCoordinates.x !== nextLayout.coordinates.x || currentCoordinates.y !== nextLayout.coordinates.y) {
      updateCoordinates(nextLayout.coordinates)
      return
    }

    updateSize(nextLayout.size)
  }, [])

  useLayoutEffect(() => {
    const handleWindowResize = () => {
      setViewportHeight(window.innerHeight)
      keepWithinViewportWidth()
    }

    window.addEventListener('resize', handleWindowResize, { passive: true })
    return () => window.removeEventListener('resize', handleWindowResize)
  }, [keepWithinViewportWidth])

  useEffect(() => {
    const previousBodyCursor = document.body.style.cursor
    const ytdAppElement = getYouTubeAppElement()
    const previousYouTubeCursor = ytdAppElement?.style.cursor ?? ''

    ytdAppElement?.style.setProperty('pointer-events', isDragging ? 'none' : 'auto')
    if (isDragging) {
      document.body.style.setProperty('cursor', 'grabbing')
      ytdAppElement?.style.setProperty('cursor', 'grabbing')
    }

    return () => {
      ytdAppElement?.style.setProperty('pointer-events', 'auto')
      document.body.style.cursor = previousBodyCursor
      if (ytdAppElement) ytdAppElement.style.cursor = previousYouTubeCursor
    }
  }, [isDragging])

  useEffect(() => {
    const isFocused = typeof document !== 'undefined' ? document.hasFocus() : true
    setIsDisplay(isHover || hoverRegion === 'controls' || !isIdle || isOpenSettingModal || !isFocused)
  }, [isHover, hoverRegion, isIdle, isOpenSettingModal, setIsDisplay])

  const clearControlHideTimer = useCallback(() => {
    if (!controlHideTimerRef.current) return
    clearTimeout(controlHideTimerRef.current)
    controlHideTimerRef.current = null
  }, [])

  const clearControlFadeTimer = useCallback(() => {
    if (!controlFadeTimerRef.current) return
    clearTimeout(controlFadeTimerRef.current)
    controlFadeTimerRef.current = null
  }, [])

  const showControlRail = useCallback(
    (region: Exclude<HoverRegion, 'none'>) => {
      clearControlHideTimer()
      clearControlFadeTimer()
      setIsControlRailHiding(false)
      setHoverRegion(region)
    },
    [clearControlFadeTimer, clearControlHideTimer],
  )

  const scheduleControlRailHide = useCallback(() => {
    clearControlHideTimer()
    controlHideTimerRef.current = setTimeout(() => {
      setIsHover(false)
      setHoverRegion('none')
      setIsControlRailHiding(true)
      controlHideTimerRef.current = null
      clearControlFadeTimer()
      controlFadeTimerRef.current = setTimeout(() => {
        setIsControlRailHiding(false)
        controlFadeTimerRef.current = null
      }, CONTROL_FADE_OUT_MS)
    }, CONTROL_HIDE_DELAY_MS)
  }, [clearControlFadeTimer, clearControlHideTimer, setIsHover])

  useEffect(
    () => () => {
      clearControlHideTimer()
      clearControlFadeTimer()
    },
    [clearControlFadeTimer, clearControlHideTimer],
  )

  const getVisibleChatBounds = useCallback((element: HTMLElement): VisibleChatBounds | null => {
    const rect = element.getBoundingClientRect()
    if (rect.bottom <= rect.top || rect.right <= rect.left) return null

    return {
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      left: rect.left,
    }
  }, [])

  const updateChatHoverFromPoint = useCallback(
    (element: HTMLElement, clientX: number, clientY: number) => {
      const bounds = getVisibleChatBounds(element)
      const isInsideVisibleChat =
        bounds !== null && clientX >= bounds.left && clientX <= bounds.right && clientY >= bounds.top && clientY <= bounds.bottom

      if (isInsideVisibleChat) {
        setIsHover(true)
        showControlRail('chat')
        return
      }

      scheduleControlRailHide()
    },
    [getVisibleChatBounds, scheduleControlRailHide, setIsHover, showControlRail],
  )

  const showControlsHover = useCallback(() => {
    setIsHover(false)
    showControlRail('controls')
  }, [setIsHover, showControlRail])

  const handleChatMouseEnter = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      updateChatHoverFromPoint(event.currentTarget, event.clientX, event.clientY)
    },
    [updateChatHoverFromPoint],
  )

  const handleChatMouseMove = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      updateChatHoverFromPoint(event.currentTarget, event.clientX, event.clientY)
    },
    [updateChatHoverFromPoint],
  )

  const handleChatMouseLeave = useCallback(() => {
    scheduleControlRailHide()
  }, [scheduleControlRailHide])

  const handleControlsHoverChange = useCallback(
    (nextIsControlHover: boolean) => {
      if (nextIsControlHover) {
        showControlsHover()
        return
      }
      scheduleControlRailHide()
    },
    [scheduleControlRailHide, showControlsHover],
  )

  const handleControlHoverBridgeEnter = useCallback(() => {
    showControlsHover()
  }, [showControlsHover])

  const handleControlHoverBridgeLeave = useCallback(() => {
    scheduleControlRailHide()
  }, [scheduleControlRailHide])

  const { frameStyle, resizableStyle, innerDivStyle } = getDraggableItemStyles({
    top,
    left,
    transform,
  })
  const controlRailTop = getControlRailTop({
    chatHeight: size.height,
    containerTop: top,
    controlHeight: CONTROL_RAIL_HEIGHT,
    gap: CONTROL_RAIL_GAP,
    viewportHeight,
    viewportPadding: CONTROL_VIEWPORT_PADDING,
  })
  // Hide the floating control rail while the settings panel is open so it doesn't overlap the modal.
  const isControlRailDisplayable = !isResizing && !isOpenSettingModal && (hoverRegion !== 'none' || isHover || isDragging)
  const lastVisibleControlRailPlacementRef = useRef({ top: controlRailTop, right: 0 })
  if (isControlRailDisplayable) {
    lastVisibleControlRailPlacementRef.current = { top: controlRailTop, right: 0 }
  }
  const controlRailPlacement = isControlRailDisplayable ? { top: controlRailTop, right: 0 } : lastVisibleControlRailPlacementRef.current
  const visibleChatBottom = size.height
  const controlHoverBridgeTop = Math.max(0, visibleChatBottom - CONTROL_HOVER_BRIDGE_OVERLAP)
  const controlHoverBridgeBottom = controlRailTop + CONTROL_RAIL_HEIGHT + CONTROL_HOVER_BRIDGE_EXTRA_BOTTOM
  const controlHoverBridgeHeight = Math.max(0, controlHoverBridgeBottom - controlHoverBridgeTop)
  const shouldRenderControlHoverBridge = controlHoverBridgeHeight > 0
  const controlHoverBridgeStyle: React.CSSProperties = {
    top: controlHoverBridgeTop,
    left: 0,
    right: 0,
    height: controlHoverBridgeHeight,
    pointerEvents: isResizing ? 'none' : 'auto',
    zIndex: CHAT_PANEL_LAYER.hoverBridge,
  }

  return (
    <div role='application'>
      <ChatOnlyChromeEffect isDragging={isDragging} isResizing={isResizing} isControlRailHiding={isControlRailHiding} />

      <Resizable
        size={size}
        minWidth={ResizableMinWidth}
        minHeight={ResizableMinHeight}
        data-ylc-resizable
        className='absolute'
        onResizeStart={handleResizeStart}
        onResize={handleResize}
        onResizeStop={handleResizeStop}
        handleStyles={RESIZE_HANDLE_STYLES}
        handleWrapperStyle={RESIZE_HANDLE_WRAPPER_STYLE}
        style={{ ...resizableStyle, pointerEvents: resizableStyle.pointerEvents as React.CSSProperties['pointerEvents'] }}
      >
        <div ref={setNodeRef} data-ylc-draggable-frame className='relative h-full w-full' style={frameStyle}>
          {/* biome-ignore lint/a11y/noStaticElementInteractions: Hover controls chat-only display state; interactive children keep their own semantics. */}
          <div
            data-ylc-chat-inner
            className='relative h-full w-full pointer-events-auto'
            style={innerDivStyle}
            onMouseEnter={handleChatMouseEnter}
            onMouseMove={handleChatMouseMove}
            onMouseLeave={handleChatMouseLeave}
          >
            <div className='relative w-full h-full'>
              {isDragging && (
                <div data-ylc-drag-shield className='absolute w-100% h-100% cursor-grabbing bg-transparent' style={DRAG_SHIELD_STYLE} />
              )}
              {children}
            </div>
          </div>

          {shouldRenderControlHoverBridge && (
            // biome-ignore lint/a11y/noStaticElementInteractions: This transparent bridge keeps hover state stable while moving toward the control rail.
            <div
              data-ylc-control-hover-bridge
              className='absolute bg-transparent'
              style={controlHoverBridgeStyle}
              onMouseEnter={handleControlHoverBridgeEnter}
              onMouseMove={handleControlHoverBridgeEnter}
              onMouseLeave={handleControlHoverBridgeLeave}
            />
          )}

          <ControlIcons
            controlRailStyle={controlRailPlacement}
            dragProps={{ attributes, listeners, isDragging }}
            isVisible={isControlRailDisplayable}
            onControlsHoverChange={handleControlsHoverChange}
            onSettingsClick={() => setIsOpenSettingModal(true)}
          />
        </div>
      </Resizable>
    </div>
  )
}
