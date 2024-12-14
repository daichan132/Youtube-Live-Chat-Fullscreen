import { useEffect, useState } from 'react'

export const useMessage = <T>() => {
  const [message, setMessage] = useState<T | null>(null)

  useEffect(() => {
    const handler = (request: T) => {
      setMessage(request)
    }
    chrome.runtime.onMessage.addListener(handler)
    return () => {
      chrome.runtime.onMessage.removeListener(handler)
    }
  }, [])

  const sendMessage = (msg: T) => {
    chrome.runtime.sendMessage(msg)
  }

  return { message, sendMessage }
}
