import { debounce } from 'lodash-es';
import { useEffect, useState } from 'react';
import { useReObserve } from './useReObserve';

export const useTextInputObserver = () => {
  const [textInputElement, setTextInputElement] = useState<Element | null>(null);
  const { url, isWide } = useReObserve();

  useEffect(() => {
    const getParentElement = debounce(() => {
      const element = document.body.querySelector('yt-live-chat-text-input-field-renderer');
      if (!element) return;
      const contentEditable = Array.from(element.children).find(
        (child) => (child as HTMLElement).contentEditable === 'true'
      ) as HTMLElement | undefined;
      if (!contentEditable) return;

      setTextInputElement(contentEditable);
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
      setTextInputElement(null);
      mutationObserver.disconnect();
    };
  }, [url, isWide]);

  return textInputElement;
};
