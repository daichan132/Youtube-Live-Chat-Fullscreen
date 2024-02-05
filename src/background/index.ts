// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sendMessage = (tabs: chrome.tabs.Tab[], request: any) => {
  if (tabs[0]?.id) {
    chrome.tabs.sendMessage(tabs[0].id, request);
  }
};
chrome.runtime.onMessage.addListener(function (request) {
  if (request.message === 'ytdLiveChat' || request.message === 'language') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => sendMessage(tabs, request));
  }
});
