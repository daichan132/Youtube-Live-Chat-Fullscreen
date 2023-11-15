import React, { useState } from 'react';
import { CiSettings } from 'react-icons/ci';
import styles from '../../styles/Draggable/SettingButton.module.scss';
import fade from '../../styles/Draggable/Fade.module.scss';
import { CSSTransition } from 'react-transition-group';
import { ColorResult, SketchPicker } from 'react-color';

export const SettingButton = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [textColor, setTextColor] = useState<string>('#FFFFFF');
  const changeTextColor = (color: ColorResult) => {
    setTextColor(color.hex);
  };
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
          <SketchPicker color={textColor} onChange={changeTextColor} />
        </div>
      </CSSTransition>
    </div>
  );
};
