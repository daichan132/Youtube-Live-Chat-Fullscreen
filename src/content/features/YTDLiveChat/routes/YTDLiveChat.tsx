import { Draggable } from '../components/Draggable/Draggable';
import { YTDLiveChatIframe } from '../components/YTDLiveChatIframe/YTDLiveChatIframe';
import { useIsShow } from '../hooks/useIsShow';
import { CSSTransition } from 'react-transition-group';
import fade from '../styles/Fade.module.scss';

interface YTDLiveChatType {
  videoID: string;
}
export const YTDLiveChat = ({ videoID }: YTDLiveChatType) => {
  const { isFullscreen, isShow } = useIsShow(videoID);

  return (
    isFullscreen && (
      <CSSTransition in={isShow} timeout={500} classNames={fade} unmountOnExit>
        <Draggable>
          <YTDLiveChatIframe src={`/live_chat?v=${videoID}`} />
        </Draggable>
      </CSSTransition>
    )
  );
};
