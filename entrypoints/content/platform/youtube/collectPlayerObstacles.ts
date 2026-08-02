import {
  captionObstacleProbe,
  endScreenObstacleProbe,
  playerControlsObstacleProbe,
  playerMenuObstacleProbe,
  queryAllProbes,
} from './selectorCatalog'

export type PlayerObstacle = {
  kind: 'caption' | 'controls' | 'menu' | 'end-screen' | 'settings'
  rect: { x: number; y: number; width: number; height: number }
}

const isVisible = (element: Element, rect: DOMRect) => {
  if (rect.width <= 0 || rect.height <= 0) return false
  const style = window.getComputedStyle(element)
  return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0'
}

export const collectPlayerObstacles = (player: HTMLElement, settingsOpen: boolean): PlayerObstacle[] => {
  const playerRect = player.getBoundingClientRect()
  const probes = [
    ['caption', captionObstacleProbe],
    ['controls', playerControlsObstacleProbe],
    ['menu', playerMenuObstacleProbe],
    ['end-screen', endScreenObstacleProbe],
  ] as const
  const obstacles: PlayerObstacle[] = []
  for (const [kind, probe] of probes) {
    for (const element of queryAllProbes<HTMLElement>(player, probe).elements) {
      const rect = element.getBoundingClientRect()
      if (!isVisible(element, rect)) continue
      obstacles.push({
        kind,
        rect: {
          x: rect.left - playerRect.left,
          y: rect.top - playerRect.top,
          width: rect.width,
          height: rect.height,
        },
      })
    }
  }

  if (settingsOpen) {
    const width = Math.min(460, playerRect.width)
    const height = Math.min(480, playerRect.height)
    obstacles.push({
      kind: 'settings',
      rect: {
        x: Math.max(0, (playerRect.width - width) / 2),
        y: Math.max(0, (playerRect.height - height) / 2),
        width,
        height,
      },
    })
  }
  return obstacles
}
