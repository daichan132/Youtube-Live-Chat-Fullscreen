import { useCallback, useEffect, useRef } from 'react';
import { useYTDLiveChatStore } from '../../../../stores';
import { useShallow } from 'zustand/react/shallow';

export const useYLCReactionButtonDisplayChange = () => {
  const { setReactionButtonDisplay } = useYTDLiveChatStore(
    useShallow((state) => ({
      setReactionButtonDisplay: state.setReactionButtonDisplay,
    })),
  );
  const ref = useRef<HTMLIFrameElement | null>(null);
  useEffect(() => {
    const element = document.querySelector('#my-extension-root iframe.ytd-live-chat-frame');
    if (element instanceof HTMLIFrameElement) {
      ref.current = element;
    }
  }, []);
  const changeIframeBlur = useCallback((display: boolean) => {
    const document = ref.current?.contentWindow?.document.documentElement;
    if (!document) return;
    document.style.setProperty('--reaction-control-panel-display', display ? 'block' : 'none');
  }, []);
  const changeDisplay = useCallback(
    (display: boolean) => {
      changeIframeBlur(display);
      setReactionButtonDisplay(display);
    },
    [changeIframeBlur, setReactionButtonDisplay],
  );
  return { changeDisplay };
};
