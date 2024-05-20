import { useCallback } from "react";

import { useYTDLiveChatNoLsStore } from "@/stores";

export const useYLCFontSizeChange = () => {
	const changeFontSize = useCallback((fontSize: number) => {
		const iframeElement = useYTDLiveChatNoLsStore.getState().iframeElement;
		const iframeDocument = iframeElement?.contentDocument?.documentElement;
		if (!iframeDocument) return;
		iframeDocument.style.setProperty(
			"--extension-yt-live-chat-font-size",
			`${fontSize}px`,
		);
	}, []);
	return { changeFontSize };
};
