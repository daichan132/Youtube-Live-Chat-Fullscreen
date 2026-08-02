import { describe, expect, it } from 'vitest'
import { collectPlayerObstacles } from './collectPlayerObstacles'

const rect = (left: number, top: number, width: number, height: number) =>
  ({ x: left, y: top, left, top, right: left + width, bottom: top + height, width, height, toJSON: () => ({}) }) as DOMRect

describe('collectPlayerObstacles', () => {
  it('collects visible YouTube obstacles relative to the player', () => {
    const player = document.createElement('div')
    player.getBoundingClientRect = () => rect(100, 50, 1280, 720)
    const caption = document.createElement('div')
    caption.className = 'ytp-caption-window-container'
    caption.getBoundingClientRect = () => rect(500, 550, 400, 80)
    const hiddenMenu = document.createElement('div')
    hiddenMenu.className = 'ytp-panel-menu'
    hiddenMenu.style.display = 'none'
    hiddenMenu.getBoundingClientRect = () => rect(900, 100, 300, 400)
    player.append(caption, hiddenMenu)

    expect(collectPlayerObstacles(player, false)).toEqual([{ kind: 'caption', rect: { x: 400, y: 500, width: 400, height: 80 } }])
  })

  it('models the open extension settings panel as a centered obstacle', () => {
    const player = document.createElement('div')
    player.getBoundingClientRect = () => rect(20, 30, 1280, 720)

    expect(collectPlayerObstacles(player, true)).toContainEqual({
      kind: 'settings',
      rect: { x: 410, y: 120, width: 460, height: 480 },
    })
  })
})
