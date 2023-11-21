import { Draggable } from '../components/Draggable/Draggable';
import { YTDLiveChatIframe } from '../components/YTDLiveChatIframe/YTDLiveChatIframe';
import { useIsShow } from '../hooks/useIsShow';
import { CSSTransition } from 'react-transition-group';
import fade from '../styles/Fade.module.scss';
import { useRef } from 'react';
import { useYTDLiveChatNoLsStore } from '../../../../stores';
import { useShallow } from 'zustand/react/shallow';
import { DisplayEffect } from '../components/YTDLiveChatIframe/DisplayEffect';

interface YTDLiveChatType {
  videoID: string;
}
export const YTDLiveChat = ({ videoID }: YTDLiveChatType) => {
  const { isFullscreen, isShow } = useIsShow(videoID);
  const nodeRef = useRef(null);
  const { setIsHover } = useYTDLiveChatNoLsStore(
    useShallow((state) => ({ setIsHover: state.setIsHover })),
  );

  return (
    isFullscreen && (
      <CSSTransition nodeRef={nodeRef} in={isShow} timeout={500} classNames={fade} unmountOnExit>
        <div
          ref={nodeRef}
          onMouseEnter={() => setIsHover(true)}
          onMouseLeave={() => setIsHover(false)}
        >
          <DisplayEffect />
          <Draggable>
            <YTDLiveChatIframe src={`/live_chat?v=${videoID}`} />
          </Draggable>
        </div>
      </CSSTransition>
    )
  );
};
