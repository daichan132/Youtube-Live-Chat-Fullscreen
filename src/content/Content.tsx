import { AddChatMessageCopyIcon } from './features/ChatMessageCopyIcon';
import { EmojiFix } from './features/EmojiFix';
import { YTDLiveChatFullScreen } from './features/YTDLiveChatFullScreen';
import { useCustomLocatoin } from './hooks/useCustomLocatoin';

const Content = () => {
  const { pathname } = useCustomLocatoin();
  return (
    <>
      {pathname === '/live_chat' ? (
        <>
          <EmojiFix />
          <AddChatMessageCopyIcon />
        </>
      ) : null}
      {pathname === '/watch' ? <YTDLiveChatFullScreen /> : null}
    </>
  );
};

export default Content;
