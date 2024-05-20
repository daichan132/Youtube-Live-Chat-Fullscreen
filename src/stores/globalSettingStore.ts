import { localStorage } from "redux-persist-webextension-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface globalSettingStoreState {
	ytdLiveChat: boolean;
	setYTDLiveChat: (ytdLiveChat: boolean) => void;
}

export const useGlobalSettingStore = create<globalSettingStoreState>()(
	persist(
		(set) => ({
			ytdLiveChat: true,
			setYTDLiveChat: (ytdLiveChat) => set(() => ({ ytdLiveChat })),
		}),
		{
			name: "globalSettingStore",
			storage: createJSONStorage(() => localStorage),
		},
	),
);

export default useGlobalSettingStore;
