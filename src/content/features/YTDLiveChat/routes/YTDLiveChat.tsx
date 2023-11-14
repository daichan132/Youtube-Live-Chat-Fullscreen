/* eslint-disable @typescript-eslint/no-explicit-any */
import { Wrapper } from '../components/Wrapper';
import { YTDLiveChatIframe } from '../components/YTDLiveChatIframe';
import { useIsShow } from '../hooks/useIsShow';
import { CSSTransition } from 'react-transition-group';
import styles from '../styles/Fade.module.scss';

interface YTDLiveChatType {
  videoID: string;
}
export const YTDLiveChat = ({ videoID }: YTDLiveChatType) => {
  const isShow = useIsShow(videoID);

  return (
    <CSSTransition in={isShow} timeout={500} classNames={styles} unmountOnExit>
      <Wrapper>
        <YTDLiveChatIframe src={`/live_chat?v=${videoID}`} />
      </Wrapper>
    </CSSTransition>
  );
};
