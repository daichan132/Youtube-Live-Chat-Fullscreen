import { useEffect } from 'react';

function useChromeRuntimeMessageListener(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleMessage: (request: any) => void,
) {
  useEffect(() => {
    chrome.runtime.onMessage.addListener(handleMessage);

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, [handleMessage]);
}

export default useChromeRuntimeMessageListener;
