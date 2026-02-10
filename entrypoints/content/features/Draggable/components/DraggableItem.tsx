import { useDraggable } from '@dnd-kit/core'
import { Resizable } from 're-resizable'
import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'

import { ResizableMinHeight, ResizableMinWidth } from '@/shared/constants'
import { useYTDLiveChatNoLsStore } from '@/shared/stores/ytdLiveChatNoLsStore'
import useYTDLiveChatStore from '@/shared/stores/ytdLiveChatStore'
import { useClipAnimationPriming } from '../hooks/useClipAnimationPriming'
import { useDisableTopTransition } from '../hooks/useDisableTopTransition'
import { useDraggableItemEvents, useDraggableItemStyles } from '../hooks/useDraggableItemStyles'
import { useResizableHandlers } from '../hooks/useResizableHandlers'
import { ControlIcons } from './ControlIcons'
import { EffectsWrapper } from './EffectComponent/EffectsWrapper'

interface DraggableItemProps {
  top: number
  left: number
  children: React.ReactNode
}

export const DraggableItem = ({ top, left, children }: DraggableItemProps) => {
  const { attributes, isDragging, listeners, setNodeRef, transform } = useDraggable({ id: 'wrapper' })
  const [isResizing, setIsResizing] = useState(false)

  const { size, setSize, setCoordinates, fontColor } = useYTDLiveChatStore(
    useShallow(state => ({
      size: state.size,
      setSize: state.setSize,
      setCoordinates: state.setCoordinates,
      fontColor: state.fontColor,
    })),
  )

  const {
    clip,
    isClipPath = false,
    setIsOpenSettingModal,
    setIsHover,
  } = useYTDLiveChatNoLsStore(
    useShallow(state => ({
      clip: state.clip,
      isClipPath: state.isClipPath,
      setIsOpenSettingModal: state.setIsOpenSettingModal,
      setIsHover: state.setIsHover,
    })),
  )

  const { onResizeStart, onResize, onResizeStop } = useResizableHandlers({
    size,
    setSize,
    left,
    top,
    setCoordinates,
    setIsResizing,
  })

  const disableTopTransition = useDisableTopTransition(isDragging, isResizing)
  const { isClipAnimationReady } = useClipAnimationPriming({ isClipPath, clip })

  const { resizableStyle, innerDivStyle } = useDraggableItemStyles({
    top,
    left,
    isClipPath,
    isClipAnimationReady,
    disableTopTransition,
    isResizing,
    transform,
    clip,
  })

  const { handleMouseEnter, handleMouseLeave } = useDraggableItemEvents(setIsHover)

  return (
    <div role='application' onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <EffectsWrapper isDragging={isDragging} isResizing={isResizing} />

      <Resizable
        size={size}
        minWidth={ResizableMinWidth}
        minHeight={ResizableMinHeight}
        className='absolute'
        onResizeStart={onResizeStart}
        onResize={onResize}
        onResizeStop={onResizeStop}
        style={{ ...resizableStyle, pointerEvents: resizableStyle.pointerEvents as React.CSSProperties['pointerEvents'] }}
      >
        <div className='relative h-full w-full pointer-events-auto' style={innerDivStyle} ref={setNodeRef}>
          <ControlIcons
            fontColor={fontColor}
            dragProps={{ attributes, listeners, isDragging }}
            onSettingsClick={() => setIsOpenSettingModal(true)}
          />

          <div className='relative w-full h-full'>
            {isDragging && <div className='absolute w-100% h-100% z-100 cursor-grabbing bg-transparent' />}
            {children}
          </div>
        </div>
      </Resizable>
    </div>
  )
}
