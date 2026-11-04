import { describe, expect, it } from 'vitest'
import { collectPlayerObstacles } from '../platform/youtube/collectPlayerObstacles'
import { mutationTouchesPlayerObstacle } from './useAutomaticOverlayPlacement'

describe('player obstacle measurement and observation', () => {
  it.each([
    { className: 'ytp-caption-window-container', kind: 'caption' },
    { className: 'caption-window', kind: 'caption' },
    { className: 'ytp-chrome-bottom', kind: 'controls' },
    { className: 'ytp-panel-menu', kind: 'menu' },
    { className: 'html5-endscreen', kind: 'end-screen' },
    { className: 'ytp-ce-element', kind: 'end-screen' },
  ])('measures and observes addition, visibility, and removal of $className', ({ className, kind }) => {
    const player = document.createElement('div')
    const obstacle = document.createElement('div')
    obstacle.className = className
    player.getBoundingClientRect = () => new DOMRect(0, 0, 1000, 700)
    obstacle.getBoundingClientRect = () => new DOMRect(10, 20, 100, 50)
    document.body.append(player)
    const observer = new MutationObserver(() => {})
    observer.observe(player, { childList: true, subtree: true, attributes: true })
    const changed = () => observer.takeRecords().some(record => mutationTouchesPlayerObstacle(record, player))

    player.append(obstacle)
    expect(changed()).toBe(true)
    expect(collectPlayerObstacles(player, false)).toEqual([{ kind, rect: { x: 10, y: 20, width: 100, height: 50 } }])
    obstacle.style.display = 'none'
    expect(changed()).toBe(true)
    expect(collectPlayerObstacles(player, false)).toEqual([])
    obstacle.style.display = ''
    expect(changed()).toBe(true)
    expect(collectPlayerObstacles(player, false)).toHaveLength(1)
    obstacle.remove()
    expect(changed()).toBe(true)
    expect(collectPlayerObstacles(player, false)).toEqual([])

    observer.disconnect()
    player.remove()
  })

  it('observes a hidden popup becoming visible and hidden again', () => {
    const player = document.createElement('div')
    const menu = document.createElement('div')
    menu.className = 'ytp-popup ytp-settings-menu-hidden'
    player.getBoundingClientRect = () => new DOMRect(0, 0, 1000, 700)
    menu.getBoundingClientRect = () => new DOMRect(10, 20, 100, 50)
    document.body.append(player)
    const observer = new MutationObserver(() => {})
    observer.observe(player, { childList: true, subtree: true, attributes: true })
    const changed = () => observer.takeRecords().some(record => mutationTouchesPlayerObstacle(record, player))

    player.append(menu)
    expect(changed()).toBe(true)
    expect(collectPlayerObstacles(player, false)).toEqual([])
    menu.classList.remove('ytp-settings-menu-hidden')
    expect(changed()).toBe(true)
    expect(collectPlayerObstacles(player, false)).toEqual([{ kind: 'menu', rect: { x: 10, y: 20, width: 100, height: 50 } }])
    menu.classList.add('ytp-settings-menu-hidden')
    expect(changed()).toBe(true)
    expect(collectPlayerObstacles(player, false)).toEqual([])
    menu.remove()
    expect(changed()).toBe(true)

    observer.disconnect()
    player.remove()
  })

  it('observes ancestor visibility while ignoring unrelated subtree attributes', () => {
    const player = document.createElement('div')
    const parent = document.createElement('div')
    const caption = document.createElement('div')
    const unrelated = document.createElement('div')
    caption.className = 'caption-window'
    parent.append(caption)
    unrelated.append(document.createElement('span'))
    player.append(parent, unrelated)
    document.body.append(player)
    const observer = new MutationObserver(() => {})
    observer.observe(player, { attributes: true, subtree: true })
    const changed = () => observer.takeRecords().some(record => mutationTouchesPlayerObstacle(record, player))

    parent.hidden = true
    expect(changed()).toBe(true)
    parent.hidden = false
    expect(changed()).toBe(true)
    unrelated.className = 'playing'
    expect(changed()).toBe(false)

    observer.disconnect()
    player.remove()
  })
})
