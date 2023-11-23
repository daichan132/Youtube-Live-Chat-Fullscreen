// useIframeLoader.js
import { useEffect, useRef, useState } from 'react';
import { useYLCBgColorChange } from '../hooks/useYLCBgColorChange';
import { useYLCFontColorChange } from '../hooks/useYLCFontColorChange';
import { useYLCReactionButtonDisplayChange } from '../hooks/useYLCReactionButtonDisplayChange';
import { useShallow } from 'zustand/react/shallow';
import { useYLCFontFamilyChange } from '../hooks/useYLCFontFamilyChange';
import { useYLCFontSizeChange } from '../hooks/useYLCFontSizeChange';
import { useYTDLiveChatNoLsStore, useYTDLiveChatStore } from '../../../../stores';

export const useIframeLoader = () => {
  const ref = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState<boolean>(false);
  const { alwaysOnDisplay } = useYTDLiveChatStore(
    useShallow((state) => ({ alwaysOnDisplay: state.alwaysOnDisplay })),
  );
  const { isDisplay } = useYTDLiveChatNoLsStore(
    useShallow((state) => ({ isDisplay: state.isDisplay })),
  );
  const { changeColor: changBgColor } = useYLCBgColorChange();
  const { changeColor: changFontColor } = useYLCFontColorChange();
  const { changeDisplay } = useYLCReactionButtonDisplayChange();
  const { changeFontFamily } = useYLCFontFamilyChange();
  const { changeFontSize } = useYLCFontSizeChange();
  useEffect(() => {
    if (!ref.current) return;
    ref.current.onload = async () => {
      const body = ref.current?.contentDocument?.body;
      if (body) {
        const { alwaysOnDisplay, fontSize, fontFamily, bgColor, fontColor, reactionButtonDisplay } =
          useYTDLiveChatStore.getState();
        body.classList.add('custom-yt-app-live-chat-extension');
        if (alwaysOnDisplay) body.classList.add('always-on-display');
        changBgColor(bgColor);
        changFontColor(fontColor);
        changeDisplay(reactionButtonDisplay);
        changeFontFamily(fontFamily);
        changeFontSize(fontSize);
        setLoaded(true);
      }
    };
  }, [changBgColor, changFontColor, changeDisplay, changeFontFamily, changeFontSize]);
  useEffect(() => {
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

  return { ref, loaded };
};
