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
      <div className='flex justify-between items-center px-3 py-1 opacity-100 transition-all duration-200'>
        <div className={Icon ? 'flex items-center text-sm' : 'text-sm'}>
          {Icon ? <Icon size={16} className='mr-3 outline outline-1 outline-gray-300 text-gray-800 p-2 rounded bg-white' /> : null}
          <div>{title}</div>
        </div>
        {data}
      </div>
      {isLast ? null : <hr className='border-none h-px bg-gray-300 mx-3' />}
    </>
  )
}
