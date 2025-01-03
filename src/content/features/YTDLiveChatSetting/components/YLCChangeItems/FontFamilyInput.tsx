import { useShallow } from 'zustand/react/shallow'

import { useYLCFontFamilyChange } from '@/content/hooks/ylcStyleChange/useYLCFontFamilyChange'
import { useYTDLiveChatStore } from '@/shared/stores'
import styles from '../../styles/FontFamily.module.css'

export const FontFamilyInput = () => {
  const { changeFontFamily } = useYLCFontFamilyChange()
  const { fontFamily, updateYLCStyle } = useYTDLiveChatStore(
    useShallow(state => ({
      fontFamily: state.fontFamily,
      updateYLCStyle: state.updateYLCStyle,
    })),
  )

  return (
    <FontFamilyInputUI
      value={fontFamily}
      onChange={event => {
        const fontFamily = event.target.value
        updateYLCStyle({ fontFamily })
        changeFontFamily(fontFamily)
      }}
    />
  )
}

export const FontFamilyInputUI = ({
  value,
  onChange,
}: {
  value: string
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void
}) => {
  return <input className={styles.input} value={value} onChange={event => onChange?.(event)} />
}
