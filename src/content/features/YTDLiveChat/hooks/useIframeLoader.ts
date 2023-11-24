// useIframeLoader.js
import { useRef } from 'react';
import { useYLCBgColorChange } from '../hooks/useYLCBgColorChange';
import { useYLCFontColorChange } from '../hooks/useYLCFontColorChange';
import { useYLCReactionButtonDisplayChange } from '../hooks/useYLCReactionButtonDisplayChange';
import { useShallow } from 'zustand/react/shallow';
import { useYLCFontFamilyChange } from '../hooks/useYLCFontFamilyChange';
import { useYLCFontSizeChange } from '../hooks/useYLCFontSizeChange';
import { useYTDLiveChatNoLsStore, useYTDLiveChatStore } from '../../../../stores';
import { useMount, useUnmount, useUpdateEffect } from 'react-use';

export const useIframeLoader = () => {
  const ref = useRef<HTMLIFrameElement>(null);
  const { alwaysOnDisplay } = useYTDLiveChatStore(
    useShallow((state) => ({ alwaysOnDisplay: state.alwaysOnDisplay })),
  );
  const { isDisplay, setIsDisplay, setIsIframeLoaded, setClip } = useYTDLiveChatNoLsStore(
    useShallow((state) => ({
      isDisplay: state.isDisplay,
      setIsDisplay: state.setIsDisplay,
      setIsIframeLoaded: state.setIsIframeLoaded,
      setClip: state.setClip,
    })),
  );
  const { changeColor: changBgColor } = useYLCBgColorChange();
  const { changeColor: changFontColor } = useYLCFontColorChange();
  const { changeDisplay } = useYLCReactionButtonDisplayChange();
  const { changeFontFamily } = useYLCFontFamilyChange();
  const { changeFontSize } = useYLCFontSizeChange();
  useMount(() => {
    if (!ref.current) return;
    ref.current.onload = async () => {
      const body = ref.current?.contentDocument?.body;
      if (body) {
        const { fontSize, fontFamily, bgColor, fontColor, reactionButtonDisplay } =
          useYTDLiveChatStore.getState();
        body.classList.add('custom-yt-app-live-chat-extension');
        body.classList.add('always-on-display');
        body.classList.add('display');
        const header = (body.querySelector('yt-live-chat-header-renderer')?.clientHeight || 0) - 5;
        const input =
          (body.querySelector('yt-live-chat-message-input-renderer')?.clientHeight || 0) - 5;
        if (header && input) setClip({ header, input });
        changBgColor(bgColor);
        changFontColor(fontColor);
        changeDisplay(reactionButtonDisplay);
        changeFontFamily(fontFamily);
        changeFontSize(fontSize);
        setIsIframeLoaded(true);
        setIsDisplay(true);
      }
    };
  });
  useUpdateEffect(() => {
    const body = ref.current?.contentDocument?.body;
    if (!body) return;

    if (isDisplay) {
      body.classList.add('display');
    } else {
      body.classList.remove('display');
    }

    if (alwaysOnDisplay) {
      body.classList.add('always-on-display');
    } else {
      body.classList.remove('always-on-display');
    }
  }, [alwaysOnDisplay, isDisplay]);
  useUnmount(() => {
    setIsIframeLoaded(false);
  });

  return { ref };
};
