/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { useMedia } from 'react-use';

export const useReObserve = () => {
  const [url, setUrl] = useState<string>('');
  const isWide = useMedia('(min-width: 1015px)');
  const [labelText, setLabelText] = useState('');

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
    const element = document.body.querySelector('span#view-selector.yt-live-chat-header-renderer');
    if (!element) return;
    const handleLabelTextChanged = (mutations: any) => {
      mutations.forEach((mutation: any) => {
        if (mutation.target.parentElement.id === 'label-text') {
          setLabelText(mutation.target.textContent);
        }
      });
    };
    const mutationObserver = new MutationObserver(handleLabelTextChanged);
    mutationObserver.observe(element, { characterData: true, subtree: true });
    return () => {
      mutationObserver.disconnect();
    };
  }, []);

  return { url, isWide, labelText };
};
