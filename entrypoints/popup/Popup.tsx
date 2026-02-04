import { useTranslation } from 'react-i18next'
import { PopupItemRow } from './components/PopupItemRow'
import { createPopupItems } from './utils/createPopupItems'

const Popup = () => {
  const { t } = useTranslation()
  const items = createPopupItems(t)

  return (
    <div className='flex flex-col w-[450px] m-0'>
      <div className='flex-grow bg-gray-100 py-2'>
        {items.map((item, index) => (
          <PopupItemRow
            key={`${item.title}-${index}`}
            icon={item.icon}
            title={item.title}
            data={item.data}
            isLast={index === items.length - 1}
          />
        ))}
      </div>
    </div>
  )
}

export default Popup
