import { useCallback, useRef, useState } from 'react'

import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import classNames from 'classnames'
import { Resizable } from 're-resizable'
import { useShallow } from 'zustand/react/shallow'

import { useYTDLiveChatNoLsStore } from '@/shared/stores/ytdLiveChatNoLsStore'
import useYTDLiveChatStore from '@/shared/stores/ytdLiveChatStore'
import { useDisanleTopTransition } from '../hooks/useDisanleTopTransition'
import { useIconDisplay } from '../hooks/useIconDisplay'
import styles from '../styles/DraggableItem.module.css'
import { ClipPathEffect } from './EffectComponent/ClipPathEffect'
import { HoverEffect } from './EffectComponent/HoverEffect'

import { DragIcon } from './DragIcon'
import { SettingIcon } from './SettingIcon'

import { ResizableMinHeight, ResizableMinWidth } from '@/shared/constants'
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
  const { size, setSize, setCoordinates } = useYTDLiveChatStore(
    useShallow(state => ({
      size: state.size,
      setSize: state.setSize,
      setCoordinates: state.setCoordinates,
    })),
  )
  const { clip, isClipPath } = useYTDLiveChatNoLsStore(useShallow(state => ({ clip: state.clip, isClipPath: state.isClipPath })))
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
    <>
      <ClipPathEffect isDragging={isDragging} isResizing={isResizing} />
      <HoverEffect isDragging={isDragging} />
      <WindowResizeEffect />
      <DisplayEffect />
      <Resizable
        size={size}
        minWidth={ResizableMinWidth}
        minHeight={ResizableMinHeight}
        className={styles.Resizable}
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
          className={classNames(styles.Container)}
          style={{
            transform: CSS.Translate.toString(transform),
            clipPath: isClipPath ? `inset(${clip.header}px 0 ${clip.input}px 0 round 10px)` : 'inset(0 round 10px)',
            transition: 'clip-path 250ms ease',
          }}
          ref={setNodeRef}
        >
          <div
            className={classNames(styles.dragButton, isDragging && styles.dragging)}
            {...attributes}
            {...listeners}
            style={{ opacity: isIconDisplay ? 1 : 0 }}
          >
            <DragIcon />
          </div>
          <div className={styles.settingButton} style={{ opacity: isIconDisplay ? 1 : 0 }}>
            <SettingIcon />
          </div>
          <div className={styles.children}>
            {isDragging && <div className={styles.overlay} />}
            {children}
          </div>
        </div>
      </Resizable>
    </>
  )
}
