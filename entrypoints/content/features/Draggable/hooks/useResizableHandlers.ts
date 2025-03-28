import { ResizableMinHeight, ResizableMinWidth } from '@/shared/constants'
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

  const handleResizeStart = useCallback(() => {
    setIsResizing(true)
    coordinateRef.current = { x: left, y: top }
  }, [left, top, setIsResizing])

  // 座標の境界チェックを行うヘルパー関数
  const ensurePositiveCoordinate = useCallback((value: number): number => {
    return Math.max(0, value)
  }, [])

  const handleResize = useCallback(
    (_event: MouseEvent | TouchEvent, direction: Direction, _ref: HTMLElement, delta: NumberSize) => {
      const directionToCoordinateChanges: Record<Direction, { x: number; y: number }> = {
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

      // 座標調整が必要な方向の場合のみ座標を更新
      if (changes.x !== 0 || changes.y !== 0) {
        const newLeft = coordinateRef.current.x + changes.x
        const newTop = coordinateRef.current.y + changes.y

        setCoordinates({
          x: ensurePositiveCoordinate(newLeft),
          y: ensurePositiveCoordinate(newTop),
        })
      }

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
      // 実際の要素サイズを取得して設定
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
