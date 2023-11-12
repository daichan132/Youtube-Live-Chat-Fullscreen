/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { useTabLocatoin } from './useTabLocatoin';

export const useIsYTLive = () => {
  const tabLocation = useTabLocatoin();
  const [isYoutubeLive, setIsYoutubeLive] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  /* --------------------------- observe progressbar -------------------------- */
  useEffect(() => {
    console.log(tabLocation);
    const element = document.body.querySelector('yt-page-navigation-progress');
    if (!element) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const handleYTProgressBarChanged = (mutations: any) => {
      mutations.forEach(async (mutation: any) => {
        if (mutation.target.hasAttribute('hidden')) {
          setLoading(false);
          mutationObserver.disconnect();
        }
      });
    };
    const mutationObserver = new MutationObserver(handleYTProgressBarChanged);
    mutationObserver.observe(element, {
      attributes: true,
      subtree: true,
      attributeFilter: ['hidden'],
    });
    return () => {
      setLoading(false);
      mutationObserver.disconnect();
    };
  }, [tabLocation]);

  useEffect(() => {
    if (loading === false) {
      const liveBadge = document.querySelector('.ytp-live-badge');
      const live = (liveBadge && liveBadge.getAttribute('disabled') !== 'true') || false;
      setIsYoutubeLive(live);
    }
  }, [tabLocation, loading]);
  return isYoutubeLive;
};
