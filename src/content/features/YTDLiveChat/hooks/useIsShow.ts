/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';

import { useYTDLiveChatStore } from '../../../../stores';

import { useIsFullScreen } from './useIsFullScreen';

const gap = 10;
export const useIsShow = (videoID: string) => {
  const isFullscreen = useIsFullScreen();
  const [isLive, setIsLive] = useState<boolean>(false);
  const [isChecked, setIsChecked] = useState<boolean>(false);
  const [isReplay, setIsReplay] = useState<boolean>(false);

  useEffect(() => {
    setIsLive(false);
    setIsReplay(false);
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
    if (isFullscreen) {
      const liveChatReplay = document.querySelector(`iframe.ytd-live-chat-frame`);
      if (liveChatReplay && liveChatReplay?.getAttribute('src') !== 'about:blank') {
        setIsReplay(liveChatReplay ? true : false);
      }
    } else {
      setIsReplay(false);
    }
  }, [isFullscreen]);
  useEffect(() => {
    if ((isLive || isReplay) && isTop) {
      /* ----------------------- YLC is in outside of window ---------------------- */
      const innerWidth = window.innerWidth;
      const innerHeight = window.innerHeight;
      const {
        size: { width, height },
        coordinates: { x, y },
        setDefaultPosition,
      } = useYTDLiveChatStore.getState();
      if (
        x + gap < 0 ||
        innerWidth + gap < width + x ||
        y + gap < 0 ||
        innerHeight + gap < height + y
      ) {
        setDefaultPosition();
      }
      setIsChecked(true);
    } else {
      setIsChecked(false);
    }
  }, [isLive, isTop, isReplay]);

  return {
    isFullscreen,
    isShow: (isLive || isReplay) && isTop && isChecked,
    isReplay,
  };
};
