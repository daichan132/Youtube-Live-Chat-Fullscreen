import { debounce } from 'lodash-es';
import { useEffect, useState } from 'react';
import { useReObserve } from './useReObserve';

export const useChatObserver = () => {
  const [chatElement, setChatElement] = useState<Element | null>(null);
  const state = useReObserve();

  useEffect(() => {
    const getParentElement = debounce(() => {
      const element = document.body.querySelector('div#items.yt-live-chat-item-list-renderer');
      if (!element) return;

      setChatElement(element);
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
      setChatElement(null);
      mutationObserver.disconnect();
    };
  }, [state]);

  return chatElement;
};
