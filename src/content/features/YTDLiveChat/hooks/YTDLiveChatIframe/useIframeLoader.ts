// useIframeLoader.js
import { useRef } from 'react';

import { useMount, useUnmount } from 'react-use';
import { useShallow } from 'zustand/react/shallow';

import { useYTDLiveChatNoLsStore, useYTDLiveChatStore } from '../../../../../stores';
import iframeStyles from '../../styles/YTDLiveChatIframe/iframe.scss?inline';
import { useYLCBgColorChange } from '../YTDLiveChatSetting/useYLCBgColorChange';
import { useYLCFontColorChange } from '../YTDLiveChatSetting/useYLCFontColorChange';
import { useYLCFontFamilyChange } from '../YTDLiveChatSetting/useYLCFontFamilyChange';
import { useYLCFontSizeChange } from '../YTDLiveChatSetting/useYLCFontSizeChange';
import { useYLCSpaceChange } from '../YTDLiveChatSetting/useYLCSpaceChange';
import { useYLCUserIconDisplayChange } from '../YTDLiveChatSetting/useYLCUserIconDisplayChange';
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
  const { changeDisplay: changeUserIconDisplay } = useYLCUserIconDisplayChange();
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
        } = useYTDLiveChatStore.getState();
        body.classList.add('custom-yt-app-live-chat-extension');
        changBgColor(bgColor);
        changFontColor(fontColor);
        changeUserNameDisplay(userNameDisplay);
        changeUserIconDisplay(userIconDisplay);
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
