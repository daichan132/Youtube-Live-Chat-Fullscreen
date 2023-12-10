// useIframeLoader.js
import { useRef } from 'react';
import { useYLCBgColorChange } from '../YTDLiveChatSetting/useYLCBgColorChange';
import { useYLCFontColorChange } from '../YTDLiveChatSetting/useYLCFontColorChange';
import { useShallow } from 'zustand/react/shallow';
import { useYLCFontFamilyChange } from '../YTDLiveChatSetting/useYLCFontFamilyChange';
import { useYLCFontSizeChange } from '../YTDLiveChatSetting/useYLCFontSizeChange';
import { useYTDLiveChatNoLsStore, useYTDLiveChatStore } from '../../../../../stores';
import { useMount, useUnmount } from 'react-use';
import { useYLCSpaceChange } from '../YTDLiveChatSetting/useYLCSpaceChange';
import { useYLCUserNameDisplayChange } from '../YTDLiveChatSetting/useYLCUserNameDisplayChange';

export const useIframeLoader = () => {
  const ref = useRef<HTMLIFrameElement>(null);
  const { setIsDisplay, setIsIframeLoaded, setIFrameElement } = useYTDLiveChatNoLsStore(
    useShallow((state) => ({
      setIsDisplay: state.setIsDisplay,
      setIsIframeLoaded: state.setIsIframeLoaded,
      setIFrameElement: state.setIFrameElement,
    })),
  );
  const { changeColor: changBgColor } = useYLCBgColorChange();
  const { changeColor: changFontColor } = useYLCFontColorChange();
  const { changeFontFamily } = useYLCFontFamilyChange();
  const { changeFontSize } = useYLCFontSizeChange();
  const { changeSpace } = useYLCSpaceChange();
  const { changeDisplay: changeUserNameDisplay } = useYLCUserNameDisplayChange();
  useMount(() => {
    if (!ref.current) return;
    setIFrameElement(ref.current);
    ref.current.onload = async () => {
      const body = ref.current?.contentDocument?.body;
      if (body) {
        const { fontSize, fontFamily, bgColor, fontColor, userNameDisplay, space } =
          useYTDLiveChatStore.getState();
        body.classList.add('custom-yt-app-live-chat-extension');
        changBgColor(bgColor);
        changFontColor(fontColor);
        changeUserNameDisplay(userNameDisplay);
        changeFontFamily(fontFamily);
        changeFontSize(fontSize);
        changeSpace(space);
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
