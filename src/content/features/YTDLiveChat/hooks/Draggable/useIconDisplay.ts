import { useShallow } from "zustand/react/shallow";

import { useYTDLiveChatNoLsStore, useYTDLiveChatStore } from "@/stores";

export const useIconDisplay = () => {
	const { alwaysOnDisplay } = useYTDLiveChatStore(
		useShallow((state) => ({
			alwaysOnDisplay: state.alwaysOnDisplay,
		})),
	);
	const { isDisplay, isIframeLoaded } = useYTDLiveChatNoLsStore(
		useShallow((state) => ({
			isDisplay: state.isDisplay,
			isIframeLoaded: state.isIframeLoaded,
		})),
	);

	return isIframeLoaded && (isDisplay || alwaysOnDisplay);
};
