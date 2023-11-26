import { useCallback, useEffect, useState } from 'react';
import { useYTDLiveChatNoLsStore, useYTDLiveChatStore } from '../../../../../stores';
import { usePrevious, useUnmount, useUpdateEffect } from 'react-use';
import { useShallow } from 'zustand/react/shallow';

export const useClipPathHandle = (
  isDisplay: boolean,
  isDragging: boolean,
  alwaysOnDisplay: boolean,
) => {
  const [clipPath, setClipPath] = useState<boolean | undefined>(undefined);
  const prevClipPath = usePrevious(clipPath);
  const { setSize, setCoordinates } = useYTDLiveChatStore(
    useShallow((state) => ({
      setSize: state.setSize,
      setCoordinates: state.setCoordinates,
    })),
  );
  const { clip } = useYTDLiveChatNoLsStore(
    useShallow((state) => ({
      clip: state.clip,
    })),
  );
  const handleClipPathChange = useCallback(
    (clipPath: boolean) => {
      const { size, coordinates } = useYTDLiveChatStore.getState();
      const topClip = clip.header;
      const bottomClip = clip.input;
      if (clipPath) {
        setCoordinates({ x: coordinates.x, y: coordinates.y - topClip });
        setSize({ width: size.width, height: size.height + (topClip + bottomClip) });
      } else {
        setCoordinates({ x: coordinates.x, y: coordinates.y + topClip });
        setSize({ width: size.width, height: size.height - (topClip + bottomClip) });
      }
    },
    [clip, setCoordinates, setSize],
  );
  useEffect(() => {
    setClipPath(!isDisplay && !isDragging && alwaysOnDisplay);
  }, [isDisplay, isDragging, alwaysOnDisplay]);
  useUpdateEffect(() => {
    if (clipPath === undefined || prevClipPath === undefined) return;
    if (alwaysOnDisplay) {
      handleClipPathChange(clipPath);
    }
  }, [clipPath]);
  useUnmount(() => {
    if (clipPath === true) {
      handleClipPathChange(false);
    }
  });
  return { clipPath };
};
