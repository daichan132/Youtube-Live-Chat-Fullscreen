import React, { useCallback, useRef } from 'react';

import { useShallow } from 'zustand/react/shallow';

import { Slider } from '../../../../../../shared/components/Slider';
import { useYTDLiveChatStore } from '../../../../../../stores';
import { useInitializedSlider } from '../../../../../hooks/useInitializedSlider';
import { useYLCSpaceChange } from '../../../hooks/YTDLiveChatSetting/useYLCSpaceChange';

const minSize = 0;
const maxSize = 40;

export const SpaceSlider = () => {
  const SpaceRef = useRef(useYTDLiveChatStore.getState().space);
  const { updateYLCStyle } = useYTDLiveChatStore(
    useShallow((state) => ({ updateYLCStyle: state.updateYLCStyle })),
  );
  const { changeSpace } = useYLCSpaceChange();
  const updateSpace = useCallback(
    (value: number) => {
      const space = Math.round((value * ((maxSize - minSize) * 100)) / 100 + minSize);
      updateYLCStyle({ space });
      changeSpace(space);
    },
    [changeSpace, updateYLCStyle],
  );
  const { value, ref } = useInitializedSlider<HTMLDivElement>({
    initialValue: ((SpaceRef.current - minSize) * 100) / ((maxSize - minSize) * 100),
    onScrub(value) {
      updateSpace(value);
    },
  });

  return <Slider value={value} sliderRef={ref} />;
};
