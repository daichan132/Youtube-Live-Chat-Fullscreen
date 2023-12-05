chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete' && tab.url) {
    const url = new URL(tab.url);
    if (url.hostname === 'www.youtube.com') {
      const sendData = {
        message: 'URL Changed',
        href: url.href,
        pathname: url.pathname,
        search: url.search,
      };
      console.log(sendData);
      chrome.tabs.sendMessage(tabId, sendData);
    }
  }
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sendMessage = (tabs: chrome.tabs.Tab[], request: any) => {
  if (tabs[0]?.id) {
    chrome.tabs.sendMessage(tabs[0].id, request);
  }
};
chrome.runtime.onMessage.addListener(function (request) {
  if (
    request.message === 'ytdLiveChat' ||
    request.message === 'emojiCopy' ||
    request.message === 'language'
  ) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => sendMessage(tabs, request));
  }
});
