import { useState } from 'react'

import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Resizable } from 're-resizable'
import { useShallow } from 'zustand/react/shallow'

import { useYTDLiveChatNoLsStore } from '@/shared/stores/ytdLiveChatNoLsStore'
import useYTDLiveChatStore from '@/shared/stores/ytdLiveChatStore'
import { useDisanleTopTransition } from '../hooks/useDisanleTopTransition'
import { useIconDisplay } from '../hooks/useIconDisplay'
import { ClipPathEffect } from './EffectComponent/ClipPathEffect'
import { HoverEffect } from './EffectComponent/HoverEffect'

import { ResizableMinHeight, ResizableMinWidth } from '@/shared/constants'
import { CiSettings } from 'react-icons/ci'
import { RiDraggable } from 'react-icons/ri'
import { WindowResizeEffect } from '../../Draggable/components/EffectComponent/WindowResizeEffect'
import { useResizableHandlers } from '../hooks/useResizableHandlers'
import { DisplayEffect } from './EffectComponent/DisplayEffect'

interface DraggableItemType {
  top?: number
  left?: number
  children: React.ReactNode
}
export const DraggableItem = ({ top = 0, left = 0, children }: DraggableItemType) => {
  const { attributes, isDragging, listeners, setNodeRef, transform } = useDraggable({ id: 'wrapper' })
  const {
    size,
    setSize,
    setCoordinates,
    fontColor: rgba,
  } = useYTDLiveChatStore(
    useShallow(state => ({
      size: state.size,
      setSize: state.setSize,
      setCoordinates: state.setCoordinates,
      fontColor: state.fontColor,
    })),
  )
  const { clip, isClipPath, setIsOpenSettingModal, setIsHover } = useYTDLiveChatNoLsStore(
    useShallow(state => ({
      clip: state.clip,
      isClipPath: state.isClipPath,
      setIsOpenSettingModal: state.setIsOpenSettingModal,
      setIsHover: state.setIsHover,
    })),
  )
  const [isResizing, setIsResizing] = useState(false)
  const { onResizeStart, onResize, onResizeStop } = useResizableHandlers({
    size,
    setSize,
    left,
    top,
    setCoordinates,
    setIsResizing,
  })
  const disableTopTransition = useDisanleTopTransition(isDragging, isResizing)
  const isIconDisplay = useIconDisplay()

  return (
    <div onMouseEnter={() => setIsHover(true)} onMouseLeave={() => setIsHover(false)}>
      <ClipPathEffect isDragging={isDragging} isResizing={isResizing} />
      <HoverEffect isDragging={isDragging} />
      <WindowResizeEffect />
      <DisplayEffect />
      <Resizable
        size={size}
        minWidth={ResizableMinWidth}
        minHeight={ResizableMinHeight}
        className='absolute transition-all'
        onResizeStart={onResizeStart}
        onResize={onResize}
        onResizeStop={onResizeStop}
        style={{
          top,
          left,
          transition: `${!disableTopTransition && 'top 250ms ease'}, ${!isResizing && 'height 250ms ease'}`,
          pointerEvents: isClipPath ? 'none' : 'all',
        }}
      >
        <div
          className='relative h-full w-full pointer-events-auto'
          style={{
            transform: CSS.Translate.toString(transform),
            clipPath: isClipPath ? `inset(${clip.header}px 0 ${clip.input}px 0 round 10px)` : 'inset(0 round 10px)',
            transition: 'clip-path 250ms ease',
          }}
          ref={setNodeRef}
        >
          <div
            className='absolute top-[4px] right-[48px] z-10 cursor-grab'
            {...attributes}
            {...listeners}
            style={{ opacity: isIconDisplay ? 1 : 0 }}
          >
            <RiDraggable
              className={`rounded-[100%] transition-[background-color] p-[8px] hover:bg-black/10 ${isDragging && 'bg-black/10'} cursor-grab`}
              size={24}
              color={`rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a})`}
            />
          </div>
          <div className='absolute top-[4px] right-[88px] z-10 cursor-pointer' style={{ opacity: isIconDisplay ? 1 : 0 }}>
            <CiSettings
              className='rounded-[100%] transition-[background-color] p-[8px] hover:bg-black/10'
              size={24}
              onClick={() => {
                setIsOpenSettingModal(true)
              }}
              color={`rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a})`}
            />
          </div>
          <div className='relative w-full h-full'>
            {isDragging && <div className='absolute w-100% h-100% z-100 cursor-grabbing bg-transparent' />}
            {children}
          </div>
        </div>
      </Resizable>
    </div>
  )
}
