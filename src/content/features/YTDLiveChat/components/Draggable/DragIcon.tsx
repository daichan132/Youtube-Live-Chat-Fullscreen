import React from 'react'

import { RiDraggable } from 'react-icons/ri'
import { useShallow } from 'zustand/react/shallow'

import { useYTDLiveChatStore } from '@/stores'

export const DragIcon = () => {
  const { fontColor: rgba } = useYTDLiveChatStore(
    useShallow(state => ({ fontColor: state.fontColor })),
  )

  return (
    // hoverしたときにgrabにする
    <RiDraggable
      style={{
        cursor: 'grab',
      }}
      size={24}
      color={`rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a})`}
    />
  )
}
