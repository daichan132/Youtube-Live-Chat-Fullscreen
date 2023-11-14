/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { useIsFullScreen } from './useIsFullScreen';

export const useIsShow = (videoID: string) => {
  const isFullscreen = useIsFullScreen();
  const [isLive, setIsLive] = useState<boolean>(false);

  useEffect(() => {
    setIsLive(false);
    if (!isFullscreen) return;
    const liveBadge = document.querySelector('.ytp-chrome-controls .ytp-live .ytp-live-badge');
    const live = liveBadge && !liveBadge.getAttribute('disabled');
    if (live) setIsLive(true);
  }, [isFullscreen, videoID]);

  const [isTop, setIsTop] = useState<boolean>(false);
  useEffect(() => {
    setIsTop(true);
    const ytdAppElement = document.querySelector('ytd-app');
    if (!isFullscreen || !ytdAppElement) return;
    if (ytdAppElement.hasAttribute('masthead-hidden')) {
      setIsTop(true);
    } else {
      setIsTop(false);
    }
    const mastheadHidden = (mutations: any) => {
      mutations.forEach((mutation: any) => {
        if (mutation.target.hasAttribute('masthead-hidden')) {
          setIsTop(true);
        } else {
          setIsTop(false);
        }
      });
    };
    const mutationObserver = new MutationObserver(mastheadHidden);
    mutationObserver.observe(ytdAppElement, {
      attributeFilter: ['masthead-hidden'],
      attributes: true,
    });
    return () => {
      mutationObserver.disconnect();
    };
  }, [isFullscreen]);

  return { isFullscreen, isShow: isLive && isTop };
};
