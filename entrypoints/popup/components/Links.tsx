import { FaChrome, FaFirefox, FaGithub } from '@/shared/components/icons'

const linkItems = [
  {
    href: 'https://chromewebstore.google.com/detail/youtube-live-chat-fullscr/dlnjcbkmomenmieechnmgglgcljhoepd',
    name: 'Chrome',
    icon: FaChrome,
  },
  {
    href: 'https://addons.mozilla.org/firefox/addon/youtube-live-chat-fullscreen/',
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
    <div className='ylc-theme-links-wrap'>
      {linkItems.map(({ href, name, icon: Icon }) => (
        <a
          key={name}
          href={href}
          target='_blank'
          rel='noopener noreferrer'
          aria-label={name}
          data-tooltip={name}
          className='ylc-theme-icon-link'
        >
          <Icon size={18} aria-hidden='true' />
        </a>
      ))}
    </div>
  )
}
