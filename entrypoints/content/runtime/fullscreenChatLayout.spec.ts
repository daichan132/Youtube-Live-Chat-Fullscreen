import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSessionScope } from '../bootstrap/SessionScope'
import { createPlayerLayoutLease, type PlayerLayoutLease } from './resources/PlayerLayoutLease'

let lease: PlayerLayoutLease | null = null

const createLease = () => {
  const scope = createSessionScope(1)
  lease = createPlayerLayoutLease(scope)
  return { lease, scope }
}

describe('fullscreenChatLayout', () => {
  afterEach(() => {
    lease?.release()
    lease = null
    document.body.replaceChildren()
    vi.useRealTimers()
  })

  it.each(['ytd-watch-flexy', 'ytd-watch-grid'])('parks both native chat locations with a nonzero iframe area on %s', tag => {
    vi.useFakeTimers()
    const watch = document.createElement(tag)
    watch.innerHTML = `
        <div id="secondary"><div id="chat-container"><ytd-live-chat-frame></ytd-live-chat-frame></div></div>
        <div id="panels-full-bleed-container"><div id="chat-container"><ytd-live-chat-frame></ytd-live-chat-frame></div></div>
      `
    document.body.append(watch)
    const { lease } = createLease()
    lease.reconcile(true)

    for (const selector of ['#secondary', '#panels-full-bleed-container']) {
      const area = watch.querySelector(selector)
      if (!area) throw new Error(`Missing native chat area: ${selector}`)
      const style = getComputedStyle(area)
      expect(style.position).toBe('fixed')
      expect(style.visibility).toBe('hidden')
      expect(style.pointerEvents).toBe('none')
      expect(Number.parseFloat(style.top)).toBeLessThan(0)
      for (const element of [area, ...area.querySelectorAll('#chat-container, ytd-live-chat-frame')]) {
        const size = getComputedStyle(element)
        expect(Number.parseFloat(size.width)).toBeGreaterThan(0)
        expect(Number.parseFloat(size.height)).toBeGreaterThan(0)
      }
    }

    lease.reconcile(false)
    expect(document.documentElement.classList.contains('ylc-fullscreen-chat-fix')).toBe(false)
    expect(getComputedStyle(watch.querySelector('#secondary') as Element).position).not.toBe('fixed')
    expect(getComputedStyle(watch.querySelector('#panels-full-bleed-container') as Element).visibility).not.toBe('hidden')
  })

  it('cleans the injected style and pending timers on release', () => {
    vi.useFakeTimers()
    const resize = vi.fn()
    window.addEventListener('resize', resize)
    const { lease } = createLease()

    lease.reconcile(true)
    lease.release()
    vi.runAllTimers()

    expect(document.getElementById('ylc-fullscreen-chat-layout-fix')).toBeNull()
    expect(document.documentElement.classList.contains('ylc-fullscreen-chat-fix')).toBe(false)
    expect(resize).not.toHaveBeenCalled()
    window.removeEventListener('resize', resize)
  })

  it('retries YouTube layout recalculation after deactivation', () => {
    vi.useFakeTimers()
    const resize = vi.fn()
    window.addEventListener('resize', resize)
    const { lease } = createLease()

    lease.reconcile(true)
    lease.reconcile(false)
    vi.runAllTimers()

    expect(resize).toHaveBeenCalledTimes(3)
    window.removeEventListener('resize', resize)
  })
})
