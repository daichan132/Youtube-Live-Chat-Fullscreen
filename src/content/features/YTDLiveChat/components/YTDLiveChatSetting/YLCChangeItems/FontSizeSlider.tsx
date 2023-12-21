import React, { useCallback, useRef } from 'react';

import { useShallow } from 'zustand/react/shallow';

import { Slider } from '../../../../../../shared/components/Slider';
import { useYTDLiveChatStore } from '../../../../../../stores';
import { useInitializedSlider } from '../../../../../hooks/useInitializedSlider';
import { useYLCFontSizeChange } from '../../../hooks/YTDLiveChatSetting/useYLCFontSizeChange';

const minSize = 10;
const maxSize = 20;

export const fontSizeToSliderValue = (fontSize: number) => {
  return ((fontSize - minSize) * 100) / ((maxSize - minSize) * 100);
};
export const FontSizeSlider = () => {
  const fontSizeRef = useRef(useYTDLiveChatStore.getState().fontSize);
  const { updateYLCStyle } = useYTDLiveChatStore(
    useShallow((state) => ({ updateYLCStyle: state.updateYLCStyle })),
  );
  const { changeFontSize } = useYLCFontSizeChange();
  const updateFontSize = useCallback(
    (value: number) => {
      const fontSize = Math.round((value * ((maxSize - minSize) * 100)) / 100 + minSize);
      updateYLCStyle({ fontSize });
      changeFontSize(fontSize);
    },
    [changeFontSize, updateYLCStyle],
  );
  const { value, ref } = useInitializedSlider<HTMLDivElement>({
    initialValue: fontSizeToSliderValue(fontSizeRef.current),
    onScrub(value) {
      updateFontSize(value);
    },
  });

  return <FontSizeSliderUI value={value} ref={ref} />;
};

export const FontSizeSliderUI = React.forwardRef<HTMLDivElement, { value: number }>(
  ({ value }, ref) => {
    return <Slider value={value} ref={ref} />;
  },
);

FontSizeSliderUI.displayName = 'FontSizeSlider';
