import { ChromePicker } from 'react-color';
import { useYTDLiveChatStore } from '../../../../../stores';
import { useShallow } from 'zustand/react/shallow';
import { useYLCBgColorChange } from '../../hooks/useYLCBgColorChange';
import { useRef, useState } from 'react';
import { useClickAway } from 'react-use';
import styles from '../../styles/YTDLiveChatSetting/CustomColorPicker.module.scss';

export const BgColorPicker = () => {
  const { rgba, changeColor } = useYLCBgColorChange();
  const { setBgColor: setRgbaToStore } = useYTDLiveChatStore(
    useShallow((state) => ({ setBgColor: state.setBgColor })),
  );
  const [display, setDisplay] = useState(false);
  const ref = useRef(null);
  useClickAway(ref, () => {
    setDisplay(false);
  });
  return (
    <div className={styles['color-picker-wrapper']} ref={ref}>
      <div className={styles['color-display']} onClick={() => setDisplay((d) => !d)}>
        <div className={styles['color-preview']}>
          <div
            className={styles['color-preview-background']}
            style={{ backgroundColor: `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a})` }}
          />
        </div>
      </div>
      <div className={styles['color-picker']}>
        {display ? (
          <ChromePicker
            color={rgba}
            onChange={(c) => {
              changeColor(c.rgb);
            }}
            onChangeComplete={(c) => {
              setRgbaToStore(c.rgb);
            }}
            styles={{
              default: {
                picker: {
                  boxShadow: 'none',
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                  borderRadius: 5,
                  overflow: 'hidden',
                },
              },
            }}
          />
        ) : null}
      </div>
    </div>
  );
};
