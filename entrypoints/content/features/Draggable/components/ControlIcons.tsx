import type { DraggableAttributes } from '@dnd-kit/core'
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities'
import type { RGBColor } from 'react-color'
import { TbAdjustmentsHorizontal, TbGripVertical } from 'react-icons/tb'
import { useIconDisplay } from '../hooks/useIconDisplay'

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
  const iconStrokeWidth = 1.55

  return (
    <>
      <div
        className='absolute top-[6px] right-[44px] z-10 cursor-grab'
        {...attributes}
        {...listeners}
        style={{ opacity: isIconDisplay ? 1 : 0 }}
      >
        <div className={`ylc-overlay-control-icon cursor-grab ${isDragging ? 'ylc-overlay-control-icon-active' : ''}`}>
          <TbGripVertical size={22} color={colorString} strokeWidth={iconStrokeWidth} />
        </div>
      </div>

      <div className='absolute top-[6px] right-[82px] z-10 cursor-pointer' style={{ opacity: isIconDisplay ? 1 : 0 }}>
        <button type='button' className='ylc-overlay-control-icon cursor-pointer' onClick={onSettingsClick}>
          <TbAdjustmentsHorizontal size={22} color={colorString} strokeWidth={iconStrokeWidth} />
        </button>
      </div>
    </>
  )
}
