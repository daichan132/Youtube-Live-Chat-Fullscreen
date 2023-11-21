import React, { useRef } from 'react';
import { useYTDLiveChatStore } from '../../../../../stores';
import { useShallow } from 'zustand/react/shallow';
import { useInitializedSlider } from '../../hooks/useInitializedSlider';
import styles from '../../styles/YTDLiveChatSetting/BlurSlider.module.scss';

export const BlurSlider = () => {
  const blurRef = useRef(useYTDLiveChatStore.getState().blur);
  const { setBlur } = useYTDLiveChatStore(useShallow((state) => ({ setBlur: state.setBlur })));
  const { value, ref } = useInitializedSlider<HTMLDivElement>({
    initialValue: blurRef.current / 20,
    onScrub(value) {
      setBlur(Math.round(value * 20));
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
