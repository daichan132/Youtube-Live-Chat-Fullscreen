import { useCallback } from 'react';

import { useYTDLiveChatNoLsStore } from '../../../../../stores';

export const useYLCReactionButtonDisplayChange = () => {
  const changeReactionButtonDisplay = useCallback((display: boolean) => {
    const iframeElement = useYTDLiveChatNoLsStore.getState().iframeElement;
    const iframeDocument = iframeElement?.contentDocument?.documentElement;
    if (!iframeDocument) return;
    iframeDocument.style.setProperty(
      '--extension-reaction-button-display',
      display ? 'inline' : 'none',
    );
  }, []);
  const changeDisplay = useCallback(
    (display: boolean) => {
      changeReactionButtonDisplay(display);
    },
    [changeReactionButtonDisplay],
  );
  return { changeDisplay };
};
