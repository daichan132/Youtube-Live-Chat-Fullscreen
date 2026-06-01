import type { DraggableAttributes } from '@dnd-kit/core'
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities'
import { type CSSProperties, useId } from 'react'
import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/react/shallow'
import { TbAdjustmentsHorizontal, TbGripVertical } from '@/shared/components/icons'
import { useYTDLiveChatNoLsStore, useYTDLiveChatStore } from '@/shared/stores'

const ICON_STROKE_WIDTH = 1.55
const CONTROL_GAP = 2

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
  controlRailStyle: CSSProperties
  dragProps: DragProps
  isVisible: boolean
  onSettingsClick: () => void
  onControlsHoverChange: (isHover: boolean) => void
}

export const ControlIcons = ({ controlRailStyle, dragProps, isVisible, onSettingsClick, onControlsHoverChange }: ControlIconsProps) => {
  const { t } = useTranslation()
  const dragDescriptionId = useId()
  const { bgColor, fontColor } = useYTDLiveChatStore(
    useShallow(state => ({
      bgColor: state.bgColor,
      fontColor: state.fontColor,
    })),
  )
  const isIframeLoaded = useYTDLiveChatNoLsStore(state => state.isIframeLoaded)
  const isIconDisplay = isIframeLoaded && isVisible
  const { attributes, listeners, isDragging } = dragProps
  const backgroundColorString = `rgba(${bgColor.r}, ${bgColor.g}, ${bgColor.b}, ${bgColor.a})`
  const colorString = `rgba(${fontColor.r}, ${fontColor.g}, ${fontColor.b}, ${fontColor.a})`
  const runtimeHoverColor = `rgba(${fontColor.r}, ${fontColor.g}, ${fontColor.b}, 0.1)`
  const runtimeHoverVarStyle = {
    '--ylc-overlay-control-rail-bg-runtime': backgroundColorString,
    '--ylc-overlay-control-hover-runtime': runtimeHoverColor,
    color: colorString,
  } as CSSProperties

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Hover only keeps controls visible; buttons inside remain semantic.
    <div
      data-ylc-control-rail
      className='ylc-overlay-control-rail absolute z-10 flex items-center'
      onMouseEnter={() => onControlsHoverChange(true)}
      onMouseLeave={() => onControlsHoverChange(false)}
      style={{
        ...controlRailStyle,
        gap: CONTROL_GAP,
        opacity: isIconDisplay ? 1 : 0,
        pointerEvents: isIconDisplay ? 'auto' : 'none',
        transform: isIconDisplay ? 'translateY(0) scale(1)' : 'translateY(-2px) scale(0.98)',
        ...runtimeHoverVarStyle,
      }}
    >
      <div className='cursor-pointer'>
        <button
          type='button'
          data-ylc-settings-btn
          className='ylc-overlay-control-icon cursor-pointer ylc-theme-focus-ring'
          aria-label={t('content.aria.openSettings')}
          disabled={!isIconDisplay}
          tabIndex={isIconDisplay ? 0 : -1}
          onClick={onSettingsClick}
        >
          <TbAdjustmentsHorizontal size={22} color={colorString} strokeWidth={ICON_STROKE_WIDTH} />
        </button>
      </div>

      {/* biome-ignore lint/a11y/useSemanticElements: ドラッグハンドルにはdivが適切 */}
      <div
        className='cursor-grab'
        {...attributes}
        {...listeners}
        role='button'
        tabIndex={isIconDisplay ? 0 : -1}
        aria-label={t('content.aria.dragToMove')}
        aria-roledescription='drag handle'
        aria-describedby={dragDescriptionId}
      >
        <div className={`ylc-overlay-control-icon cursor-grab ${isDragging ? 'ylc-overlay-control-icon-active' : ''}`}>
          <TbGripVertical size={22} color={colorString} strokeWidth={ICON_STROKE_WIDTH} />
        </div>
        <span id={dragDescriptionId} style={VISUALLY_HIDDEN_STYLE}>
          {t('content.aria.arrowKeysToMove')}
        </span>
      </div>
    </div>
  )
}
