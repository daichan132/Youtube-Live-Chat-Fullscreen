import type React from 'react';
import { useRef } from 'react';

import { useSlider } from 'react-use';

type Options = NonNullable<Parameters<typeof useSlider>[1]>;

interface InitializedSliderOptions extends Options {
  initialValue: number;
}

interface InitializedSliderHook<TElement> extends ReturnType<typeof useSlider> {
  ref: React.RefObject<TElement>;
}

// TODO: remove once https://github.com/streamich/react-use/pull/2164 gets merged
export function useInitializedSlider<TElement extends HTMLElement>({
  initialValue,
  ...options
}: InitializedSliderOptions): InitializedSliderHook<TElement> {
  const ref = useRef<TElement>(null);
  const touched = useRef(false);
  const slider = useSlider(ref, {
    ...options,
    onScrub: touched.current
      ? options.onScrub
      : (newValue) => {
          touched.current = true;
          options.onScrub?.(newValue);
        },
  });

  return {
    ...slider,
    ref,
    value: touched.current ? slider.value : initialValue,
  };
}
