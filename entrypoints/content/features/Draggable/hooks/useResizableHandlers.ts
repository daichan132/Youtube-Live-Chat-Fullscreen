import type { NumberSize } from 're-resizable'
import type { Direction } from 're-resizable/lib/resizer'
import { useCallback, useRef } from 'react'
import { ResizableMinHeight, ResizableMinWidth } from '@/shared/constants'

interface Size {
  width: number
  height: number
}

interface Coordinates {
  x: number
  y: number
}

interface UseResizableHandlersProps {
  size: Size
  setSize: (size: Size) => void
  left: number
  top: number
  setCoordinates: (coordinates: Coordinates) => void
  setIsResizing: (isResizing: boolean) => void
}

const ensurePositiveCoordinate = (value: number): number => Math.max(0, value)

const DIRECTION_COORDINATE_CHANGES: Record<Direction, (delta: NumberSize) => Coordinates> = {
  top: delta => ({ x: 0, y: -delta.height }),
  left: delta => ({ x: -delta.width, y: 0 }),
  topLeft: delta => ({ x: -delta.width, y: -delta.height }),
  bottomLeft: delta => ({ x: -delta.width, y: 0 }),
  topRight: delta => ({ x: 0, y: -delta.height }),
  right: () => ({ x: 0, y: 0 }),
  bottom: () => ({ x: 0, y: 0 }),
  bottomRight: () => ({ x: 0, y: 0 }),
}

/**
 * Hook to manage resizable element handlers
 * Handles coordinate adjustments during resize operations and enforces minimum sizes
 */
export const useResizableHandlers = ({ size, setSize, left, top, setCoordinates, setIsResizing }: UseResizableHandlersProps) => {
  const coordinateRef = useRef({ x: left, y: top })
  const sizeRef = useRef(size)
  sizeRef.current = size

  const handleResizeStart = useCallback(() => {
    setIsResizing(true)
    coordinateRef.current = { x: left, y: top }
  }, [left, top, setIsResizing])

  const handleResize = useCallback(
    (_event: MouseEvent | TouchEvent, direction: Direction, _ref: HTMLElement, delta: NumberSize) => {
      const getChanges = DIRECTION_COORDINATE_CHANGES[direction]
      const changes = getChanges ? getChanges(delta) : { x: 0, y: 0 }

      if (changes.x !== 0 || changes.y !== 0) {
        const newLeft = coordinateRef.current.x + changes.x
        const newTop = coordinateRef.current.y + changes.y

        setCoordinates({
          x: ensurePositiveCoordinate(newLeft),
          y: ensurePositiveCoordinate(newTop),
        })
      }

      setSize({
        width: sizeRef.current.width + delta.width,
        height: sizeRef.current.height + delta.height,
      })
    },
    [setCoordinates, setSize],
  )

  const handleResizeStop = useCallback(
    (_event: MouseEvent | TouchEvent, _direction: Direction, _ref: HTMLElement, _delta: NumberSize) => {
      setIsResizing(false)

      const finalSize = {
        width: Math.max(ResizableMinWidth, _ref.offsetWidth),
        height: Math.max(ResizableMinHeight, _ref.offsetHeight),
      }
      setSize(finalSize)
    },
    [setSize, setIsResizing],
  )

  return {
    onResizeStart: handleResizeStart,
    onResize: handleResize,
    onResizeStop: handleResizeStop,
  }
}
