import { CiSettings } from 'react-icons/ci'
import { RiDraggable } from 'react-icons/ri'
import { useIconDisplay } from '../hooks/useIconDisplay'
import type { DraggableAttributes } from '@dnd-kit/core'
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities'
import type { RGBColor } from 'react-color'

interface DragProps {
  attributes: DraggableAttributes
  listeners: SyntheticListenerMap | undefined
  isDragging: boolean
}

interface ControlIconsProps {
  fontColor: RGBColor
  dragProps: DragProps
  onSettingsClick: () => void
}

export const ControlIcons = ({ fontColor, dragProps, onSettingsClick }: ControlIconsProps) => {
  const isIconDisplay = useIconDisplay()
  const { attributes, listeners, isDragging } = dragProps
  const colorString = `rgba(${fontColor.r}, ${fontColor.g}, ${fontColor.b}, ${fontColor.a})`

  return (
    <>
      <div
        className="absolute top-[4px] right-[48px] z-10 cursor-grab"
        {...attributes}
        {...listeners}
        style={{ opacity: isIconDisplay ? 1 : 0 }}
      >
        <RiDraggable
          className={`rounded-[100%] transition-[background-color] p-[8px] hover:bg-black/10 ${isDragging && 'bg-black/10'} cursor-grab`}
          size={24}
          color={colorString}
        />
      </div>

      <div
        className="absolute top-[4px] right-[88px] z-10 cursor-pointer"
        style={{ opacity: isIconDisplay ? 1 : 0 }}
      >
        <CiSettings
          className="rounded-[100%] transition-[background-color] p-[8px] hover:bg-black/10"
          size={24}
          onClick={onSettingsClick}
          color={colorString}
        />
      </div>
    </>
  )
}
