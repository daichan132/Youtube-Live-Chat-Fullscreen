/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';

import { useYTDLiveChatStore } from '../../../../stores';

import { useIsFullScreen } from './useIsFullScreen';

const gap = 10;
export const useIsShow = () => {
  const isFullscreen = useIsFullScreen();
  const [isChecked, setIsChecked] = useState<boolean>(false);
  const [isChat, setIsChat] = useState<boolean>(false);

  useEffect(() => {
    setIsChat(false);
    if (!isFullscreen) return;
    const liveChatReplay: HTMLIFrameElement | null = document.querySelector(
      `iframe.ytd-live-chat-frame`,
    );
    if (liveChatReplay && !liveChatReplay.contentDocument?.location.href?.includes('about:blank')) {
      setIsChat(true);
    }
  }, [isFullscreen]);

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
    if (isChat && isTop) {
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
  }, [isTop, isChat]);

  return {
    isFullscreen,
    isShow: isChat && isTop && isChecked,
    isChat,
  };
};
