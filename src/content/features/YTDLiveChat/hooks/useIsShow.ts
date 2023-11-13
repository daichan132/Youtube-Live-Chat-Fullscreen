import { useEffect, useState } from 'react';
import { useIsFullScreen } from './useIsFullScreen';

export const useIsShow = (videoID: string) => {
  const isFullscreen = useIsFullScreen();
  const [isShow, setIsShow] = useState<boolean>(false);

  useEffect(() => {
    setIsShow(false);
    if (!isFullscreen) return;
    const liveBadge = document.querySelector('.ytp-chrome-controls .ytp-live .ytp-live-badge');
    const live = liveBadge && !liveBadge.getAttribute('disabled');
    if (live) setIsShow(true);
  }, [isFullscreen, videoID]);
  return isShow;
};
