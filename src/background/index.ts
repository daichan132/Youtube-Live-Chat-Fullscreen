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

chrome.runtime.onMessage.addListener(function (request) {
  if (request.message === 'ytdLiveChat') {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, request);
      }
    });
  }
});
