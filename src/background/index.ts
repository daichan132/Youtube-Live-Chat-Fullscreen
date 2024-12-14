// biome-ignore lint/suspicious/noExplicitAny: <explanation>
const sendMessage = (tabs: chrome.tabs.Tab[], request: any) => {
  if (tabs[0]?.id) {
    chrome.tabs.sendMessage(tabs[0].id, request)
  }
}
chrome.runtime.onMessage.addListener(request => {
  if (['ytdLiveChat', 'language'].includes(request.message)) {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => sendMessage(tabs, request))
  }
})
