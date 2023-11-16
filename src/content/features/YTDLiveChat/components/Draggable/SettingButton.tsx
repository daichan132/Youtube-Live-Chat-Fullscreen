import { useState } from 'react';
import { CiSettings } from 'react-icons/ci';
import { ChromePicker } from 'react-color';
import { useYlcBgColorChange } from '../../hooks/useYlcBgColorChange';
import styles from '../../styles/Draggable/SettingButton.module.scss';
import { RiCloseLine } from 'react-icons/ri';
import Modal from 'react-modal';
import classNames from 'classnames';

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
    border: '1px solid rgba(0, 0, 0, 0.1)',
    zIndex: 10,
    borderRadius: 10,
  },
};

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
        closeTimeoutMS={200}
        isOpen={isOpen}
        style={customStyles}
        shouldCloseOnOverlayClick={true}
        onRequestClose={() => setIsOpen(false)}
        appElement={document.getElementById('my-extension-root') || undefined}
      >
        <div className={styles['settings-modal']}>
          <div className={styles['header']}>
            <div className={styles['title']}>Settings</div>
            <RiCloseLine
              className={styles['close-button']}
              onClick={() => setIsOpen(false)}
              size={24}
            />
          </div>
          <div className={styles['container']}>
            <div className={styles['sidebar']}>
              <div className={classNames(styles['sidebar-item'], styles['active'])}>General</div>
              <div className={classNames(styles['sidebar-item'])}>UI</div>
            </div>
            <div className={styles['content']}>
              <div className={styles['content-item']}>
                <div>Background Color</div>
                <div>
                  <ChromePicker
                    color={color}
                    onChange={changeColor}
                    styles={{
                      default: {
                        picker: {
                          boxShadow: 'rgba(149, 157, 165, 0.2) 0px 8px 24px',
                          border: '1px solid rgba(0, 0, 0, 0.1)',
                        },
                      },
                    }}
                  />
                </div>
              </div>
              <hr />
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};
