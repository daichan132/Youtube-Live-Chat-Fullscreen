import { useCallback, useEffect } from 'react';
import { useYTDLiveChatNoLsStore, useYTDLiveChatStore } from '../../../../../stores';
import { usePrevious, useUnmount, useUpdateEffect } from 'react-use';
import { useShallow } from 'zustand/react/shallow';

interface ClipPathEffectType {
  isDragging: boolean;
  isResizing: boolean;
}
export const ClipPathEffect = ({ isDragging, isResizing }: ClipPathEffectType) => {
  const { alwaysOnDisplay, chatOnlyDisplay, setSize, setCoordinates } = useYTDLiveChatStore(
    useShallow((state) => ({
      chatOnlyDisplay: state.chatOnlyDisplay,
      alwaysOnDisplay: state.alwaysOnDisplay,
      setSize: state.setSize,
      setCoordinates: state.setCoordinates,
    })),
  );
  const {
    isHover,
    isClipPath,
    isIframeLoaded,
    setIsClipPath,
    clip,
    isOpenSettingModal,
    setIsHover,
  } = useYTDLiveChatNoLsStore(
    useShallow((state) => ({
      isHover: state.isHover,
      clip: state.clip,
      isOpenSettingModal: state.isOpenSettingModal,
      isClipPath: state.isClipPath,
      isIframeLoaded: state.isIframeLoaded,
      setIsClipPath: state.setIsClipPath,
      setIsHover: state.setIsHover,
    })),
  );
  const prevClipPath = usePrevious(isClipPath);
  const handleClipPathChange = useCallback(
    (isClipPath: boolean) => {
      const { size, coordinates } = useYTDLiveChatStore.getState();
      const topClip = clip.header;
      const bottomClip = clip.input;
      if (isClipPath) {
        setCoordinates({ x: coordinates.x, y: coordinates.y - topClip });
        setSize({ width: size.width, height: size.height + (topClip + bottomClip) });
      } else {
        setCoordinates({ x: coordinates.x, y: coordinates.y + topClip });
        setSize({ width: size.width, height: size.height - (topClip + bottomClip) });
      }
    },
    [clip.header, clip.input, setCoordinates, setSize],
  );
  useEffect(() => {
    setIsClipPath(
      isIframeLoaded &&
        alwaysOnDisplay &&
        chatOnlyDisplay &&
        !isDragging &&
        !isResizing &&
        (isOpenSettingModal || !isHover),
    );
  }, [
    isHover,
    alwaysOnDisplay,
    isOpenSettingModal,
    chatOnlyDisplay,
    isDragging,
    isResizing,
    setIsClipPath,
    isIframeLoaded,
  ]);
  useUpdateEffect(() => {
    if (isClipPath === undefined || prevClipPath === undefined) return;
    handleClipPathChange(isClipPath);
  }, [isClipPath]);
  useUnmount(() => {
    if (isClipPath) {
      setIsClipPath(undefined);
      setIsHover(false);
      handleClipPathChange(false);
    }
  });
  return null;
};
