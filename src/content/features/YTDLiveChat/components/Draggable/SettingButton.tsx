import React, { useEffect, useRef, useState } from 'react';
import { CiSettings } from 'react-icons/ci';
import styles from '../../styles/Draggable/SettingButton.module.scss';
import fade from '../../styles/Draggable/Fade.module.scss';
import { CSSTransition } from 'react-transition-group';
import { ColorResult, ChromePicker } from 'react-color';

const decimalToHex = (alpha: number) => (alpha === 0 ? '00' : Math.round(255 * alpha).toString(16));
const propertyList: string[] = [
  '--yt-live-chat-background-color',
  '--yt-live-chat-header-background-color',
  '--yt-live-chat-action-panel-background-color',
];

export const SettingButton = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [textColor, setTextColor] = useState<string>('#FFFFFF');
  const ref = useRef<HTMLIFrameElement | null>(null);
  useEffect(() => {
    const element = document.querySelector('#my-extension-root iframe.ytd-live-chat-frame');
    if (element instanceof HTMLIFrameElement) {
      ref.current = element;
    }
  }, []);
  const changeIframeBackgroundColor = (color: string) => {
    if (ref.current && ref.current.contentWindow) {
      const document = ref.current.contentWindow.document.documentElement;
      propertyList.forEach((property) => {
        document.style.setProperty(property, color);
      });
    }
  };
  const changeTextColor = (color: ColorResult) => {
    const hexCode = `${color.hex}${decimalToHex(color.rgb.a || 0)}`;
    changeIframeBackgroundColor(hexCode);
    setTextColor(hexCode);
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
          <ChromePicker color={textColor} onChange={changeTextColor} />
        </div>
      </CSSTransition>
    </div>
  );
};
