import { FaFirefox, FaGithub } from 'react-icons/fa'
import { FaChrome } from 'react-icons/fa6'

const linkItems = [
  {
    href: 'https://chromewebstore.google.com/detail/youtube-live-chat-fullscr/dlnjcbkmomenmieechnmgglgcljhoepd',
    name: 'Chrome',
    icon: FaChrome,
  },
  {
    href: 'https://addons.mozilla.org/ja/firefox/addon/youtube-live-chat-fullscreen/',
    name: 'Firefox',
    icon: FaFirefox,
  },
  {
    href: 'https://github.com/daichan132/Youtube-Live-Chat-Fullscreen',
    name: 'GitHub',
    icon: FaGithub,
  },
] as const

export const Links = () => {
  return (
    <div className='ylc-theme-links-wrap ylc-action-fill ylc-action-inner'>
      {linkItems.map(({ href, name, icon: Icon }) => (
        <a key={name} href={href} target='_blank' rel='noopener noreferrer' aria-label={name} title={name} className='ylc-theme-icon-link'>
          <Icon size={20} aria-hidden="true" />
        </a>
      ))}
    </div>
  )
}
