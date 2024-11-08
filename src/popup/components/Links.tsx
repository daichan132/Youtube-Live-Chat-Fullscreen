import { FaFirefox, FaGithub } from 'react-icons/fa'
import { FaChrome } from 'react-icons/fa6'

export const Links = () => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
      }}
    >
      <a
        href='https://chromewebstore.google.com/detail/youtube-live-chat-fullscr/dlnjcbkmomenmieechnmgglgcljhoepd'
        target='_blank'
        rel='noopener noreferrer'
      >
        <FaChrome size={22} style={{ color: '#333' }} />
      </a>
      <a
        href='https://addons.mozilla.org/ja/firefox/addon/youtube-live-chat-fullscreen/'
        target='_blank'
        rel='noopener noreferrer'
      >
        <FaFirefox size={22} style={{ color: '#333' }} />
      </a>
      <a href='https://github.com/daichan132/Youtube-Live-Chat-Fullscreen' target='_blank' rel='noopener noreferrer'>
        <FaGithub size={22} style={{ color: '#333' }} />
      </a>
    </div>
  )
}
