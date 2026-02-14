import { type RefObject, useEffect } from 'react'

const SETTING_SCROLL_CONTAINER_SELECTOR = '[data-ylc-setting-scroll-container="true"]'
const DEFAULT_SCROLL_MARGIN = 8

type VerticalRange = {
  top: number
  bottom: number
}

const getCombinedVerticalRange = (elements: ReadonlyArray<HTMLElement | null>): VerticalRange | null => {
  const rects = elements.filter((element): element is HTMLElement => element !== null).map(element => element.getBoundingClientRect())

  if (rects.length === 0) return null

  return {
    top: Math.min(...rects.map(rect => rect.top)),
    bottom: Math.max(...rects.map(rect => rect.bottom)),
  }
}

export const getSettingScrollContainer = (anchor: HTMLElement | null): HTMLElement | null => {
  if (!anchor) return null

  const closestContainer = anchor.closest<HTMLElement>(SETTING_SCROLL_CONTAINER_SELECTOR)
  if (closestContainer) return closestContainer

  const rootNode = anchor.getRootNode()
  if (rootNode instanceof ShadowRoot) {
    return rootNode.querySelector<HTMLElement>(SETTING_SCROLL_CONTAINER_SELECTOR)
  }

  return document.querySelector<HTMLElement>(SETTING_SCROLL_CONTAINER_SELECTOR)
}

export const scrollSettingPanelRangeIntoView = (
  container: HTMLElement,
  range: VerticalRange,
  margin: number = DEFAULT_SCROLL_MARGIN,
): boolean => {
  const containerRect = container.getBoundingClientRect()
  const visibleTop = containerRect.top + margin
  const visibleBottom = containerRect.bottom - margin

  if (visibleBottom <= visibleTop) return false

  const visibleHeight = visibleBottom - visibleTop
  const targetHeight = range.bottom - range.top
  let delta = 0

  if (targetHeight > visibleHeight) {
    if (range.top < visibleTop) {
      delta = range.top - visibleTop
    } else if (range.bottom > visibleBottom) {
      // If target is taller than viewport, align its top to keep the opening context visible.
      delta = range.top - visibleTop
    }
  } else if (range.bottom > visibleBottom) {
    delta = range.bottom - visibleBottom
  } else if (range.top < visibleTop) {
    delta = range.top - visibleTop
  }

  if (delta === 0) return false

  const nextTop = Math.max(0, container.scrollTop + delta)
  if (typeof container.scrollTo === 'function') {
    try {
      container.scrollTo({ top: nextTop, behavior: 'smooth' })
      return true
    } catch {
      // Fall through to scrollTop assignment for non-supporting environments.
    }
  }

  container.scrollTop = nextTop
  return true
}

export const revealElementsInSettingPanel = (
  anchor: HTMLElement | null,
  popup: HTMLElement | null,
  margin: number = DEFAULT_SCROLL_MARGIN,
): boolean => {
  const container = getSettingScrollContainer(anchor)
  if (!container) return false

  const range = getCombinedVerticalRange([anchor, popup])
  if (!range) return false

  return scrollSettingPanelRangeIntoView(container, range, margin)
}

export const useEnsureSettingPanelVisibility = ({
  isOpen,
  anchorRef,
  popupRef,
}: {
  isOpen: boolean
  anchorRef: RefObject<HTMLElement | null>
  popupRef?: RefObject<HTMLElement | null>
}) => {
  useEffect(() => {
    if (!isOpen) return

    let rafId1 = 0
    let rafId2 = 0

    rafId1 = window.requestAnimationFrame(() => {
      rafId2 = window.requestAnimationFrame(() => {
        revealElementsInSettingPanel(anchorRef.current, popupRef?.current ?? null)
      })
    })

    return () => {
      window.cancelAnimationFrame(rafId1)
      window.cancelAnimationFrame(rafId2)
    }
  }, [anchorRef, isOpen, popupRef])
}
