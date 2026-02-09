import type React from 'react'
import type { IconType } from 'react-icons'

interface PopupItemRowProps {
  icon?: IconType
  title: string
  data: React.ReactNode
  isLast: boolean
}

export const PopupItemRow = ({ icon: Icon, title, data, isLast }: PopupItemRowProps) => {
  return (
    <>
      <div className='flex justify-between items-center gap-3 px-3 py-1 opacity-100 transition-all duration-200'>
        <div className={Icon ? 'flex items-center text-sm min-w-0 flex-1' : 'text-sm min-w-0 flex-1'}>
          {Icon ? <Icon size={16} className='mr-3 outline outline-1 outline-gray-300 text-gray-800 p-2 rounded bg-white shrink-0' /> : null}
          <div className='min-w-0 break-words leading-5'>{title}</div>
        </div>
        <div className='shrink-0'>{data}</div>
      </div>
      {isLast ? null : <hr className='border-none h-px bg-gray-300 mx-3' />}
    </>
  )
}
