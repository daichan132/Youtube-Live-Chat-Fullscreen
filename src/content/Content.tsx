import { useTextInputObserver } from './hooks/useTextInputObserver';
import { EmojiFix } from './components/EmojiFix/EmojiFix';
import { useEffect } from 'react';
import { useEmojiFixStore } from '../shared/emojiFixStore';
import { useChatObserver } from './hooks/useChatObserver';
import { AddChatMessageCopyIcon } from './components/AddChatMessageCopyIcon/AddChatMessageCopyIcon';

const Content = () => {
  const textInputElement = useTextInputObserver();
  const chatElement = useChatObserver();

  const setIsAvailable = useEmojiFixStore((state) => state.setIsAvailable);
  useEffect(() => {
    if (textInputElement) {
      console.log('✅ detected textInputElement');
      setIsAvailable(true);
    } else {
      console.log('❌ not detected textInputElement');
      setIsAvailable(false);
    }
  }, [setIsAvailable, textInputElement]);

  return (
    <>
      {textInputElement ? <EmojiFix element={textInputElement} /> : null}
      {chatElement ? <AddChatMessageCopyIcon element={chatElement} /> : null}
    </>
  );
};

export default Content;
