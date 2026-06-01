import type React from 'react'
import type { IconType } from '@/shared/components/icons'

interface PopupItemRowProps {
  icon?: IconType
  title: string
  data: React.ReactNode
  isLast: boolean
}

export const PopupItemRow = ({ icon: Icon, title, data, isLast }: PopupItemRowProps) => {
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
        <div className='ylc-action-slot ylc-action-slot-popup'>
          <div className='ylc-action-inner'>{data}</div>
        </div>
      </div>
      {isLast ? null : <hr className='border-none ylc-theme-divider' />}
    </>
  )
}
