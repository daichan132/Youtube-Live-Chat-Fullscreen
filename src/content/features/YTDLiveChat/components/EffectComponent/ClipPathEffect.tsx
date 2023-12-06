import { useCallback, useEffect } from 'react';
import { useYTDLiveChatNoLsStore, useYTDLiveChatStore } from '../../../../../stores';
import { usePrevious, useUnmount, useUpdateEffect } from 'react-use';
import { useShallow } from 'zustand/react/shallow';

interface ClipPathEffectType {
  isDisplay: boolean;
  isDragging: boolean;
  alwaysOnDisplay: boolean;
}
export const ClipPathEffect = ({ isDisplay, isDragging, alwaysOnDisplay }: ClipPathEffectType) => {
  const { chatOnlyDisplay, setSize, setCoordinates } = useYTDLiveChatStore(
    useShallow((state) => ({
      chatOnlyDisplay: state.chatOnlyDisplay,
      setSize: state.setSize,
      setCoordinates: state.setCoordinates,
    })),
  );
  const { isClipPath, setIsClipPath, clip, isOpenSettingModal } = useYTDLiveChatNoLsStore(
    useShallow((state) => ({
      clip: state.clip,
      isOpenSettingModal: state.isOpenSettingModal,
      isClipPath: state.isClipPath,
      setIsClipPath: state.setIsClipPath,
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
      alwaysOnDisplay && chatOnlyDisplay && (isOpenSettingModal || (!isDisplay && !isDragging)),
    );
  }, [isDisplay, isDragging, alwaysOnDisplay, isOpenSettingModal, chatOnlyDisplay, setIsClipPath]);
  useUpdateEffect(() => {
    if (isClipPath === undefined || prevClipPath === undefined) return;
    if (alwaysOnDisplay) {
      handleClipPathChange(isClipPath);
    }
  }, [isClipPath]);
  useUnmount(() => {
    if (isClipPath === true) {
      handleClipPathChange(false);
    }
  });
  return null;
};
