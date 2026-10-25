import { RiCloseLine, TbArrowBackUp, TbArrowsHorizontal, TbArrowsHorizontalIn, TbArrowUp, TbMessageCircle } from '@/shared/components/icons'
import { useLocaleDirection, useT } from '@/shared/i18n/react'
import { PlacementActionButton } from './PlacementActionButton'

const STEP = 10
const moveActions = [
  { name: 'up', x: 0, y: -STEP, rotation: 0 },
  { name: 'left', x: -STEP, y: 0, rotation: -90 },
  { name: 'right', x: STEP, y: 0, rotation: 90 },
  { name: 'down', x: 0, y: STEP, rotation: 180 },
] as const
const resizeActions = [
  { name: 'narrower', width: -STEP, height: 0, rotation: 0, icon: TbArrowsHorizontalIn },
  { name: 'wider', width: STEP, height: 0, rotation: 0, icon: TbArrowsHorizontal },
  { name: 'shorter', width: 0, height: -STEP, rotation: 90, icon: TbArrowsHorizontalIn },
  { name: 'taller', width: 0, height: STEP, rotation: 90, icon: TbArrowsHorizontal },
] as const

type Props = {
  onBeforeAdjust: () => void
  onMoveBy?: (delta: { x: number; y: number }) => void
  onResizeBy?: (delta: { width: number; height: number }) => void
  canMoveBy?: (delta: { x: number; y: number }) => boolean
  canResizeBy?: (delta: { width: number; height: number }) => boolean
  onRestore?: () => void
  canRestore?: boolean
  onClose: () => void
}

export const OverlayPlacementPanel = ({
  onBeforeAdjust,
  onMoveBy,
  onResizeBy,
  canMoveBy,
  canResizeBy,
  onRestore,
  canRestore,
  onClose,
}: Props) => {
  const t = useT()
  const direction = useLocaleDirection()
  return (
    <>
      <div className='ylc-placement-heading'>
        <span>{t('content.placement.open')}</span>
        <span className='ylc-placement-step' dir='ltr'>
          {STEP} px
        </span>
      </div>
      <div className='ylc-placement-directions' dir='ltr'>
        {moveActions.map(({ name, x, y, rotation }) => (
          <PlacementActionButton
            key={name}
            data-ylc-placement-action={name}
            dir={direction}
            className='ylc-placement-action ylc-theme-focus-ring'
            style={{ gridArea: name }}
            disabled={canMoveBy ? !canMoveBy({ x, y }) : false}
            onAdjust={() => {
              onBeforeAdjust()
              onMoveBy?.({ x, y })
            }}
          >
            <TbArrowUp className='ylc-placement-icon' size={20} strokeWidth={1.7} style={{ transform: `rotate(${rotation}deg)` }} />
            <span>{t(`content.placement.${name}`)}</span>
          </PlacementActionButton>
        ))}
        <div className='ylc-placement-center' aria-hidden='true'>
          <TbMessageCircle size={24} strokeWidth={1.4} />
        </div>
      </div>
      <div className='ylc-placement-dimensions'>
        {resizeActions.map(({ name, width, height, rotation, icon: Icon }) => (
          <PlacementActionButton
            key={name}
            data-ylc-placement-action={name}
            className='ylc-placement-action ylc-theme-focus-ring'
            disabled={canResizeBy ? !canResizeBy({ width, height }) : false}
            onAdjust={() => {
              onBeforeAdjust()
              onResizeBy?.({ width, height })
            }}
          >
            <Icon className='ylc-placement-icon' size={21} strokeWidth={1.7} style={{ transform: `rotate(${rotation}deg)` }} />
            <span>{t(`content.placement.${name}`)}</span>
          </PlacementActionButton>
        ))}
      </div>
      {onRestore ? (
        <button type='button' className='ylc-placement-restore ylc-theme-focus-ring' disabled={!canRestore} onClick={onRestore}>
          <TbArrowBackUp className='ylc-placement-icon' size={17} />
          {t('content.placement.restore')}
        </button>
      ) : null}
      <button type='button' className='ylc-placement-close ylc-theme-focus-ring' onClick={onClose}>
        <RiCloseLine className='ylc-placement-icon' size={16} />
        {t('popup.importClose')}
      </button>
    </>
  )
}
