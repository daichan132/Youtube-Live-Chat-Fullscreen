// import { AddChatMessageCopyIcon } from './features/ChatMessageCopyIcon';
// import { useShallow } from 'zustand/react/shallow';
// import { useGlobalSettingStore } from '../stores';
// import { EmojiFix } from './features/EmojiFix';
import { YTDLiveChat } from './features/YTDLiveChat';
import { useGlobalSetting } from './hooks/useGlobalSetting';
import { useTabLocation } from './hooks/useTabLocation';

function extractYouTubeID(url: string) {
  const regex = /v=([^&]*)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

const Content = () => {
  const { pathname, search } = useTabLocation();
  const videoId = extractYouTubeID(search);
  const { ytdLiveChat } = useGlobalSetting();
  return (
    <>
      {ytdLiveChat && pathname === '/watch' && videoId ? <YTDLiveChat videoID={videoId} /> : null}
    </>
  );
};

export default Content;
