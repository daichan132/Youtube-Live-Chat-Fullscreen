import type React from 'react'
import { memo } from 'react'
import type { IconType } from 'react-icons'

interface PopupItemRowProps {
  icon?: IconType
  title: string
  data: React.ReactNode
  isLast: boolean
  actionWidth?: 'default' | 'wide'
}

export const PopupItemRow = memo(({ icon: Icon, title, data, isLast, actionWidth = 'default' }: PopupItemRowProps) => {
  const actionSlotClass =
    actionWidth === 'wide' ? 'ylc-action-slot ylc-action-slot-popup ylc-action-slot-wide' : 'ylc-action-slot ylc-action-slot-popup'

  return (
    <>
      <div className='flex flex-wrap justify-between items-center gap-3 px-3 py-2 opacity-100 transition-all duration-160 rounded-lg'>
        <div
          className={
            Icon ? 'flex items-center text-sm min-w-0 flex-1 ylc-theme-text-primary' : 'text-sm min-w-0 flex-1 ylc-theme-text-primary'
          }
        >
          {Icon ? (
            <span className='mr-3 ylc-theme-icon-badge' aria-hidden='true'>
              <Icon size={18} />
            </span>
          ) : null}
          <div className='min-w-0 break-words leading-5'>{title}</div>
        </div>
        <div className={actionSlotClass}>
          <div className='ylc-action-inner'>{data}</div>
        </div>
      </div>
      {isLast ? null : <hr className='border-none ylc-theme-divider' />}
    </>
  )
})
