import { useCallback } from 'react'

import { useYTDLiveChatNoLsStore } from '@/shared/stores'

export const useYLCStylePropertyChange = () => {
  const getIframeDocument = useCallback(() => {
    const iframeElement = useYTDLiveChatNoLsStore.getState().iframeElement
    return iframeElement?.contentDocument?.documentElement
  }, [])

  const getIframeWindow = useCallback(() => {
    const iframeElement = useYTDLiveChatNoLsStore.getState().iframeElement
    return iframeElement?.contentWindow
  }, [])

  const setProperty = useCallback(
    (property: string, value: string) => {
      const iframeDocument = getIframeDocument()
      if (!iframeDocument) return
      iframeDocument.style.setProperty(property, value)
    },
    [getIframeDocument],
  )

  const setProperties = useCallback(
    (propertyMap: Record<string, string>) => {
      const iframeDocument = getIframeDocument()
      if (!iframeDocument) return

      for (const [property, value] of Object.entries(propertyMap)) {
        iframeDocument.style.setProperty(property, value)
      }
    },
    [getIframeDocument],
  )

  return {
    getIframeDocument,
    getIframeWindow,
    setProperty,
    setProperties,
  }
}
