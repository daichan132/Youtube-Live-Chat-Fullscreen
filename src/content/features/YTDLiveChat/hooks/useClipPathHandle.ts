import { useEffect, useState } from 'react';
import { useYTDLiveChatStore } from '../../../../stores';
import { usePrevious, useUnmount, useUpdateEffect } from 'react-use';
import { useShallow } from 'zustand/react/shallow';
import { bottomClip, topClip } from '../utils/clipPathConst';

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
  const handleClipPathChange = (clipPath: boolean) => {
    const { size, coordinates } = useYTDLiveChatStore.getState();
    if (clipPath) {
      setCoordinates({ x: coordinates.x, y: coordinates.y - topClip });
      setSize({ width: size.width, height: size.height + (topClip + bottomClip) });
    } else {
      setCoordinates({ x: coordinates.x, y: coordinates.y + topClip });
      setSize({ width: size.width, height: size.height - (topClip + bottomClip) });
    }
  };
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
