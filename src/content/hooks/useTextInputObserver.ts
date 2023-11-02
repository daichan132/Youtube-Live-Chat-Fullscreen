import { debounce } from 'lodash-es';
import { useEffect, useState } from 'react';
import { useIFrameObserver } from './useIFrameObserver';

export const useTextInputObserver = () => {
  const iframeElement = useIFrameObserver();
  const [textInputElement, setTextInputElement] = useState<Element | null>(null);

  useEffect(() => {
    if (!iframeElement?.contentWindow?.document) return;

    const getParentElement = debounce(() => {
      const element = iframeElement.contentWindow?.document.querySelector(
        'yt-live-chat-text-input-field-renderer'
      );
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

    mutationObserver.observe(iframeElement.contentWindow.document, {
      childList: true,
      subtree: true,
    });
    return () => {
      setTextInputElement(null);
      mutationObserver.disconnect();
    };
  }, [iframeElement]);

  return textInputElement;
};
