import { ChromePicker, ColorResult, RGBColor } from 'react-color';
import { useCallback, useRef, useState } from 'react';
import { useClickAway } from 'react-use';
import styles from '../../styles/YTDLiveChatSetting/CustomColorPicker.module.scss';
import { useYLCFontColorChange } from '../../hooks/YLCChange/useYLCFontColorChange';
import { useYTDLiveChatStore } from '../../../../../stores';
import { useShallow } from 'zustand/react/shallow';

export const FontColorPicker = () => {
  const { changeColor } = useYLCFontColorChange();
  const stateRef = useRef(useYTDLiveChatStore.getState());
  const [rgba, setRgba] = useState<RGBColor>(stateRef.current.fontColor);
  const { setFontColor: setFontColor } = useYTDLiveChatStore(
    useShallow((state) => ({ setFontColor: state.setFontColor })),
  );
  const [display, setDisplay] = useState(false);
  const ref = useRef(null);
  useClickAway(ref, () => {
    setDisplay(false);
  });
  const onChange = useCallback(
    (c: ColorResult) => {
      changeColor(c.rgb);
      setFontColor(c.rgb);
      setRgba(c.rgb);
    },
    [changeColor, setFontColor],
  );
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
            onChange={onChange}
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
