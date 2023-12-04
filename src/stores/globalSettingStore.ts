import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { localStorage } from 'redux-persist-webextension-storage';

interface globalSettingStoreState {
  ytdLiveChat: boolean;
  emojiCopy: boolean;
  setYTDLiveChat: (ytdLiveChat: boolean) => void;
  setEmojiCopy: (emojiCopy: boolean) => void;
}

export const useGlobalSettingStore = create<globalSettingStoreState>()(
  persist(
    (set) => ({
      ytdLiveChat: true,
      emojiCopy: true,
      setYTDLiveChat: (ytdLiveChat) => set(() => ({ ytdLiveChat })),
      setEmojiCopy: (emojiCopy) => set(() => ({ emojiCopy })),
    }),
    {
      name: 'globalSettingStore',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export default useGlobalSettingStore;
