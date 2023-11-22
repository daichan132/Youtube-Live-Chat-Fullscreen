import { ChromePicker } from 'react-color';
import { useRef, useState } from 'react';
import { useClickAway } from 'react-use';
import styles from '../../styles/YTDLiveChatSetting/CustomColorPicker.module.scss';
import { useYLCFontColorChange } from '../../hooks/useYLCFontColorChange';

export const FontColorPicker = () => {
  const { rgba, changeColor } = useYLCFontColorChange();
  const [display, setDisplay] = useState(false);
  const ref = useRef(null);
  useClickAway(ref, () => {
    setDisplay(false);
  });
  return (
    <div className={styles['color-picker-wrapper']} ref={ref}>
      <div className={styles['color-display']} onClick={() => setDisplay((d) => !d)}>
        <div className={styles['color-preview-background']}>
          <div
            className={styles['color-preview']}
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
            styles={{
              default: {
                picker: {
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                  borderRadius: 5,
                  overflow: 'hidden',
                  marginBottom: '30px',
                },
                alpha: {
                  display: 'none',
                },
              },
            }}
          />
        ) : null}
      </div>
    </div>
  );
};
