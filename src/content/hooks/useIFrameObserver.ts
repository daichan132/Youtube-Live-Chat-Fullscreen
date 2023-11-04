import { debounce } from 'lodash-es';
import { useEffect, useState } from 'react';
import { useMedia } from 'react-use';
import { setupTailwind } from '../setupTailwind';

export const useIFrameObserver = () => {
  const [iframeElement, setIFrameElement] = useState<HTMLIFrameElement | null>(null);
  const [url, setUrl] = useState<string>('');
  const isWide = useMedia('(min-width: 1015px)');

  useEffect(() => {
    const handleLocationChange = () => {
      setUrl(window.location.href);
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  useEffect(() => {
    setIFrameElement(null);

    const getParentElement = debounce(() => {
      const iframe = document.body.querySelector<HTMLIFrameElement>('#chatframe');
      if (!iframe?.contentWindow) return;

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
  }, [isWide, url]);

  return iframeElement;
};
