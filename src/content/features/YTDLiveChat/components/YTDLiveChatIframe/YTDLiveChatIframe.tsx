import { useEffect, useRef, useState } from 'react';
import { CSSTransition } from 'react-transition-group';
import fade from '../../styles/YTDLiveChatIframe/Fade.module.scss';
import styles from '../../styles/YTDLiveChatIframe/YTDLiveChatIframe.module.scss';
import '../../styles/YTDLiveChatIframe/iframe.scss';
import { useYLCBgColorChange } from '../../hooks/useYLCBgColorChange';
import { useYTDLiveChatStore } from '../../../../../stores';

interface YTDLiveChatIframe {
  src: string;
}

export const YTDLiveChatIframe = ({ src }: YTDLiveChatIframe) => {
  const ref = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState<boolean>(false);
  const { changeColor } = useYLCBgColorChange();
  useEffect(() => {
    if (ref.current) {
      ref.current.onload = async () => {
        const body = ref.current?.contentDocument?.body;
        if (body) {
          body.classList.add('custom-yt-app-live-chat-extension');
          const { rgba } = useYTDLiveChatStore.getState();
          changeColor(rgba);
          setLoaded(true);
        }
      };
    }
  }, [changeColor]);
  const nodeRef = useRef(null);
  const rgbaRef = useRef(useYTDLiveChatStore.getState().rgba);

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
      <CSSTransition nodeRef={nodeRef} in={!loaded} timeout={200} classNames={fade} unmountOnExit>
        <div
          className={styles['skelton']}
          ref={nodeRef}
          style={{
            backgroundColor: `rgba(${rgbaRef.current.r}, ${rgbaRef.current.g}, ${rgbaRef.current.b}, ${rgbaRef.current.a})`,
          }}
        />
      </CSSTransition>
    </>
  );
};
