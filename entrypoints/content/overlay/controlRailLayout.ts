type Box = { left: number; top: number; width: number; height: number }
type Side = 'bottom' | 'top' | 'right' | 'left' | 'keyboard'

export const getControlRailLayout = ({
  chat,
  viewport,
  length,
  thickness,
  gap = 6,
  padding = 4,
}: {
  chat: Box
  viewport: { width: number; height: number }
  length: number
  thickness: number
  gap?: number
  padding?: number
}) => {
  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max))
  const rowLeft = clamp(chat.left + chat.width - length, padding, viewport.width - length - padding) - chat.left
  const columnTop = clamp(chat.top, padding, viewport.height - length - padding) - chat.top
  let side: Side = 'keyboard'
  let rail: Box = {
    left: rowLeft,
    top: clamp(chat.top + chat.height + gap, padding, viewport.height - thickness - padding) - chat.top,
    width: length,
    height: thickness,
  }
  if (length <= viewport.width - padding * 2) {
    if (chat.top + chat.height + gap + thickness <= viewport.height - padding) {
      side = 'bottom'
      rail.top = chat.height + gap
    } else if (chat.top - gap - thickness >= padding) {
      side = 'top'
      rail.top = -gap - thickness
    }
  }
  if (side === 'keyboard' && length <= viewport.height - padding * 2) {
    if (chat.left + chat.width + gap + thickness <= viewport.width - padding) {
      side = 'right'
      rail = { left: chat.width + gap, top: columnTop, width: thickness, height: length }
    } else if (chat.left - gap - thickness >= padding) {
      side = 'left'
      rail = { left: -gap - thickness, top: columnTop, width: thickness, height: length }
    }
  }
  let bridge: Box | null = null
  if (side === 'bottom' || side === 'top') {
    const left = Math.max(0, rail.left)
    bridge = {
      left,
      top: side === 'bottom' ? chat.height : -gap,
      width: Math.max(0, Math.min(chat.width, rail.left + rail.width) - left),
      height: gap,
    }
  } else if (side === 'left' || side === 'right') {
    const top = Math.max(0, rail.top)
    bridge = {
      left: side === 'right' ? chat.width : -gap,
      top,
      width: gap,
      height: Math.max(0, Math.min(chat.height, rail.top + rail.height) - top),
    }
  }
  return { side, rail, bridge, vertical: side === 'left' || side === 'right', hoverEnabled: side !== 'keyboard' }
}
