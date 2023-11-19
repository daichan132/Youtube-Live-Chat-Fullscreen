import { Draggable } from '../components/Draggable/Draggable';
import { YTDLiveChatIframe } from '../components/YTDLiveChatIframe/YTDLiveChatIframe';
import { useIsShow } from '../hooks/useIsShow';
import { CSSTransition } from 'react-transition-group';
import fade from '../styles/Fade.module.scss';
import { useRef, useState } from 'react';
import { useIdle } from 'react-use';
import { useYTDLiveChatStore } from '../../../../stores';
import { useShallow } from 'zustand/react/shallow';

interface YTDLiveChatType {
  videoID: string;
}
export const YTDLiveChat = ({ videoID }: YTDLiveChatType) => {
  const { isFullscreen, isShow } = useIsShow(videoID);
  const nodeRef = useRef(null);
  const [isHover, setIsHover] = useState(false);
  const isIdle = useIdle(1.5e3);
  const { alwaysOnDisplay } = useYTDLiveChatStore(
    useShallow((state) => ({
      alwaysOnDisplay: state.alwaysOnDisplay,
    })),
  );

  return (
    isFullscreen && (
      <CSSTransition nodeRef={nodeRef} in={isShow} timeout={500} classNames={fade} unmountOnExit>
        <div
          ref={nodeRef}
          onMouseEnter={() => setIsHover(true)}
          onMouseLeave={() => setIsHover(false)}
        >
          <div
            style={{
              opacity: isHover || !isIdle || alwaysOnDisplay ? 1 : 0,
              transition: 'opacity 200ms ease',
            }}
          >
            <Draggable>
              <YTDLiveChatIframe src={`/live_chat?v=${videoID}`} />
            </Draggable>
          </div>
        </div>
      </CSSTransition>
    )
  );
};
