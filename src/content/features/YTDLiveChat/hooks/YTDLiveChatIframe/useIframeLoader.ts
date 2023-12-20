// useIframeLoader.js
import { useRef } from 'react';

import { useMount, useUnmount } from 'react-use';
import { useShallow } from 'zustand/react/shallow';

import { useYTDLiveChatNoLsStore, useYTDLiveChatStore } from '../../../../../stores';
import iframeStyles from '../../styles/YTDLiveChatIframe/iframe.scss?inline';

import { useChangeYLCStyle } from './useChangeYLCStyle';

export const useIframeLoader = () => {
  const ref = useRef<HTMLIFrameElement>(null);
  const { setIsDisplay, setIsIframeLoaded, setIFrameElement } = useYTDLiveChatNoLsStore(
    useShallow((state) => ({
      setIsDisplay: state.setIsDisplay,
      setIsIframeLoaded: state.setIsIframeLoaded,
      setIFrameElement: state.setIFrameElement,
    })),
  );
  const changeYLCStyle = useChangeYLCStyle();
  useMount(() => {
    if (!ref.current) return;
    setIFrameElement(ref.current);
    ref.current.onload = async () => {
      const body = ref.current?.contentDocument?.body;
      const head = ref.current?.contentDocument?.head;
      if (head) {
        const style = document.createElement('style');
        style.textContent = iframeStyles;
        head.appendChild(style);
      }
      if (body) {
        const {
          fontSize,
          fontFamily,
          bgColor,
          fontColor,
          userNameDisplay,
          space,
          userIconDisplay,
          reactionButtonDisplay,
        } = useYTDLiveChatStore.getState();
        body.classList.add('custom-yt-app-live-chat-extension');
        changeYLCStyle({
          bgColor,
          fontColor,
          fontFamily,
          fontSize,
          space,
          userNameDisplay,
          userIconDisplay,
          reactionButtonDisplay,
        });
        setIsIframeLoaded(true);
        setIsDisplay(true);
      }
    };
  });
  useUnmount(() => {
    setIsIframeLoaded(false);
  });

  return { ref };
};
