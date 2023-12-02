// import { AddChatMessageCopyIcon } from './features/ChatMessageCopyIcon';
// import { useShallow } from 'zustand/react/shallow';
// import { useGlobalSettingStore } from '../stores';
import { useGlobalSettingStore } from '../stores';
import { EmojiFix } from './features/EmojiFix';
import { YTDLiveChat } from './features/YTDLiveChat';
import { useTabLocation } from './hooks/useTabLocation';
import { useShallow } from 'zustand/react/shallow';

function extractYouTubeID(url: string) {
  const regex = /v=([^&]*)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

const Content = () => {
  const { pathname, search } = useTabLocation();
  const videoId = extractYouTubeID(search);
  const { ytdLiveChat } = useGlobalSettingStore(
    useShallow((state) => ({
      ytdLiveChat: state.ytdLiveChat,
    })),
  );
  return (
    <>
      {/* If the pathname of each iframe is /live_chat */}
      {pathname === '/live_chat' ? (
        <>
          <EmojiFix />
          {/* <AddChatMessageCopyIcon /> */}
        </>
      ) : null}
      {/* If the pathname of the tab is watch */}
      {ytdLiveChat && pathname === '/watch' && videoId ? <YTDLiveChat videoID={videoId} /> : null}
    </>
  );
};

export default Content;
