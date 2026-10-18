import { useAtomValue } from 'jotai'
import { createPortal } from 'react-dom'
import { TbGripVertical } from '@/shared/components/icons'
import { CONTENT_UI_LAYER } from '@/shared/constants/zIndex'
import { useLocaleDirection } from '@/shared/i18n/react'
import { themeModeAtom } from '@/shared/state'
import { useResolvedThemeMode } from '@/shared/theme'
import type { PresetPointerPreview } from './usePresetReorder'

export const PresetDragPreview = ({ preview, name }: { preview: PresetPointerPreview; name: string }) => {
  const theme = useResolvedThemeMode(useAtomValue(themeModeAtom))
  const direction = useLocaleDirection()
  return createPortal(
    <div
      data-ylc-preset-drag-preview
      data-ylc-theme={theme}
      dir={direction}
      aria-hidden='true'
      className='ylc-preset-drag-preview'
      style={{ top: preview.top, left: preview.left, width: preview.width, height: preview.height, zIndex: CONTENT_UI_LAYER.nestedModal }}
    >
      <TbGripVertical size={20} />
      <span>{name}</span>
    </div>,
    document.body,
  )
}
