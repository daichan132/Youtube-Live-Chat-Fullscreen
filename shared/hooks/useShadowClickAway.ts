import { type RefObject, useEffect } from 'react'

export function useShadowClickAway(ref: RefObject<HTMLElement | null>, onClickAway: () => void) {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const path = event.composedPath?.() || []
      if (ref.current && !path.includes(ref.current)) {
        onClickAway()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [ref, onClickAway])
}
