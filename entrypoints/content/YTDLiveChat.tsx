import { useRef } from 'react'
import { CSSTransition } from 'react-transition-group'
import { Draggable } from './features/Draggable'
import { YTDLiveChatIframe } from './features/YTDLiveChatIframe'
import { YTDLiveChatSetting } from './features/YTDLiveChatSetting'
import { useIsShow } from './hooks/watchYouTubeUI/useIsShow'

export const YTDLiveChat = () => {
  const isShow = useIsShow()
  const nodeRef = useRef(null)
  return (
    <>
      <YTDLiveChatSetting />
      <CSSTransition
        nodeRef={nodeRef}
        in={isShow}
        timeout={500}
        classNames={{
          appear: 'opacity-0',
          appearActive: 'transition-opacity opacity-100 duration-500',
          enter: 'opacity-0',
          enterActive: 'transition-opacity opacity-100 duration-500',
          exitActive: 'transition-opacity opacity-0 duration-500',
        }}
        unmountOnExit
      >
        <div ref={nodeRef}>
          <Draggable>
            <YTDLiveChatIframe />
          </Draggable>
        </div>
      </CSSTransition>
    </>
  )
}
