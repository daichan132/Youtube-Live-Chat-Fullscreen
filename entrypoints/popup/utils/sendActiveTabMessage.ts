export const sendActiveTabMessage = (message: Record<string, unknown>) => {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const tabId = tabs[0]?.id
    if (!tabId) return

    chrome.tabs.sendMessage(tabId, message, () => {
      void chrome.runtime.lastError
    })
  })
}
