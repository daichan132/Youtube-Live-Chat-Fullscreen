import type { DraggableAttributes } from '@dnd-kit/core'
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities'
import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { TbAdjustmentsHorizontal, TbGripVertical } from '@/shared/components/icons'
import type { RGBColor } from '@/shared/types/ytdLiveChatType'
import { useIconDisplay } from '../hooks/useIconDisplay'

const ICON_STROKE_WIDTH = 1.55
const CONTROL_BUTTON_SIZE = 40
const CONTROL_GAP = 2
const CONTROL_TOP_OFFSET = 4
// Measured from YouTube chat iframe runtime: menu ("...") circle left edge is 48px from iframe right.
const YOUTUBE_MENU_CIRCLE_LEFT_INSET = 48
const DRAG_RIGHT_OFFSET = YOUTUBE_MENU_CIRCLE_LEFT_INSET + CONTROL_GAP
const SETTINGS_RIGHT_OFFSET = DRAG_RIGHT_OFFSET + CONTROL_BUTTON_SIZE + CONTROL_GAP

const VISUALLY_HIDDEN_STYLE: CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0,0,0,0)',
  whiteSpace: 'nowrap',
  border: 0,
}

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
  const { t } = useTranslation()
  const isIconDisplay = useIconDisplay()
  const { attributes, listeners, isDragging } = dragProps
  const colorString = `rgba(${fontColor.r}, ${fontColor.g}, ${fontColor.b}, ${fontColor.a})`
  const runtimeHoverColor = `rgba(${fontColor.r}, ${fontColor.g}, ${fontColor.b}, 0.1)`
  const runtimeHoverVarStyle = {
    '--ylc-overlay-control-hover-runtime': runtimeHoverColor,
  } as CSSProperties

  return (
    <>
      {/* biome-ignore lint/a11y/useSemanticElements: ドラッグハンドルにはdivが適切 */}
      <div
        className='absolute z-10 cursor-grab'
        {...attributes}
        {...listeners}
        role='button'
        tabIndex={0}
        aria-label={t('content.aria.dragToMove')}
        aria-roledescription='drag handle'
        aria-describedby='ylc-drag-desc'
        style={{
          top: CONTROL_TOP_OFFSET,
          right: DRAG_RIGHT_OFFSET,
          opacity: isIconDisplay ? 1 : 0,
          ...runtimeHoverVarStyle,
        }}
      >
        <div className={`ylc-overlay-control-icon cursor-grab ${isDragging ? 'ylc-overlay-control-icon-active' : ''}`}>
          <TbGripVertical size={22} color={colorString} strokeWidth={ICON_STROKE_WIDTH} />
        </div>
        <span id='ylc-drag-desc' style={VISUALLY_HIDDEN_STYLE}>
          {t('content.aria.arrowKeysToMove')}
        </span>
      </div>

      <div
        className='absolute z-10 cursor-pointer'
        style={{
          top: CONTROL_TOP_OFFSET,
          right: SETTINGS_RIGHT_OFFSET,
          opacity: isIconDisplay ? 1 : 0,
          ...runtimeHoverVarStyle,
        }}
      >
        <button
          type='button'
          data-ylc-settings-btn
          className='ylc-overlay-control-icon cursor-pointer ylc-theme-focus-ring'
          aria-label={t('content.aria.openSettings')}
          onClick={onSettingsClick}
        >
          <TbAdjustmentsHorizontal size={22} color={colorString} strokeWidth={ICON_STROKE_WIDTH} />
        </button>
      </div>
    </>
  )
}
