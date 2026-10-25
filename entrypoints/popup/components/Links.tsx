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
    <div className='ylc-popup-actions'>
      {linkItems.map(({ href, name, icon: Icon }) => (
        <a key={name} href={href} target='_blank' rel='noopener noreferrer' className='ylc-btn ylc-popup-action'>
          <Icon size={18} aria-hidden='true' />
          <span>{name}</span>
        </a>
      ))}
    </div>
  )
}
