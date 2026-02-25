import type React from 'react'
import { useRef } from 'react'

import { useSlider } from './useSlider'

type Options = {
  onScrub?: (value: number) => void
  onScrubStart?: () => void
  onScrubStop?: (value: number) => void
}

interface InitializedSliderOptions extends Options {
  initialValue: number
}

interface InitializedSliderHook<TElement> {
  ref: React.RefObject<TElement>
  value: number
  isSliding: boolean
}

export function useInitializedSlider<TElement extends HTMLElement>({
  initialValue,
  ...options
}: InitializedSliderOptions): InitializedSliderHook<TElement> {
  const ref = useRef<TElement>(null as unknown as TElement)
  const touched = useRef(false)
  const slider = useSlider(ref, {
    ...options,
    onScrub: touched.current
      ? options.onScrub
      : newValue => {
          touched.current = true
          options.onScrub?.(newValue)
        },
  })

  return {
    ...slider,
    ref,
    value: touched.current ? slider.value : initialValue,
  }
}
