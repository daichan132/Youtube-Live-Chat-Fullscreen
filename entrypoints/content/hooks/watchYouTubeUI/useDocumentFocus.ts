import { useEffect, useState } from 'react'

const readDocumentFocus = () => (typeof document === 'undefined' ? true : document.hasFocus())

export const useDocumentFocus = () => {
  const [focused, setFocused] = useState(readDocumentFocus)

  useEffect(() => {
    const sync = () => setFocused(readDocumentFocus())

    window.addEventListener('focus', sync)
    window.addEventListener('blur', sync)
    document.addEventListener('visibilitychange', sync)

    return () => {
      window.removeEventListener('focus', sync)
      window.removeEventListener('blur', sync)
      document.removeEventListener('visibilitychange', sync)
    }
  }, [])

  return focused
}
