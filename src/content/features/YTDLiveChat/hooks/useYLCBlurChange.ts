import { useCallback, useEffect, useRef, useState } from 'react';
import { useYTDLiveChatStore } from '../../../../stores';

export const useYLCBlurChange = () => {
  const stateRef = useRef(useYTDLiveChatStore.getState());
  const [blur, setBlur] = useState<number>(stateRef.current.blur);
  const ref = useRef<HTMLIFrameElement | null>(null);
  useEffect(() => {
    const element = document.querySelector('#my-extension-root iframe.ytd-live-chat-frame');
    if (element instanceof HTMLIFrameElement) {
      ref.current = element;
    }
  }, []);
  const changeIframeBlur = useCallback((blur: number) => {
    const body = ref.current?.contentDocument?.body;
    if (body instanceof HTMLElement) {
      body.style.backdropFilter = `blur(${blur}px)`;
    }
  }, []);
  const changeBlur = useCallback(
    (blur: number) => {
      changeIframeBlur(blur);
      setBlur(blur);
    },
    [changeIframeBlur],
  );
  return { changeBlur, blur };
};
