import { useTranslation } from 'react-i18next'
import { useGlobalSettingStore } from '@/shared/stores'
import { useResolvedThemeMode } from '@/shared/theme'
import { PopupItemRow } from './components/PopupItemRow'
import { createPopupItems } from './utils/createPopupItems'

const Popup = () => {
  const { t } = useTranslation()
  const themeMode = useGlobalSettingStore(state => state.themeMode)
  const resolvedThemeMode = useResolvedThemeMode(themeMode)
  const items = createPopupItems(t)

  return (
    <div
      data-ylc-theme={resolvedThemeMode}
      className='flex flex-col w-[450px] max-w-full box-border m-0 rounded-md border border-solid ylc-theme-border overflow-hidden ylc-theme-surface'
    >
      <div className='flex-grow ylc-theme-surface-muted py-2'>
        {items.map((item, index) => (
          <PopupItemRow
            key={`${item.title}-${index}`}
            icon={item.icon}
            title={item.title}
            data={item.data}
            actionWidth={item.actionWidth}
            isLast={index === items.length - 1}
          />
        ))}
      </div>
    </div>
  )
}

export default Popup
