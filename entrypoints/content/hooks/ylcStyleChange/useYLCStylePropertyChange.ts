import { useCallback } from 'react'

import { useYTDLiveChatNoLsStore } from '@/shared/stores'

type PropertyEntry = readonly [string, string]

export const useYLCStylePropertyChange = () => {
  const getIframeDocument = useCallback(() => {
    const iframeElement = useYTDLiveChatNoLsStore.getState().iframeElement
    return iframeElement?.contentDocument?.documentElement
  }, [])

  const getIframeWindow = useCallback(() => {
    const iframeElement = useYTDLiveChatNoLsStore.getState().iframeElement
    return iframeElement?.contentWindow
  }, [])

  const setProperties = useCallback(
    (properties: ReadonlyArray<PropertyEntry>) => {
      const iframeDocument = getIframeDocument()
      if (!iframeDocument) return
      for (const [property, value] of properties) {
        iframeDocument.style.setProperty(property, value)
      }
    },
    [getIframeDocument],
  )

  const setProperty = useCallback(
    (property: string, value: string) => {
      setProperties([[property, value]])
    },
    [setProperties],
  )

  return {
    getIframeDocument,
    getIframeWindow,
    setProperties,
    setProperty,
  }
}
