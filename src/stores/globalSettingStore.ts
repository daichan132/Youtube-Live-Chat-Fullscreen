import { localStorage } from 'redux-persist-webextension-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

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
      emojiCopy: false,
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
