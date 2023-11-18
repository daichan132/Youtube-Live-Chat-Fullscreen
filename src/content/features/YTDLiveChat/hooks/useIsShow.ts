/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { useIsFullScreen } from './useIsFullScreen';
import { useYTDLiveChatStore } from '../../../../stores';

export const useIsShow = (videoID: string) => {
  const isFullscreen = useIsFullScreen();
  const [isLive, setIsLive] = useState<boolean>(false);
  const [isChecked, setIsChecked] = useState<boolean>(false);

  useEffect(() => {
    setIsLive(false);
    if (!isFullscreen) return;
    const liveBadge = document.querySelector('.ytp-chrome-controls .ytp-live .ytp-live-badge');
    const live = liveBadge && !liveBadge.getAttribute('disabled');
    if (live) setIsLive(true);
  }, [isFullscreen, videoID]);

  const [isTop, setIsTop] = useState<boolean>(false);
  const updateIsTopBasedOnMasthead = (element: Element) => {
    if (element.hasAttribute('masthead-hidden')) {
      setIsTop(true);
    } else {
      setIsTop(false);
    }
  };
  useEffect(() => {
    setIsTop(true);
    const ytdAppElement = document.querySelector('ytd-app');
    if (!isFullscreen || !ytdAppElement) return;
    updateIsTopBasedOnMasthead(ytdAppElement);
    const mastheadHidden = (mutations: any) => {
      mutations.forEach((mutation: any) => {
        updateIsTopBasedOnMasthead(mutation.target);
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
  useEffect(() => {
    if (isLive && isTop) {
      const { size, coordinates, setDefaultPosition } = useYTDLiveChatStore.getState();
      if (
        !(
          size.width + coordinates.x <= window.innerWidth &&
          size.height + coordinates.y <= window.innerHeight
        )
      ) {
        setDefaultPosition();
      }
      setIsChecked(true);
    } else {
      setIsChecked(false);
    }
  }, [isLive, isTop]);

  return { isFullscreen, isShow: isLive && isTop && isChecked };
};
