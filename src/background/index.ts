import ytdLiveChatStore from '../stores/ytdLiveChatStore';
// import globalSettingStore from '../stores/globalSettingStore';

ytdLiveChatStore.subscribe((state) => {
  console.log(state);
});
// globalSettingStore.subscribe((state) => {
//   console.log(state);
// });

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
