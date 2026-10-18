import { IFRAME_CHAT_SCROLL_FOLLOWING_CLASS } from '@/entrypoints/content/features/YTDLiveChatIframe/constants/styleContract'
import {
  chatMessageItemProbe,
  chatMessageScrollerProbe,
  closestProbe,
  queryFirstProbe,
} from '@/entrypoints/content/platform/youtube/selectorCatalog'

/** Own scroll compensation only for a chrome transition, never ordinary chat. */
export const preserveChatScroll = (body: HTMLElement, durationMs: number) => {
  const scroller = queryFirstProbe<HTMLElement>(body, chatMessageScrollerProbe).element
  const view = body.ownerDocument.defaultView
  if (!scroller || !view || scroller.clientHeight <= 0) return null

  const initialTop = scroller.scrollTop
  const bounds = scroller.getBoundingClientRect()
  const following = scroller.scrollHeight - scroller.clientHeight - initialTop <= 2
  const hit = following ? null : body.ownerDocument.elementFromPoint?.(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2)
  let anchor = hit ? closestProbe<HTMLElement>(hit, chatMessageItemProbe) : null
  if (anchor && !scroller.contains(anchor)) anchor = null
  const anchorTop = anchor?.getBoundingClientRect().top ?? 0
  const originals = ['overflow-anchor', 'scroll-behavior'].map(property => ({
    property,
    value: scroller.style.getPropertyValue(property),
    priority: scroller.style.getPropertyPriority(property),
    installed: property === 'overflow-anchor' ? 'none' : 'auto',
  }))
  for (const { property, installed } of originals) scroller.style.setProperty(property, installed, 'important')

  // Native resize handling can briefly reveal its jump button before our
  // bottom correction is processed. History readers keep that control.
  const suppressJump = following && durationMs > 0
  if (suppressJump) body.classList.add(IFRAME_CHAT_SCROLL_FOLLOWING_CLASS)

  let stopped = false
  let frame = 0
  let timer = 0
  let observer: ResizeObserver | null = null
  const stop = () => {
    if (stopped) return
    stopped = true
    if (suppressJump) body.classList.remove(IFRAME_CHAT_SCROLL_FOLLOWING_CLASS)
    view.cancelAnimationFrame(frame)
    view.clearTimeout(timer)
    observer?.disconnect()
    for (const type of ['wheel', 'touchstart', 'pointerdown']) body.removeEventListener(type, stop, true)
    body.ownerDocument.removeEventListener('keydown', onKeyDown, true)
    for (const { property, installed, value, priority } of originals) {
      if (scroller.style.getPropertyValue(property) !== installed || scroller.style.getPropertyPriority(property) !== 'important') continue
      if (value) scroller.style.setProperty(property, value, priority)
      else scroller.style.removeProperty(property)
    }
    anchor = null
  }
  const restore = () => {
    if (stopped) return
    if (!scroller.isConnected || !body.contains(scroller)) {
      stop()
      return
    }
    if (anchor && (!anchor.isConnected || !scroller.contains(anchor))) {
      stop()
      return
    }
    const target = following
      ? scroller.scrollHeight - scroller.clientHeight
      : anchor?.isConnected && scroller.contains(anchor)
        ? scroller.scrollTop + anchor.getBoundingClientRect().top - anchorTop
        : initialTop + scroller.getBoundingClientRect().top - bounds.top
    const clamped = Math.max(0, Math.min(target, scroller.scrollHeight - scroller.clientHeight))
    if (Math.abs(scroller.scrollTop - clamped) > 0.5) scroller.scrollTop = clamped
  }
  const onKeyDown = (event: KeyboardEvent) => {
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) stop()
  }
  const tick = () => {
    restore()
    if (!stopped) frame = view.requestAnimationFrame(tick)
  }
  if (durationMs > 0) {
    for (const type of ['wheel', 'touchstart', 'pointerdown']) body.addEventListener(type, stop, { capture: true, passive: true })
    body.ownerDocument.addEventListener('keydown', onKeyDown, true)
    frame = view.requestAnimationFrame(tick)
    if (view.ResizeObserver) {
      observer = new view.ResizeObserver(restore)
      observer.observe(scroller)
    }
    timer = view.setTimeout(() => {
      restore()
      stop()
    }, durationMs)
  }
  return { restore, stop }
}
