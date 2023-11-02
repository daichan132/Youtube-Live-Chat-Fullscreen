import { useTextInputObserver } from './hooks/useTextInputObserver';
import { EmojiFix } from './components/EmojiFix/EmojiFix';
import { useEffect } from 'react';
import { useEmojiFixStore } from '../shared/emojiFixStore';

const Content = () => {
  const textInputElement = useTextInputObserver();
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

  return textInputElement ? <EmojiFix textInputElement={textInputElement} /> : null;
};

export default Content;
