import { useState } from 'react';
import { CiSettings } from 'react-icons/ci';
import { ChromePicker } from 'react-color';
import { useYlcBgColorChange } from '../../hooks/useYlcBgColorChange';
import Modal from 'react-modal';

const customStyles = (color: string) => ({
  overlay: {
    backgroundColor: 'transparent',
  },
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)',
    padding: '1.5rem',
    backgroundColor: color,
    outline: 'none',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    zIndex: 10,
    borderRadius: 10,
  },
});

export const SettingButton = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const { color, changeColor } = useYlcBgColorChange();

  return (
    <>
      <CiSettings
        size={24}
        onClick={() => {
          setIsOpen((a) => !a);
        }}
      />
      <Modal
        isOpen={isOpen}
        style={customStyles(color)}
        shouldCloseOnOverlayClick={true}
        onRequestClose={() => setIsOpen(false)}
        appElement={document.getElementById('my-extension-root') || undefined}
      >
        <button onClick={() => setIsOpen(false)}>close</button>
        <ChromePicker color={color} onChange={changeColor} />
      </Modal>
    </>
  );
};
