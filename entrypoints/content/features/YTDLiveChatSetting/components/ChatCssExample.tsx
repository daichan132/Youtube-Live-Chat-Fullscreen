import { useAtomValue } from 'jotai'
import type { CSSProperties } from 'react'
import { compileStylePatch } from '@/entrypoints/content/style/compileStylePatch'
import { useT } from '@/shared/i18n/react'
import { CHAT_CSS_PRESETS, type ChatCssPreset } from '@/shared/settings/chatCssPresets'
import { effectiveProfileAtom } from '@/shared/state'

const EXAMPLE_MESSAGES = [
  { id: 'A', initial: 'H', authorKey: 'content.customCss.exampleAuthorA', messageKey: 'content.customCss.exampleMessageA' },
  { id: 'B', initial: 'Y', authorKey: 'content.customCss.exampleAuthorB', messageKey: 'content.customCss.exampleMessageB' },
  { id: 'C', initial: 'A', authorKey: 'content.customCss.exampleAuthorC', messageKey: 'content.customCss.exampleMessageC' },
] as const

// Fixed illustrations of exact packaged sources, not live previews. Never mount
// a style node, iframe or HTML from editable/imported/saved CSS here.
export const ChatCssExample = ({ preset, compact = false }: { preset?: ChatCssPreset; compact?: boolean }) => {
  const t = useT()
  const profile = useAtomValue(effectiveProfileAtom)
  const { appearance } = profile
  const { documentProperties } = compileStylePatch(profile, { membershipDefaultColor: null, firefox: false })
  const example = preset && CHAT_CSS_PRESETS.find(entry => entry.id === preset.id && entry.css === preset.css)
  return (
    <figure className='ylc-css-example' data-ylc-css-example={example?.id ?? 'custom'} data-compact={compact || undefined}>
      {example ? (
        <>
          <figcaption>{t(example.descriptionKey)}</figcaption>
          <div
            className='ylc-css-example-messages'
            aria-hidden='true'
            style={
              {
                '--ylc-example-text': documentProperties['--extension-yt-live-font-color'],
                '--ylc-example-author': documentProperties['--extension-yt-live-secondary-font-color'],
                '--ylc-example-background': `rgba(${appearance.backgroundColor.r}, ${appearance.backgroundColor.g}, ${appearance.backgroundColor.b}, ${appearance.backgroundColor.a})`,
                '--ylc-example-font-size': documentProperties['--extension-yt-live-chat-font-size'],
                '--ylc-example-font-family': documentProperties['font-family'],
                '--ylc-example-spacing': documentProperties['--extension-yt-live-chat-spacing'],
                '--ylc-example-subtle-surface': documentProperties['--extension-yt-live-control-background-color'],
                '--ylc-example-panel': documentProperties['--extension-yt-live-panel-background-color'],
                '--ylc-example-border': documentProperties['--extension-yt-live-control-border-color'],
                '--ylc-example-outline': documentProperties['--extension-yt-live-menu-background-color'],
              } as CSSProperties
            }
          >
            {EXAMPLE_MESSAGES.map(message => (
              <div className='ylc-css-example-message' key={message.id}>
                {appearance.showUserIcon && <span className='ylc-css-example-avatar'>{message.initial}</span>}
                <div className='ylc-css-example-content'>
                  {appearance.showUserName && <span className='ylc-css-example-author'>{t(message.authorKey)}</span>}
                  <span className='ylc-css-example-line'>{t(message.messageKey)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className='ylc-css-example-custom' aria-hidden='true'>
            {'{ }'}
          </div>
          <figcaption>{t('content.customCss.title')}</figcaption>
          <p className='ylc-custom-css-help'>{t('content.customCss.warning')}</p>
        </>
      )}
    </figure>
  )
}
