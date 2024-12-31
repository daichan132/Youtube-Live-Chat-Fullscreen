import type { NumberSize } from 're-resizable'
import type { Direction } from 're-resizable/lib/resizer'
import { useCallback, useRef } from 'react'

interface UseResizableHandlersProps {
  size: { width: number; height: number }
  setSize: (size: { width: number; height: number }) => void
  left: number
  top: number
  setCoordinates: (coordinates: { x: number; y: number }) => void
  setIsResizing: (isResizing: boolean) => void
}

export const useResizableHandlers = ({ size, setSize, left, top, setCoordinates, setIsResizing }: UseResizableHandlersProps) => {
  const coordinateRef = useRef({ x: left, y: top })

  const onResizeStart = useCallback(() => {
    setIsResizing(true)
    coordinateRef.current = { x: left, y: top }
  }, [left, top, setIsResizing])

  const onResize = useCallback(
    (_event: MouseEvent | TouchEvent, direction: Direction, _ref: HTMLElement, delta: NumberSize) => {
      const directions = ['top', 'left', 'topLeft', 'bottomLeft', 'topRight']

      if (directions.includes(direction)) {
        let newLeft = coordinateRef.current.x
        let newTop = coordinateRef.current.y

        if (direction === 'bottomLeft') {
          newLeft = coordinateRef.current.x - delta.width
        } else if (direction === 'topRight') {
          newTop = coordinateRef.current.y - delta.height
        } else {
          newLeft = coordinateRef.current.x - delta.width
          newTop = coordinateRef.current.y - delta.height
        }

        setCoordinates({
          x: newLeft < 0 ? 0 : newLeft,
          y: newTop < 0 ? 0 : newTop,
        })
      }
    },
    [setCoordinates],
  )

  const onResizeStop = useCallback(
    (_event: MouseEvent | TouchEvent, _direction: Direction, _ref: HTMLElement, delta: NumberSize) => {
      setIsResizing(false)
      let newWidth = size.width + delta.width
      let newHeight = size.height + delta.height
      if (newWidth + left > window.innerWidth) {
        newWidth = window.innerWidth - left
      }
      if (newHeight + top > window.innerHeight) {
        newHeight = window.innerHeight - top
      }
      setSize({ width: newWidth, height: newHeight })
    },
    [left, top, setSize, size.width, size.height, setIsResizing],
  )

  return {
    onResizeStart,
    onResize,
    onResizeStop,
  }
}
