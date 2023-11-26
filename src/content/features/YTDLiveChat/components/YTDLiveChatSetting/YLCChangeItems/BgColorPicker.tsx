import { ChromePicker, ColorResult, RGBColor } from 'react-color';
import { useYLCBgColorChange } from '../../../hooks/YTDLiveChatSetting/useYLCBgColorChange';
import { useCallback, useRef, useState } from 'react';
import { useClickAway } from 'react-use';
import styles from '../../../styles/YTDLiveChatSetting/CustomColorPicker.module.scss';
import { useYTDLiveChatStore } from '../../../../../../stores';
import { useShallow } from 'zustand/react/shallow';

export const BgColorPicker = () => {
  const { changeColor } = useYLCBgColorChange();
  const stateRef = useRef(useYTDLiveChatStore.getState());
  const { setBgColor: setBgColor } = useYTDLiveChatStore(
    useShallow((state) => ({ setBgColor: state.setBgColor })),
  );
  const [rgba, setRgba] = useState<RGBColor>(stateRef.current.bgColor);
  const [display, setDisplay] = useState(false);

  const ref = useRef(null);
  useClickAway(ref, () => {
    setDisplay(false);
  });
  const onChange = useCallback(
    (c: ColorResult) => {
      changeColor(c.rgb);
      setBgColor(c.rgb);
      setRgba(c.rgb);
    },
    [changeColor, setBgColor],
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
                },
              },
            }}
          />
        ) : null}
      </div>
    </div>
  );
};
