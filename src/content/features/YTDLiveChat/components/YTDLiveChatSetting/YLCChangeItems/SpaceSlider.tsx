import React, { useRef } from 'react';

import { useShallow } from 'zustand/react/shallow';

import { useYTDLiveChatStore } from '../../../../../../stores';
import { useInitializedSlider } from '../../../../../hooks/useInitializedSlider';
import { useYLCSpaceChange } from '../../../hooks/YTDLiveChatSetting/useYLCSpaceChange';
import styles from '../../../styles/YTDLiveChatSetting/BlurSlider.module.scss';

const minSize = 0;
const maxSize = 40;

export const SpaceSlider = () => {
  const SpaceRef = useRef(useYTDLiveChatStore.getState().space);
  const { updateYLCStyleUpdate } = useYTDLiveChatStore(
    useShallow((state) => ({ updateYLCStyleUpdate: state.updateYLCStyleUpdate })),
  );
  const { changeSpace } = useYLCSpaceChange();
  const { value, ref } = useInitializedSlider<HTMLDivElement>({
    initialValue: ((SpaceRef.current - minSize) * 100) / ((maxSize - minSize) * 100),
    onScrub(value) {
      const space = Math.round((value * ((maxSize - minSize) * 100)) / 100 + minSize);
      updateYLCStyleUpdate({ space });
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
