import { debounce } from 'lodash-es';
import { useEffect, useState } from 'react';
import { useMedia } from 'react-use';

export const useTextInputObserver = () => {
  const [iframeElement, setIFrameElement] = useState<HTMLIFrameElement | null>(null);
  const [textInputElement, setTextInputElement] = useState<Element | null>(null);
  const isWide = useMedia('(min-width: 1015px)');

  useEffect(() => {
    setIFrameElement(null);
    setTextInputElement(null);

    const getParentElement = debounce(() => {
      console.log('called');
      const iframe = document.body.querySelector<HTMLIFrameElement>('#chatframe');
      if (!iframe) return;
      setIFrameElement(iframe);
      mutationObserver.disconnect();
    }, 100);
    const mutationObserver = new MutationObserver(getParentElement);
    setTimeout(() => {
      mutationObserver.disconnect();
    }, 10 * 1000);
    mutationObserver.observe(document.body, { childList: true, subtree: true });
    getParentElement();
    return () => {
      mutationObserver.disconnect();
    };
    // windowのwidthが1015pxのところでchatのiframeが再読み込みされる
  }, [isWide]);

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
      setIFrameElement(null);
      setTextInputElement(null);
      mutationObserver.disconnect();
    };
  }, [iframeElement]);

  return textInputElement;
};
