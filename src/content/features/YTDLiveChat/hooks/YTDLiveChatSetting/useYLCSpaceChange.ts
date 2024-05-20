import { useCallback } from "react";

import { useYTDLiveChatNoLsStore } from "@/stores";

export const useYLCSpaceChange = () => {
	const changeSpace = useCallback((space: number) => {
		const iframeElement = useYTDLiveChatNoLsStore.getState().iframeElement;
		const iframeDocument = iframeElement?.contentDocument?.documentElement;
		if (!iframeDocument) return;
		iframeDocument.style.setProperty(
			"--extension-yt-live-chat-spacing",
			`${space}px`,
		);
	}, []);
	return { changeSpace };
};
