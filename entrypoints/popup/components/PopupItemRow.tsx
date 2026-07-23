import type React from 'react'
import type { IconType } from '@/shared/components/icons'

interface PopupItemRowProps {
  icon?: IconType
  title: string
  data: React.ReactNode
  isLast: boolean
  /** Render the row as a <label> so clicking anywhere toggles the contained control. */
  asLabel?: boolean
  /** Size the action column to its content instead of the fixed column width. */
  actionAuto?: boolean
}

export const PopupItemRow = ({ icon: Icon, title, data, isLast, asLabel = false, actionAuto = false }: PopupItemRowProps) => {
  const RowTag = asLabel ? 'label' : 'div'
  const actionClassName = actionAuto ? 'ylc-row-action ylc-row-action--auto' : 'ylc-row-action'
  return (
    <>
      <RowTag className='ylc-row'>
        <div className='ylc-row-label'>
          {Icon ? (
            <span className='ylc-row-icon' aria-hidden='true'>
              <Icon size={19} />
            </span>
          ) : null}
          <p className='ylc-row-title'>{title}</p>
        </div>
        <div className={actionClassName}>{data}</div>
      </RowTag>
      {isLast ? null : <hr className='border-none ylc-theme-divider' />}
    </>
  )
}
