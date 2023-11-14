import { useEffect, useRef, useState } from 'react';
import { CSSTransition } from 'react-transition-group';
import fade from '../../styles/YTDLiveChatIframe/Fade.module.scss';
import styles from '../../styles/YTDLiveChatIframe/YTDLiveChatIframe.module.scss';
import '../../styles/YTDLiveChatIframe/iframe.scss';

interface YTDLiveChatIframe {
  src: string;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const YTDLiveChatIframe = ({ src }: YTDLiveChatIframe) => {
  const ref = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState<boolean>(false);
  useEffect(() => {
    if (ref.current) {
      ref.current.onload = async () => {
        const body = ref.current?.contentDocument?.body;
        if (body) {
          body.classList.add('custom-yt-app-live-chat-extension');
          await sleep(500);
          setLoaded(true);
        }
      };
    }
  }, []);

  return (
    <>
      <iframe
        frameBorder={0}
        style={{
          width: '100%',
          height: '100%',
          opacity: loaded ? 1 : 0,
        }}
        id="chatframe"
        className="style-scope ytd-live-chat-frame"
        src={src}
        ref={ref}
      />
      <CSSTransition in={!loaded} timeout={500} classNames={fade} unmountOnExit>
        <div className={styles['skelton']} />
      </CSSTransition>
    </>
  );
};
