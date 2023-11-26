import { useCallback, useEffect, useRef } from 'react';

export const useYLCUserNameDisplayChange = () => {
  const ref = useRef<HTMLIFrameElement | null>(null);
  useEffect(() => {
    const element = document.querySelector('#my-extension-root iframe.ytd-live-chat-frame');
    if (element instanceof HTMLIFrameElement) {
      ref.current = element;
    }
  }, []);
  const changeUserNameDisplay = useCallback((display: boolean) => {
    const document = ref.current?.contentWindow?.document.documentElement;
    if (!document) return;
    document.style.setProperty('--extension-user-name-display', display ? 'inline' : 'none');
  }, []);
  const changeDisplay = useCallback(
    (display: boolean) => {
      changeUserNameDisplay(display);
    },
    [changeUserNameDisplay],
  );
  return { changeDisplay };
};
