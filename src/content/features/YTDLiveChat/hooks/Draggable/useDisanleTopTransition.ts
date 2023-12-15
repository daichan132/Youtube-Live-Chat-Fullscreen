import { useEffect, useState } from 'react';

export const useDisanleTopTransition = (isDragging: boolean, isResizing: boolean) => {
  const [disableTopTransition, setDisableTopTransition] = useState(true);
  useEffect(() => {
    if (isDragging || isResizing) {
      setDisableTopTransition(true);
    } else {
      const timeoutId = setTimeout(() => {
        setDisableTopTransition(false);
      }, 200);
      return () => clearTimeout(timeoutId);
    }
  }, [isDragging, isResizing]);
  return disableTopTransition;
};
