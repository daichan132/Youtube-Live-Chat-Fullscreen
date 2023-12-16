import { useCallback, useEffect, useRef } from 'react';

export const useYLCReactionButtonDisplayChange = () => {
  const ref = useRef<HTMLIFrameElement | null>(null);
  useEffect(() => {
    const element = document.querySelector('#my-extension-root iframe.ytd-live-chat-frame');
    if (element instanceof HTMLIFrameElement) {
      ref.current = element;
    }
  }, []);
  const changeReactionButtonDisplay = useCallback((display: boolean) => {
    const document = ref.current?.contentWindow?.document.documentElement;
    if (!document) return;
    document.style.setProperty('--extension-reaction-button-display', display ? 'inline' : 'none');
  }, []);
  const changeDisplay = useCallback(
    (display: boolean) => {
      changeReactionButtonDisplay(display);
    },
    [changeReactionButtonDisplay],
  );
  return { changeDisplay };
};
