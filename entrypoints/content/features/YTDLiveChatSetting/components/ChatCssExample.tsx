import { useT } from '@/shared/i18n/react'
import type { ChatCssPreset } from '@/shared/settings/chatCssPresets'

// An illustration of packaged styles, not a live preview. In particular, never
// mount a style node, iframe or HTML from editable/imported/saved CSS here.
export const ChatCssExample = ({ preset }: { preset?: ChatCssPreset }) => {
  const t = useT()
  return (
    <figure className='ylc-css-example' data-ylc-css-example={preset?.id ?? 'custom'}>
      {preset ? (
        <>
          <figcaption>{t('content.customCss.presetHelp')}</figcaption>
          <div className='ylc-css-example-messages' aria-hidden='true'>
            {[0, 1].map(index => (
              <div className='ylc-css-example-message' key={index}>
                <span className='ylc-css-example-avatar' />
                <div className='ylc-css-example-content'>
                  <span className='ylc-css-example-line'>Aa Bb Cc</span>
                </div>
              </div>
            ))}
          </div>
          <span className='ylc-visually-hidden'>{t(preset.descriptionKey)}</span>
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
