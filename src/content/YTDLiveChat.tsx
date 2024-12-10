import { useRef } from 'react'

import { CSSTransition } from 'react-transition-group'
import { useShallow } from 'zustand/react/shallow'

import { useYTDLiveChatNoLsStore } from '@/shared/stores'
import { Draggable } from './features/Draggable'
import { YTDLiveChatIframe } from './features/YTDLiveChatIframe'
import { useIsShow } from './hooks/useIsShow'
import fade from './styles/Fade.module.css'

export const YTDLiveChat = () => {
  const isShow = useIsShow()
  const nodeRef = useRef(null)
  const { setIsHover } = useYTDLiveChatNoLsStore(useShallow(state => ({ setIsHover: state.setIsHover })))

  return (
    <CSSTransition nodeRef={nodeRef} in={isShow} timeout={500} classNames={fade} unmountOnExit>
      <div ref={nodeRef} onMouseEnter={() => setIsHover(true)} onMouseLeave={() => setIsHover(false)}>
        <Draggable>
          <YTDLiveChatIframe />
        </Draggable>
      </div>
    </CSSTransition>
  )
}