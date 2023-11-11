import { debounce } from 'lodash-es';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-use';

export const useYTDLiveChatSrc = () => {
  const [ytdLiveChatSrc, setYTDLiveChatSrc] = useState<string>('');
  const location = useLocation();

  useEffect(() => {
    const getParentElement = debounce(() => {
      const element = document.body.querySelector('iframe.ytd-live-chat-frame');
      if (!element) {
        setYTDLiveChatSrc('');
        return;
      }
      setYTDLiveChatSrc(element.getAttribute('src') || '');
      mutationObserver.disconnect();
    }, 100);
    const mutationObserver = new MutationObserver(getParentElement);
    setTimeout(() => {
      mutationObserver.disconnect();
    }, 10 * 1000);

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
    return () => {
      setYTDLiveChatSrc('');
      mutationObserver.disconnect();
    };
  }, [location]);
  return ytdLiveChatSrc;
};
