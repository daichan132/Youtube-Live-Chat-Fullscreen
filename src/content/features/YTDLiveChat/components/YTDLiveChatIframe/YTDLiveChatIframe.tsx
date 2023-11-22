import { useEffect, useRef, useState } from 'react';
import { CSSTransition } from 'react-transition-group';
import fade from '../../styles/YTDLiveChatIframe/Fade.module.scss';
import styles from '../../styles/YTDLiveChatIframe/YTDLiveChatIframe.module.scss';
import '../../styles/YTDLiveChatIframe/iframe.scss';
import { useYLCBgColorChange } from '../../hooks/useYLCBgColorChange';
import { useYTDLiveChatNoLsStore, useYTDLiveChatStore } from '../../../../../stores';
import { useYLCFontColorChange } from '../../hooks/useYLCFontColorChange';
import { useYLCReactionButtonDisplayChange } from '../../hooks/useYLCReactionButtonDisplayChange';
import { useShallow } from 'zustand/react/shallow';
import classNames from 'classnames';
import { useYLCFontFamilyChange } from '../../hooks/useYLCFontFamilyChange';

interface YTDLiveChatIframe {
  src: string;
}

export const YTDLiveChatIframe = ({ src }: YTDLiveChatIframe) => {
  const ref = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState<boolean>(false);
  const { changeColor: changBgColor } = useYLCBgColorChange();
  const { changeColor: changFontColor } = useYLCFontColorChange();
  const { changeDisplay } = useYLCReactionButtonDisplayChange();
  const { changeFontFamily } = useYLCFontFamilyChange();
  useEffect(() => {
    if (ref.current) {
      ref.current.onload = async () => {
        const body = ref.current?.contentDocument?.body;
        if (body) {
          body.classList.add('custom-yt-app-live-chat-extension');
          const { fontFamily, bgColor, fontColor, reactionButtonDisplay } =
            useYTDLiveChatStore.getState();
          changBgColor(bgColor);
          changFontColor(fontColor);
          changeDisplay(reactionButtonDisplay);
          changeFontFamily(fontFamily);
          setLoaded(true);
        }
      };
    }
  }, [changBgColor, changFontColor, changeDisplay, changeFontFamily]);
  const nodeRef = useRef(null);
  const backgroundColorRef = useRef(useYTDLiveChatStore.getState().bgColor);
  const { blur } = useYTDLiveChatStore(useShallow((state) => ({ blur: state.blur })));
  const { isDisplay } = useYTDLiveChatNoLsStore(
    useShallow((state) => ({ isDisplay: state.isDisplay })),
  );

  return (
    <>
      <iframe
        frameBorder={0}
        style={{
          opacity: loaded && isDisplay ? 1 : 0,
          backdropFilter: `blur(${blur}px)`,
        }}
        id="chatframe"
        className={classNames('style-scope ytd-live-chat-frame', styles['iframe'])}
        src={src}
        ref={ref}
      />
      <CSSTransition nodeRef={nodeRef} in={!loaded} timeout={100} classNames={fade} unmountOnExit>
        <div
          className={styles['skelton']}
          ref={nodeRef}
          style={{
            backgroundColor: `rgba(${backgroundColorRef.current.r}, ${backgroundColorRef.current.g}, ${backgroundColorRef.current.b}, ${backgroundColorRef.current.a})`,
          }}
        />
      </CSSTransition>
    </>
  );
};
