// biome-ignore lint/suspicious/noExplicitAny: <explanation>
const sendMessage = (tabs: chrome.tabs.Tab[], request: any) => {
  if (tabs[0]?.id) {
    chrome.tabs.sendMessage(tabs[0].id, request)
  }
}
chrome.runtime.onMessage.addListener(request => {
  if (['ytdLiveChat', 'language'].includes(request.message)) {
    if (request.target === 'content') {
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => sendMessage(tabs, request))
    } else if (request.target === 'popup') {
      chrome.runtime.sendMessage(request)
    }
  }
})
