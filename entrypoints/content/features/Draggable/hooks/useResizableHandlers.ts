import { ResizableMinHeight, ResizableMinWidth } from '@/shared/constants'
import type { NumberSize } from 're-resizable'
import type { Direction } from 're-resizable/lib/resizer'
import { useCallback, useRef } from 'react'

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

/**
 * Hook to manage resizable element handlers
 * Handles coordinate adjustments during resize operations and enforces minimum sizes
 */
export const useResizableHandlers = ({ size, setSize, left, top, setCoordinates, setIsResizing }: UseResizableHandlersProps) => {
  const coordinateRef = useRef({ x: left, y: top })

  const handleResizeStart = useCallback(() => {
    setIsResizing(true)
    coordinateRef.current = { x: left, y: top }
  }, [left, top, setIsResizing])

  /**
   * Ensures coordinate values are non-negative
   */
  const ensurePositiveCoordinate = useCallback((value: number): number => {
    return Math.max(0, value)
  }, [])

  const handleResize = useCallback(
    (_event: MouseEvent | TouchEvent, direction: Direction, _ref: HTMLElement, delta: NumberSize) => {
      // Map of how each resize direction affects the element coordinates
      const directionToCoordinateChanges: Record<Direction, Coordinates> = {
        top: { x: 0, y: -delta.height },
        left: { x: -delta.width, y: 0 },
        topLeft: { x: -delta.width, y: -delta.height },
        bottomLeft: { x: -delta.width, y: 0 },
        topRight: { x: 0, y: -delta.height },
        right: { x: 0, y: 0 },
        bottom: { x: 0, y: 0 },
        bottomRight: { x: 0, y: 0 },
      }

      const changes = directionToCoordinateChanges[direction] || { x: 0, y: 0 }

      // Update coordinates only when needed
      if (changes.x !== 0 || changes.y !== 0) {
        const newLeft = coordinateRef.current.x + changes.x
        const newTop = coordinateRef.current.y + changes.y

        setCoordinates({
          x: ensurePositiveCoordinate(newLeft),
          y: ensurePositiveCoordinate(newTop),
        })
      }

      // Update size
      setSize({
        width: size.width + delta.width,
        height: size.height + delta.height,
      })
    },
    [setCoordinates, setSize, size.width, size.height, ensurePositiveCoordinate],
  )

  const handleResizeStop = useCallback(
    (_event: MouseEvent | TouchEvent, _direction: Direction, _ref: HTMLElement, _delta: NumberSize) => {
      setIsResizing(false)

      // Ensure final size respects minimum dimensions
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
