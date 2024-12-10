import { useGlobalSetting } from '@/shared/hooks/useGlobalSetting'
import { createPortal } from 'react-dom'
import { YTDLiveChat } from './YTDLiveChat'
import { useIsFullScreen } from './hooks/useIsFullscreen'


export const Content = () => {
  const { ytdLiveChat } = useGlobalSetting()
  const isFullscreen = useIsFullScreen()

  return (
    <>
      {ytdLiveChat && isFullscreen && (
        (() => {
          const portalRoot = document.getElementById('movie_player');
          if (!portalRoot) return null;
          return createPortal(
            <div className='extension-root-d774ba85-ed7c-42a2-bf6f-a74e8d8605ec '>
              <YTDLiveChat />
            </div>
            , portalRoot);
        })()
      )}
    </>
  )
}
