import React, { useRef } from 'react';
import { useYTDLiveChatStore } from '../../../../../stores';
import { useShallow } from 'zustand/react/shallow';
import { useInitializedSlider } from '../../hooks/useInitializedSlider';
import styles from '../../styles/YTDLiveChatSetting/BlurSlider.module.scss';
import { useYLCFontSizeChange } from '../../hooks/useYLCFontSizeChange';

const minSize = 10;
const maxSize = 24;

export const FontSizeSlider = () => {
  const fontSizeRef = useRef(useYTDLiveChatStore.getState().fontSize);
  const { setFontSize } = useYTDLiveChatStore(
    useShallow((state) => ({ setFontSize: state.setFontSize })),
  );
  const { changeFontSize } = useYLCFontSizeChange();
  const { value, ref } = useInitializedSlider<HTMLDivElement>({
    initialValue: ((fontSizeRef.current - minSize) * 100) / ((maxSize - minSize) * 100),
    onScrub(value) {
      const fontSize = Math.round((value * ((maxSize - minSize) * 100)) / 100 + minSize);
      setFontSize(fontSize);
      changeFontSize(fontSize);
    },
  });

  return (
    <div ref={ref} className={styles['slider-wrapper']}>
      <div className={styles['slider-track']} />
      <div
        className={styles['slider-thumb']}
        style={{
          left: `${value * 100}%`,
        }}
      />
    </div>
  );
};