import { CiSettings } from 'react-icons/ci';
import { useYTDLiveChatNoLsStore, useYTDLiveChatStore } from '../../../../../stores';
import { useShallow } from 'zustand/react/shallow';

export const SettingIcon = () => {
  const { setIsOpenSettingModal } = useYTDLiveChatNoLsStore(
    useShallow((state) => ({
      setIsOpenSettingModal: state.setIsOpenSettingModal,
    })),
  );
  const { fontColor: rgba } = useYTDLiveChatStore(
    useShallow((state) => ({ fontColor: state.fontColor })),
  );

  return (
    <CiSettings
      size={24}
      onClick={() => {
        setIsOpenSettingModal(true);
      }}
      color={`rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a})`}
    />
  );
};
