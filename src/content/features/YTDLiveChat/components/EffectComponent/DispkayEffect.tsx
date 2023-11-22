import { useShallow } from 'zustand/react/shallow';
import { useYTDLiveChatNoLsStore, useYTDLiveChatStore } from '../../../../../stores';
import { useIdle } from 'react-use';
import { useEffect } from 'react';

export const DisplayEffect = () => {
  const { alwaysOnDisplay } = useYTDLiveChatStore(
    useShallow((state) => ({ blur: state.blur, alwaysOnDisplay: state.alwaysOnDisplay })),
  );
  const { isOpenSettingModal, isHover, setIsDisplay } = useYTDLiveChatNoLsStore(
    useShallow((state) => ({
      isOpenSettingModal: state.isOpenSettingModal,
      isHover: state.isHover,
      setIsDisplay: state.setIsDisplay,
    })),
  );
  const isIdle = useIdle(2e3);

  useEffect(() => {
    setIsDisplay(isHover || !isIdle || alwaysOnDisplay || isOpenSettingModal);
  }, [alwaysOnDisplay, isHover, isIdle, setIsDisplay, isOpenSettingModal]);

  return null;
};
