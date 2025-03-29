import { useEffect, useState } from 'react'

export const useDisableTopTransition = (isDragging: boolean, isResizing: boolean) => {
  const [disableTopTransition, setDisableTopTransition] = useState(true)
  useEffect(() => {
    if (isDragging || isResizing) {
      setDisableTopTransition(true)
    } else {
      const timer = setTimeout(() => {
        setDisableTopTransition(false)
      }, 10)
      return () => clearTimeout(timer)
    }
  }, [isDragging, isResizing])
  return disableTopTransition
}
