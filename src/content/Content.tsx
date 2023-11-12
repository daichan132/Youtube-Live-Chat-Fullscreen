import { AddChatMessageCopyIcon } from './features/ChatMessageCopyIcon';
import { EmojiFix } from './features/EmojiFix';
import { YTDLiveChat } from './features/YTDLiveChat';
import { useIsFullScreen } from './hooks/useIsFullScreen';
import { useTabLocatoin } from './hooks/useTabLocatoin';

function extractYouTubeID(url: string) {
  const regex = /v=([^&]*)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

const Content = () => {
  const { pathname, search } = useTabLocatoin();
  const videoId = extractYouTubeID(search);
  const isFullscreen = useIsFullScreen();
  return (
    <>
      {/* If the pathname of each iframe is /live_chat */}
      {window.location.pathname === '/live_chat' ? (
        <>
          <EmojiFix />
          <AddChatMessageCopyIcon />
        </>
      ) : null}
      {/* If the pathname of the tab is live_chat */}
      {pathname === '/watch' && videoId && isFullscreen ? <YTDLiveChat videoID={videoId} /> : null}
    </>
  );
};

export default Content;
