import ytdLiveChatStore from '../stores/ytdLiveChatStore';

ytdLiveChatStore.subscribe(() => {});

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete' && tab.url) {
    const url = new URL(tab.url);
    const sendData = {
      message: 'URL Changed',
      href: url.href,
      pathname: url.pathname,
      search: url.search,
    };
    console.log(sendData);
    chrome.tabs.sendMessage(tabId, sendData);
  }
});
