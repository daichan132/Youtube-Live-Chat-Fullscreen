import { useLayoutEffect } from 'react';
import { useYTDLiveChatStore } from '../../../../../stores';
import { debounce } from 'lodash-es';

export const WindowResizeEffect = () => {
  useLayoutEffect(() => {
    const updatePosition = debounce((): void => {
      const innerWidth = window.innerWidth;
      const innerHeight = window.innerHeight;
      const {
        size: { width, height },
        coordinates: { x, y },
        setCoordinates,
        setSize,
      } = useYTDLiveChatStore.getState();
      const dx = x + width - innerWidth;
      const dy = y + height - innerHeight;
      const newX = x - (dx > 0 ? dx : 0);
      const newY = y - (dy > 0 ? dy : 0);
      const newWidth = width - (dx > 0 ? dx : 0);
      const newHeight = height - (dy > 0 ? dy : 0);
      if (newX >= 0 && newY >= 0) {
        setCoordinates({ x: newX, y: newY });
      } else if (newWidth >= 300 && newHeight >= 400) {
        setSize({ width: newWidth, height: newHeight });
      }
    }, 100);

    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, []);
  return null;
};
