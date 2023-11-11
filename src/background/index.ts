chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete' && tab.url) {
    const url = new URL(tab.url);
    chrome.tabs.sendMessage(tabId, {
      message: 'URL Changed',
      href: url.href,
      pathname: url.pathname,
    });
  }
});
