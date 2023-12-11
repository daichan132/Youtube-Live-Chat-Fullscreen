import { useEffect } from 'react';

import { useIdle } from 'react-use';
import { useShallow } from 'zustand/react/shallow';

import { useYTDLiveChatNoLsStore } from '../../../../../stores';

export const DisplayEffect = () => {
  const { isOpenSettingModal, isHover, setIsDisplay } = useYTDLiveChatNoLsStore(
    useShallow((state) => ({
      isOpenSettingModal: state.isOpenSettingModal,
      isHover: state.isHover,
      setIsDisplay: state.setIsDisplay,
    })),
  );
  const isIdle = useIdle(1e3);

  useEffect(() => {
    setIsDisplay(isHover || !isIdle || isOpenSettingModal);
  }, [isHover, isIdle, setIsDisplay, isOpenSettingModal]);

  return null;
};
