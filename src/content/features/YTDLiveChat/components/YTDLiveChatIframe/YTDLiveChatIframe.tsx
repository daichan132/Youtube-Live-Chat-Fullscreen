import { useRef } from 'react';
import { CSSTransition } from 'react-transition-group';
import fade from '../../styles/YTDLiveChatIframe/Fade.module.scss';
import styles from '../../styles/YTDLiveChatIframe/YTDLiveChatIframe.module.scss';
import '../../styles/YTDLiveChatIframe/iframe.scss';
import { useYTDLiveChatNoLsStore, useYTDLiveChatStore } from '../../../../../stores';
import { useShallow } from 'zustand/react/shallow';
import classNames from 'classnames';
import { useIframeLoader } from '../../hooks/useIframeLoader';

interface YTDLiveChatIframe {
  src: string;
}

export const YTDLiveChatIframe = ({ src }: YTDLiveChatIframe) => {
  const { ref } = useIframeLoader();
  const nodeRef = useRef(null);
  const backgroundColorRef = useRef(useYTDLiveChatStore.getState().bgColor);
  const { blur, alwaysOnDisplay } = useYTDLiveChatStore(
    useShallow((state) => ({ blur: state.blur, alwaysOnDisplay: state.alwaysOnDisplay })),
  );
  const { isDisplay, isIframeLoaded } = useYTDLiveChatNoLsStore(
    useShallow((state) => ({
      isDisplay: state.isDisplay,
      isIframeLoaded: state.isIframeLoaded,
    })),
  );

  return (
    <>
      <iframe
        frameBorder={0}
        style={{
          opacity: isIframeLoaded && (isDisplay || alwaysOnDisplay) ? 1 : 0,
          backdropFilter: `blur(${blur}px)`,
        }}
        id="chatframe"
        className={classNames('style-scope ytd-live-chat-frame', styles['iframe'])}
        src={src}
        ref={ref}
      />
      <CSSTransition
        nodeRef={nodeRef}
        in={!isIframeLoaded}
        timeout={100}
        classNames={fade}
        unmountOnExit
      >
        <div
          className={styles['skelton']}
          ref={nodeRef}
          style={{
            backdropFilter: `blur(${blur}px)`,
            backgroundColor: `rgba(${backgroundColorRef.current.r}, ${backgroundColorRef.current.g}, ${backgroundColorRef.current.b}, ${backgroundColorRef.current.a})`,
          }}
        />
      </CSSTransition>
    </>
  );
};
