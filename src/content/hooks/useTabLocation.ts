import { useState } from 'react';
import useChromeRuntimeMessageListener from './useChromeRuntimeMessageListener';

export const useTabLocation = () => {
  const [pathname, setPathname] = useState<string>(window.location.pathname);
  const [search, setSearch] = useState<string>(window.location.search);

  const handleMessage = (request: { message: string; pathname: string; search: string }) => {
    if (request.message === 'URL Changed') {
      setPathname(request.pathname);
      setSearch(request.search);
    }
  };
  useChromeRuntimeMessageListener(handleMessage);
  return { pathname, search };
};
