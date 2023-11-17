import React, { useRef } from 'react';
import { useYLCBlurChange } from '../../hooks/useYLCBlurChange';
import { useYTDLiveChatStore } from '../../../../../stores';
import { useShallow } from 'zustand/react/shallow';
import { useInitializedSlider } from '../../hooks/useInitializedSlider';

export const BlurSlider = () => {
  const { changeBlur } = useYLCBlurChange();
  const blurRef = useRef(useYTDLiveChatStore.getState().blur);
  const { setBlur: setBlurToStore } = useYTDLiveChatStore(
    useShallow((state) => ({ setBlur: state.setBlur })),
  );
  const { value, ref } = useInitializedSlider<HTMLDivElement>({
    initialValue: blurRef.current / 20,
    onScrub(value) {
      changeBlur(Math.round(value * 20));
    },
    onScrubStop(value) {
      setBlurToStore(Math.round(value * 20));
    },
  });

  return (
    <div ref={ref} style={{ position: 'relative', width: '100px' }}>
      <div
        style={{
          position: 'absolute',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '100%',
          height: '2px',
          backgroundColor: '#9aa3ad',
          borderRadius: '5px',
          cursor: 'pointer',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: `${value * 100}%`,
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: '12px',
          height: '12px',
          border: '2px solid #868e96',
          backgroundColor: '#fff',
          borderRadius: '50%',
          boxShadow: '0 1px 3px rgba(0, 0, 0, .5)',
          cursor: 'pointer',
        }}
      />
    </div>
  );
};
