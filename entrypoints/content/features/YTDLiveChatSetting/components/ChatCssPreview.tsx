import { useAtomValue } from 'jotai'
import { useMemo } from 'react'
import { useLocaleCode, useLocaleDirection, useT } from '@/shared/i18n/react'
import type { ChatCssPreset } from '@/shared/settings/chatCssPresets'
import { effectiveProfileAtom } from '@/shared/state'
import { buildChatCssPreviewDocument, findPackagedChatCssPreset } from './chatCssPreviewDocument'
import './chatCssPreview.css'

const SAMPLE_MESSAGES = [
  { id: 'A', initial: 'H', authorKey: 'content.customCss.exampleAuthorA', messageKey: 'content.customCss.exampleMessageA' },
  { id: 'B', initial: 'Y', authorKey: 'content.customCss.exampleAuthorB', messageKey: 'content.customCss.exampleMessageB' },
  { id: 'C', initial: 'A', authorKey: 'content.customCss.exampleAuthorC', messageKey: 'content.customCss.exampleMessageC' },
] as const

export const ChatCssPreview = ({ preset, caption = 'full' }: { preset?: ChatCssPreset; caption?: 'full' | 'none' }) => {
  const t = useT()
  const direction = useLocaleDirection()
  const language = useLocaleCode()
  const profile = useAtomValue(effectiveProfileAtom)
  const packaged = findPackagedChatCssPreset(preset)
  const title = packaged ? `${t('content.customCss.previewTitle')} · ${t(packaged.labelKey)}` : t('content.customCss.previewTitle')
  const srcDoc = useMemo(
    () =>
      buildChatCssPreviewDocument({
        preset: packaged,
        profile,
        direction,
        language,
        title,
        messages: SAMPLE_MESSAGES.map(message => ({ ...message, author: t(message.authorKey), message: t(message.messageKey) })),
      }),
    [packaged, profile, direction, language, title, t],
  )
  if (!packaged || !srcDoc) return null
  const background = profile.appearance.backgroundColor
  return (
    <figure className='ylc-chat-css-preview' data-ylc-preview-preset={packaged.id} aria-label={caption === 'none' ? title : undefined}>
      {caption === 'full' && (
        <figcaption>
          <span>{title}</span>
          <span className='ylc-chat-css-preview-description'>{t(packaged.descriptionKey)}</span>
        </figcaption>
      )}
      <div
        className='ylc-chat-css-preview-surface'
        style={{ backgroundColor: `rgba(${background.r}, ${background.g}, ${background.b}, ${background.a})` }}
      >
        <iframe data-ylc-css-preview={packaged.id} title={title} srcDoc={srcDoc} sandbox='' referrerPolicy='no-referrer' />
      </div>
    </figure>
  )
}
