import { useCallback, useRef, useState } from 'react';

import { ChromePicker } from 'react-color';
import { useClickAway } from 'react-use';
import { useShallow } from 'zustand/react/shallow';

import { useYTDLiveChatStore } from '../../../../../../stores';
import { useYLCFontColorChange } from '../../../hooks/YTDLiveChatSetting/useYLCFontColorChange';
import styles from '../../../styles/YTDLiveChatSetting/CustomColorPicker.module.scss';

import type { ColorResult, RGBColor } from 'react-color';

export const FontColorPicker = () => {
  const { changeColor } = useYLCFontColorChange();
  const stateRef = useRef(useYTDLiveChatStore.getState());
  const [rgba, setRgba] = useState<RGBColor>(stateRef.current.fontColor);
  const { updateYLCStyle } = useYTDLiveChatStore(
    useShallow((state) => ({ updateYLCStyle: state.updateYLCStyle })),
  );
  const [display, setDisplay] = useState(false);
  const ref = useRef(null);
  useClickAway(ref, () => {
    setDisplay(false);
  });
  const onChange = useCallback(
    (c: ColorResult) => {
      changeColor(c.rgb);
      updateYLCStyle({ fontColor: c.rgb });
      setRgba(c.rgb);
    },
    [changeColor, updateYLCStyle],
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
