import { useDraggable } from '@dnd-kit/core'
import { type NumberSize, Resizable } from 're-resizable'
import type { Direction } from 're-resizable/lib/resizer'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'

import { ResizableMinHeight, ResizableMinWidth } from '@/shared/constants'
import { useYTDLiveChatNoLsStore } from '@/shared/stores/ytdLiveChatNoLsStore'
import { useYTDLiveChatStore } from '@/shared/stores/ytdLiveChatStore'
import { deriveResizedLayout, fitLayoutWithinViewportWidth, getControlRailTop, isSameLayoutGeometry } from '../hooks/clipGeometry'
import { getDraggableItemStyles } from '../hooks/draggableItemStyles'
import { useClipAnimationPriming } from '../hooks/useClipAnimationPriming'
import { ControlIcons } from './ControlIcons'
import { ClipPathEffect } from './EffectComponent/ClipPathEffect'

interface DraggableItemProps {
  children: React.ReactNode
}

const ACTIVITY_EVENTS: (keyof DocumentEventMap)[] = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll']
const IDLE_TIMEOUT_MS = 1e3
const CONTROL_RAIL_GAP = 6
const CONTROL_RAIL_HEIGHT = 46
const CONTROL_VIEWPORT_PADDING = 4
const CONTROL_HIDE_DELAY_MS = 160
const CONTROL_FADE_OUT_MS = 180

type VisibleChatBounds = {
  top: number
  right: number
  bottom: number
  left: number
}

const useDisplayIdle = () => {
  const [idle, setIdle] = useState(false)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>

    const reset = () => {
      setIdle(false)
      clearTimeout(timer)
      timer = setTimeout(() => setIdle(true), IDLE_TIMEOUT_MS)
    }

    reset()
    for (const event of ACTIVITY_EVENTS) {
      document.addEventListener(event, reset, { passive: true })
    }

    return () => {
      clearTimeout(timer)
      for (const event of ACTIVITY_EVENTS) {
        document.removeEventListener(event, reset)
      }
    }
  }, [])

  return idle
}

type PointerEventsValue = 'none' | 'auto'

const setYouTubePointerEvents = (value: PointerEventsValue) => {
  const ytdAppElement = document.body.querySelector('ytd-app')
  if (!(ytdAppElement instanceof HTMLElement)) return
  ytdAppElement.style.setProperty('pointer-events', value)
}

export const DraggableItem = ({ children }: DraggableItemProps) => {
  const { attributes, isDragging, listeners, setNodeRef, transform } = useDraggable({ id: 'wrapper' })
  const [isResizing, setIsResizing] = useState(false)
  const [isControlHover, setIsControlHover] = useState(false)
  const [isControlRailHiding, setIsControlRailHiding] = useState(false)
  const [isControlRailVisible, setIsControlRailVisible] = useState(false)
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

  const {
    clip,
    isHover,
    isClipPath = false,
    isOpenSettingModal,
    setIsOpenSettingModal,
    setIsDisplay,
    setIsHover,
  } = useYTDLiveChatNoLsStore(
    useShallow(state => ({
      clip: state.clip,
      isHover: state.isHover,
      isClipPath: state.isClipPath,
      isOpenSettingModal: state.isOpenSettingModal,
      setIsOpenSettingModal: state.setIsOpenSettingModal,
      setIsDisplay: state.setIsDisplay,
      setIsHover: state.setIsHover,
    })),
  )
  const isIdle = useDisplayIdle()
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
    setYouTubePointerEvents(isDragging ? 'none' : 'auto')
    return () => {
      setYouTubePointerEvents('auto')
    }
  }, [isDragging])

  useEffect(() => {
    const isFocused = typeof document !== 'undefined' ? document.hasFocus() : true
    setIsDisplay(isHover || isControlHover || !isIdle || isOpenSettingModal || !isFocused)
  }, [isHover, isControlHover, isIdle, isOpenSettingModal, setIsDisplay])

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

  const showControlRail = useCallback(() => {
    clearControlHideTimer()
    clearControlFadeTimer()
    setIsControlRailHiding(false)
    setIsControlRailVisible(true)
  }, [clearControlFadeTimer, clearControlHideTimer])

  const scheduleControlRailHide = useCallback(() => {
    clearControlHideTimer()
    controlHideTimerRef.current = setTimeout(() => {
      setIsHover(false)
      setIsControlRailVisible(false)
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

  const getVisibleChatBounds = useCallback(
    (element: HTMLElement): VisibleChatBounds | null => {
      const rect = element.getBoundingClientRect()
      const topInset = isClipPath ? clip.header : 0
      const bottomInset = isClipPath ? clip.input : 0
      const topBound = rect.top + topInset
      const bottomBound = rect.bottom - bottomInset

      if (bottomBound <= topBound || rect.right <= rect.left) return null

      return {
        top: topBound,
        right: rect.right,
        bottom: bottomBound,
        left: rect.left,
      }
    },
    [clip.header, clip.input, isClipPath],
  )

  const updateChatHoverFromPoint = useCallback(
    (element: HTMLElement, clientX: number, clientY: number) => {
      const bounds = getVisibleChatBounds(element)
      const isInsideVisibleChat =
        bounds !== null && clientX >= bounds.left && clientX <= bounds.right && clientY >= bounds.top && clientY <= bounds.bottom

      if (isInsideVisibleChat) {
        setIsHover(true)
        showControlRail()
        return
      }

      scheduleControlRailHide()
    },
    [getVisibleChatBounds, scheduleControlRailHide, setIsHover, showControlRail],
  )

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
    (nextIsHover: boolean) => {
      setIsControlHover(nextIsHover)
      if (nextIsHover) {
        setIsHover(true)
        showControlRail()
        return
      }
      scheduleControlRailHide()
    },
    [scheduleControlRailHide, setIsHover, showControlRail],
  )

  const handleControlHoverBridgeEnter = useCallback(() => {
    setIsHover(true)
    showControlRail()
  }, [setIsHover, showControlRail])

  const [disableTopTransition, setDisableTopTransition] = useState(true)
  useEffect(() => {
    if (isDragging || isResizing) {
      setDisableTopTransition(true)
      return
    }

    const timer = setTimeout(() => {
      setDisableTopTransition(false)
    }, 10)
    return () => clearTimeout(timer)
  }, [isDragging, isResizing])

  const { isClipAnimationReady } = useClipAnimationPriming({ isClipPath, clip })

  const { frameStyle, resizableStyle, innerDivStyle } = getDraggableItemStyles({
    top,
    left,
    isClipPath,
    isClipAnimationReady,
    disableTopTransition,
    isResizing,
    transform,
    clip,
  })
  const controlRailTop = getControlRailTop({
    chatHeight: size.height,
    containerTop: top,
    controlHeight: CONTROL_RAIL_HEIGHT,
    gap: CONTROL_RAIL_GAP,
    isClipPath,
    clipInput: clip.input,
    viewportHeight,
    viewportPadding: CONTROL_VIEWPORT_PADDING,
  })
  const isControlRailDisplayable = !isResizing && (isHover || isControlHover || isControlRailVisible || isDragging || isOpenSettingModal)
  const lastVisibleControlRailPlacementRef = useRef({ top: controlRailTop, right: 0 })
  if (isControlRailDisplayable) {
    lastVisibleControlRailPlacementRef.current = { top: controlRailTop, right: 0 }
  }
  const controlRailPlacement = isControlRailDisplayable ? { top: controlRailTop, right: 0 } : lastVisibleControlRailPlacementRef.current
  const visibleChatBottom = size.height - (isClipPath ? clip.input : 0)
  const controlHoverBridgeHeight = Math.max(0, controlRailTop + CONTROL_RAIL_HEIGHT - visibleChatBottom)
  const shouldRenderControlHoverBridge = controlHoverBridgeHeight > 0
  const controlHoverBridgeStyle: React.CSSProperties = {
    top: visibleChatBottom,
    left: 0,
    right: 0,
    height: controlHoverBridgeHeight,
    pointerEvents: isResizing ? 'none' : 'auto',
    zIndex: 9,
  }

  return (
    <div role='application'>
      <ClipPathEffect isDragging={isDragging} isResizing={isResizing} isControlRailHiding={isControlRailHiding} />

      <Resizable
        size={size}
        minWidth={ResizableMinWidth}
        minHeight={ResizableMinHeight}
        data-ylc-resizable
        className='absolute'
        onResizeStart={handleResizeStart}
        onResize={handleResize}
        onResizeStop={handleResizeStop}
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
              {isDragging && <div className='absolute w-100% h-100% z-100 cursor-grabbing bg-transparent' />}
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
              onMouseLeave={handleChatMouseLeave}
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
