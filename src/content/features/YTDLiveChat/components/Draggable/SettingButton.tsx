import { useState } from 'react';
import { CiSettings } from 'react-icons/ci';
import styles from '../../styles/Draggable/SettingButton.module.scss';
import fade from '../../styles/Draggable/Fade.module.scss';
import { CSSTransition } from 'react-transition-group';
import { ChromePicker } from 'react-color';
import { useYlcBgColorChange } from '../../hooks/useYlcBgColorChange';

export const SettingButton = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const { color, changeColor } = useYlcBgColorChange();

  return (
    <div className={styles['dropDown']}>
      <CiSettings
        size={24}
        onClick={() => {
          setIsOpen((a) => !a);
        }}
      />
      <CSSTransition in={isOpen} timeout={200} classNames={fade} unmountOnExit>
        <div className={styles['dropDownContent']}>
          <ChromePicker color={color} onChange={changeColor} />
        </div>
      </CSSTransition>
    </div>
  );
};
