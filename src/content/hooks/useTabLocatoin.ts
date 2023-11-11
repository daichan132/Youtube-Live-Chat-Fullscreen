import { useEffect, useState } from 'react';

export const useTabLocatoin = () => {
  const [pathname, setPathname] = useState<string>('');

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleMessage = (request: any) => {
      if (request.message === 'URL Changed') {
        setPathname(request.pathname);
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);
  return { pathname };
};
