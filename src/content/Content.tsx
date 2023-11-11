import { AddChatMessageCopyIcon } from './features/ChatMessageCopyIcon';
import { EmojiFix } from './features/EmojiFix';
import { YTDLiveChatFullScreen } from './features/YTDLiveChatFullScreen';
import { useTabLocatoin } from './hooks/useTabLocatoin';

const Content = () => {
  const { pathname } = useTabLocatoin();
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
      {pathname === '/watch' ? <YTDLiveChatFullScreen /> : null}
    </>
  );
};

export default Content;
