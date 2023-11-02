import { debounce } from 'lodash-es';
import { useEffect, useState } from 'react';
import { useMedia } from 'react-use';

export const useIFrameObserver = () => {
  const [iframeElement, setIFrameElement] = useState<HTMLIFrameElement | null>(null);
  const isWide = useMedia('(min-width: 1015px)');

  useEffect(() => {
    setIFrameElement(null);

    const getParentElement = debounce(() => {
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

  return iframeElement;
};
