import { useEffect } from 'react';

export const useHoverEvent = (isDragging: boolean) => {
  useEffect(() => {
    const ytdAppElement = document.body.querySelector('ytd-app');
    if (!(ytdAppElement instanceof HTMLElement)) return;
    if (isDragging) {
      ytdAppElement.style.setProperty('pointer-events', 'none');
    } else {
      ytdAppElement.style.setProperty('pointer-events', 'all');
    }
  }, [isDragging]);

  return null;
};
