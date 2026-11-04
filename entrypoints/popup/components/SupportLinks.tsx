import { FaChrome, FaFirefox, FaGithub, TbHeart } from '@/shared/components/icons'
import { useT } from '@/shared/i18n/react'

export const SupportLinks = () => {
  const t = useT()
  const firefox = import.meta.env.FIREFOX
  const StoreIcon = firefox ? FaFirefox : FaChrome
  const storeUrl = firefox
    ? 'https://addons.mozilla.org/firefox/addon/youtube-live-chat-fullscreen/'
    : 'https://chromewebstore.google.com/detail/youtube-live-chat-fullscr/dlnjcbkmomenmieechnmgglgcljhoepd/reviews'
  const OtherIcon = firefox ? FaChrome : FaFirefox
  const otherUrl = firefox
    ? 'https://chromewebstore.google.com/detail/youtube-live-chat-fullscr/dlnjcbkmomenmieechnmgglgcljhoepd'
    : 'https://addons.mozilla.org/firefox/addon/youtube-live-chat-fullscreen/'
  return (
    <section className='ylc-support' aria-label={t('popup.supportTitle')}>
      <div className='ylc-support-intro'>
        <span className='ylc-support-mark'>
          <TbHeart size={18} aria-hidden='true' />
        </span>
        <div>
          <div className='ylc-support-heading'>{t('popup.supportTitle')}</div>
          <p className='ylc-support-message'>{t('popup.supportMessage')}</p>
        </div>
      </div>
      <div className='ylc-support-actions'>
        <a href={storeUrl} target='_blank' rel='noopener noreferrer' className='ylc-btn ylc-support-action'>
          <StoreIcon size={17} aria-hidden='true' />
          <span>{t('popup.reviewAction')}</span>
        </a>
        <a href={otherUrl} target='_blank' rel='noopener noreferrer' className='ylc-btn ylc-support-action'>
          <OtherIcon size={17} aria-hidden='true' />
          <span>{t(firefox ? 'popup.chromeEdition' : 'popup.firefoxEdition')}</span>
        </a>
        <a
          href='https://github.com/daichan132/Youtube-Live-Chat-Fullscreen'
          target='_blank'
          rel='noopener noreferrer'
          className='ylc-btn ylc-support-action'
        >
          <FaGithub size={17} aria-hidden='true' />
          <span>{t('popup.starAction')}</span>
        </a>
        <a href='https://ko-fi.com/D1D01A39U6' target='_blank' rel='noopener noreferrer' className='ylc-btn ylc-support-action'>
          <TbHeart size={17} aria-hidden='true' />
          <span>{t('popup.donateAction')}</span>
        </a>
      </div>
    </section>
  )
}
