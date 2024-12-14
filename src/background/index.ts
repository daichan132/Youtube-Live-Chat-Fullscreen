// biome-ignore lint/suspicious/noExplicitAny: <explanation>
const sendMessage = (tabs: chrome.tabs.Tab[], request: any) => {
  if (tabs[0]?.id) {
    chrome.tabs.sendMessage(tabs[0].id, request)
  }
}
chrome.runtime.onMessage.addListener(request => {
  if (['ytdLiveChat', 'language'].includes(request.message)) {
    const { target, ...rest } = request
    if (target === 'content') {
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => sendMessage(tabs, rest))
    } else if (target === 'popup') {
      chrome.runtime.sendMessage(rest)
    }
  }
})
