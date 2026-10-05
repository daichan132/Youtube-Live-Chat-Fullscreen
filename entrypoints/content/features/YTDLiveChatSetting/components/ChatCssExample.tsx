import { useT } from '@/shared/i18n/react'
import { CHAT_CSS_PRESETS, type ChatCssPreset } from '@/shared/settings/chatCssPresets'

const EXAMPLE_MESSAGES = [
  { id: 'A', initial: 'H', authorKey: 'content.customCss.exampleAuthorA', messageKey: 'content.customCss.exampleMessageA' },
  { id: 'B', initial: 'Y', authorKey: 'content.customCss.exampleAuthorB', messageKey: 'content.customCss.exampleMessageB' },
  { id: 'C', initial: 'A', authorKey: 'content.customCss.exampleAuthorC', messageKey: 'content.customCss.exampleMessageC' },
] as const

// Fixed illustrations of exact packaged sources, not live previews. Never mount
// a style node, iframe or HTML from editable/imported/saved CSS here.
export const ChatCssExample = ({ preset }: { preset?: ChatCssPreset }) => {
  const t = useT()
  const example = preset && CHAT_CSS_PRESETS.find(entry => entry.id === preset.id && entry.css === preset.css)
  return (
    <figure className='ylc-css-example' data-ylc-css-example={example?.id ?? 'custom'}>
      {example ? (
        <>
          <figcaption>{t(example.descriptionKey)}</figcaption>
          <div className='ylc-css-example-messages' aria-hidden='true'>
            {EXAMPLE_MESSAGES.map(message => (
              <div className='ylc-css-example-message' key={message.id}>
                <span className='ylc-css-example-avatar'>{message.initial}</span>
                <div className='ylc-css-example-content'>
                  <span className='ylc-css-example-author'>{t(message.authorKey)}</span>
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
