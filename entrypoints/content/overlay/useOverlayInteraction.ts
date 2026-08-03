import { useCallback, useEffect, useRef, useState } from 'react'

export type OverlayInteractionState = 'idle' | 'hovering-chat' | 'hovering-controls' | 'dragging' | 'resizing' | 'settings-open'

type HoverRegion = 'none' | 'chat' | 'controls'
type Gesture = 'none' | 'dragging' | 'resizing'

type UseOverlayInteractionOptions = {
  initialDisplayOnMount: boolean
  settingsOpen: boolean
  documentFocused: boolean
  alwaysVisible: boolean
}

export type OverlayPresentationInput = Omit<UseOverlayInteractionOptions, 'initialDisplayOnMount'> & {
  hoverRegion: HoverRegion
  gesture: Gesture
  idle: boolean
}

export const deriveOverlayPresentation = ({
  settingsOpen,
  documentFocused,
  alwaysVisible,
  hoverRegion,
  gesture,
  idle,
}: OverlayPresentationInput) => {
  let state: OverlayInteractionState = 'idle'
  if (settingsOpen) state = 'settings-open'
  else if (gesture === 'dragging') state = 'dragging'
  else if (gesture === 'resizing') state = 'resizing'
  else if (hoverRegion === 'controls') state = 'hovering-controls'
  else if (hoverRegion === 'chat') state = 'hovering-chat'

  return {
    state,
    controlsVisible: !settingsOpen && gesture !== 'resizing' && (hoverRegion !== 'none' || gesture === 'dragging'),
    chatVisible: alwaysVisible || hoverRegion !== 'none' || gesture !== 'none' || !idle || settingsOpen || !documentFocused,
  }
}

const ACTIVITY_EVENTS: (keyof DocumentEventMap)[] = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll']
const IDLE_TIMEOUT_MS = 1e3
const CONTROL_HIDE_DELAY_MS = 160
export const CONTROL_FADE_OUT_MS = 180

const useDisplayIdle = (initialDisplayOnMount: boolean) => {
  const [idle, setIdle] = useState(!initialDisplayOnMount)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const reset = () => {
      setIdle(false)
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => setIdle(true), IDLE_TIMEOUT_MS)
    }

    if (initialDisplayOnMount) reset()
    for (const event of ACTIVITY_EVENTS) {
      document.addEventListener(event, reset, { passive: true })
    }

    return () => {
      if (timer) clearTimeout(timer)
      for (const event of ACTIVITY_EVENTS) {
        document.removeEventListener(event, reset)
      }
    }
  }, [initialDisplayOnMount])

  return idle
}

export const useOverlayInteraction = ({
  initialDisplayOnMount,
  settingsOpen,
  documentFocused,
  alwaysVisible,
}: UseOverlayInteractionOptions) => {
  const [hoverRegion, setHoverRegion] = useState<HoverRegion>('none')
  const [gesture, setGesture] = useState<Gesture>('none')
  const [controlsHiding, setControlsHiding] = useState(false)
  const controlHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const controlFadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const idle = useDisplayIdle(initialDisplayOnMount)

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
      setControlsHiding(false)
      setHoverRegion(region)
    },
    [clearControlFadeTimer, clearControlHideTimer],
  )

  const scheduleControlRailHide = useCallback(() => {
    clearControlHideTimer()
    controlHideTimerRef.current = setTimeout(() => {
      setHoverRegion('none')
      setControlsHiding(true)
      controlHideTimerRef.current = null
      clearControlFadeTimer()
      controlFadeTimerRef.current = setTimeout(() => {
        setControlsHiding(false)
        controlFadeTimerRef.current = null
      }, CONTROL_FADE_OUT_MS)
    }, CONTROL_HIDE_DELAY_MS)
  }, [clearControlFadeTimer, clearControlHideTimer])

  useEffect(
    () => () => {
      clearControlHideTimer()
      clearControlFadeTimer()
    },
    [clearControlFadeTimer, clearControlHideTimer],
  )

  const startDragging = useCallback(() => setGesture('dragging'), [])
  const finishDragging = useCallback(() => setGesture('none'), [])
  const startResizing = useCallback(() => setGesture('resizing'), [])
  const finishResizing = useCallback(() => setGesture('none'), [])

  const presentation = deriveOverlayPresentation({
    settingsOpen,
    documentFocused,
    alwaysVisible,
    hoverRegion,
    gesture,
    idle,
  })

  return {
    ...presentation,
    controlsHiding,
    enterChat: () => showControlRail('chat'),
    leaveChat: scheduleControlRailHide,
    enterControls: () => showControlRail('controls'),
    leaveControls: scheduleControlRailHide,
    startDragging,
    finishDragging,
    startResizing,
    finishResizing,
  }
}
