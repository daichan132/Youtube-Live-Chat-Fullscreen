import { useTextInputObserver } from './hooks/useTextInputObserver';
import { EmojiFix } from './components/EmojiFix/EmojiFix';
import { useChatObserver } from './hooks/useChatObserver';
import { AddChatMessageCopyIcon } from './components/AddChatMessageCopyIcon/AddChatMessageCopyIcon';

const Content = () => {
  const textInputElement = useTextInputObserver();
  const chatElement = useChatObserver();

  return (
    <>
      {textInputElement ? <EmojiFix element={textInputElement} /> : null}
      {chatElement ? <AddChatMessageCopyIcon element={chatElement} /> : null}
    </>
  );
};

export default Content;
