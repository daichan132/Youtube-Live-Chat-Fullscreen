import { debounce } from 'lodash-es';
import { useEffect, useState } from 'react';
import { useIFrameObserver } from './useIFrameObserver';

export const useChatObserver = () => {
  const iframeElement = useIFrameObserver();
  const [chatElement, setChatElement] = useState<Element | null>(null);

  useEffect(() => {
    if (!iframeElement?.contentWindow?.document) return;

    const getParentElement = debounce(() => {
      const element = iframeElement.contentWindow?.document.querySelector(
        'div#items.yt-live-chat-item-list-renderer'
      );
      if (!element) return;

      setChatElement(element);
      mutationObserver.disconnect();
    }, 100);
    const mutationObserver = new MutationObserver(getParentElement);
    setTimeout(() => {
      mutationObserver.disconnect();
    }, 10 * 1000);

    mutationObserver.observe(iframeElement.contentWindow.document, {
      childList: true,
      subtree: true,
    });
    return () => {
      setChatElement(null);
      mutationObserver.disconnect();
    };
  }, [iframeElement]);

  return chatElement;
};
