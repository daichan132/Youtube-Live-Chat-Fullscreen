import React, { useRef } from 'react';
import { useYTDLiveChatStore } from '../../../../../stores';
import { useShallow } from 'zustand/react/shallow';
import { useInitializedSlider } from '../../hooks/useInitializedSlider';
import styles from '../../styles/YTDLiveChatSetting/BlurSlider.module.scss';
import { useYLCSpaceChange } from '../../hooks/useYLCSpaceChange';

const minSize = 0;
const maxSize = 40;

export const SpaceSlider = () => {
  const SpaceRef = useRef(useYTDLiveChatStore.getState().space);
  const { setSpace } = useYTDLiveChatStore(useShallow((state) => ({ setSpace: state.setSpace })));
  const { changeSpace } = useYLCSpaceChange();
  const { value, ref } = useInitializedSlider<HTMLDivElement>({
    initialValue: ((SpaceRef.current - minSize) * 100) / ((maxSize - minSize) * 100),
    onScrub(value) {
      const space = Math.round((value * ((maxSize - minSize) * 100)) / 100 + minSize);
      setSpace(space);
      changeSpace(space);
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
