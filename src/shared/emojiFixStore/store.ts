import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { wrapStore } from 'webext-zustand';

interface EmojiFixState {
  isAvailable: boolean;
  setIsAvailable: (isAvailable: boolean) => void;
}

export const useEmojiFixStore = create<EmojiFixState>()(
  persist(
    (set) => ({
      isAvailable: false,
      setIsAvailable: (isAvailable) => set(() => ({ isAvailable })),
    }),
    {
      name: 'root',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export const emojiFixStoreReadyPromise = wrapStore(useEmojiFixStore);

export default useEmojiFixStore;
