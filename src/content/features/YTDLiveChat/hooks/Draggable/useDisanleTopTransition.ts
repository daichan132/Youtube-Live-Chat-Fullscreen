import { useEffect, useState } from 'react';

export const useDisanleTopTransition = (isDragging: boolean) => {
  const [disableTopTransition, setDisableTopTransition] = useState(true);
  useEffect(() => {
    if (isDragging) {
      setDisableTopTransition(true);
    } else {
      const timeoutId = setTimeout(() => {
        setDisableTopTransition(false);
      }, 200);
      return () => clearTimeout(timeoutId);
    }
  }, [isDragging]);
  return disableTopTransition;
};
