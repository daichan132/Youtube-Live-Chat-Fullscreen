import { useCallback, useEffect, useRef } from 'react';

export const useYLCSpaceChange = () => {
  const ref = useRef<HTMLIFrameElement | null>(null);
  useEffect(() => {
    const element = document.querySelector('#my-extension-root iframe.ytd-live-chat-frame');
    if (element instanceof HTMLIFrameElement) {
      ref.current = element;
    }
  }, []);
  const changeSpace = useCallback((space: number) => {
    if (ref.current?.contentWindow) {
      const document = ref.current.contentWindow.document.documentElement;
      document.style.setProperty('--extension-yt-live-chat-spacing', `${space}px`);
    }
  }, []);
  return { changeSpace };
};
