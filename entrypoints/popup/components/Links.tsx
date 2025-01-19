import { FaFirefox, FaGithub } from 'react-icons/fa'
import { FaChrome } from 'react-icons/fa6'

export const Links = () => {
  return (
    <div className='flex items-center gap-5 pr-2'>
      <a
        href='https://chromewebstore.google.com/detail/youtube-live-chat-fullscr/dlnjcbkmomenmieechnmgglgcljhoepd'
        target='_blank'
        rel='noopener noreferrer'
      >
        <FaChrome size={22} className='text-gray-600' />
      </a>
      <a href='https://addons.mozilla.org/ja/firefox/addon/youtube-live-chat-fullscreen/' target='_blank' rel='noopener noreferrer'>
        <FaFirefox size={22} className='text-gray-600' />
      </a>
      <a href='https://github.com/daichan132/Youtube-Live-Chat-Fullscreen' target='_blank' rel='noopener noreferrer'>
        <FaGithub size={22} className='text-gray-600' />
      </a>
    </div>
  )
}
