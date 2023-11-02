import { useEmojiFixStore } from '../shared/emojiFixStore';

const Popup = () => {
  const isAvailable = useEmojiFixStore((state) => state.isAvailable);
  document.body.className = `${isAvailable ? 'bg-green-50' : 'bg-rose-50'}`;

  return (
    <div className="flex justify-center h-full my-2 mx-3 text-sm whitespace-nowrap">
      Emoji Helper {isAvailable ? 'Working Fine ✅' : 'Not Working ❌'}
    </div>
  );
};

export default Popup;
