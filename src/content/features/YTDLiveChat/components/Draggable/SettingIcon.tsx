import React, { useState } from 'react';
import { CiSettings } from 'react-icons/ci';
import Modal from 'react-modal';
import { YTDLiveChatSetting } from '../YTDLiveChatSetting/YTDLiveChatSetting';
import { useYTDLiveChatNoLsStore, useYTDLiveChatStore } from '../../../../../stores';
import { useShallow } from 'zustand/react/shallow';

const customStyles = {
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)',
    padding: 0,
    outline: 'none',
    border: 'none',
    zIndex: 10,
    backgroundColor: 'transparent',
    overflow: 'none',
  },
};

export const SettingIcon = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const { fontColor: rgba } = useYTDLiveChatStore(
    useShallow((state) => ({ fontColor: state.fontColor })),
  );
  const { setIsHover } = useYTDLiveChatNoLsStore(
    useShallow((state) => ({ setIsHover: state.setIsHover })),
  );

  return (
    <>
      <CiSettings
        size={24}
        onClick={() => {
          setIsOpen((a) => !a);
        }}
        color={`rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a})`}
      />
      <Modal
        closeTimeoutMS={200}
        isOpen={isOpen}
        style={customStyles}
        shouldCloseOnOverlayClick={true}
        onRequestClose={() => setIsOpen(false)}
        appElement={document.getElementById('my-extension-root') || undefined}
        onAfterClose={() => setIsHover(false)}
      >
        <YTDLiveChatSetting setIsOpen={setIsOpen} />
      </Modal>
    </>
  );
};
