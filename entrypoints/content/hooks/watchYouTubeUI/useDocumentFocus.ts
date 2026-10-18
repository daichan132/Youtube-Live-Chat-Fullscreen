import { useEffect, useState } from 'react'

const readDocumentFocus = () => (typeof document === 'undefined' ? true : document.hasFocus())

export const useDocumentFocus = () => {
  const [focused, setFocused] = useState(readDocumentFocus)

  useEffect(() => {
    let pendingFrame: number | null = null
    const sync = () => {
      setFocused(readDocumentFocus())
      // Focusing a child iframe can temporarily report false in the parent
      // blur callback. Read again after the browser settles its focus chain.
      if (pendingFrame !== null) return
      pendingFrame = requestAnimationFrame(() => {
        pendingFrame = null
        setFocused(readDocumentFocus())
      })
    }

    window.addEventListener('focus', sync)
    window.addEventListener('blur', sync)
    document.addEventListener('visibilitychange', sync)

    return () => {
      if (pendingFrame !== null) cancelAnimationFrame(pendingFrame)
      window.removeEventListener('focus', sync)
      window.removeEventListener('blur', sync)
      document.removeEventListener('visibilitychange', sync)
    }
  }, [])

  return focused
}
