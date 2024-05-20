import { useCallback } from "react";

import { useYTDLiveChatNoLsStore } from "@/stores";

export const useYLCUserNameDisplayChange = () => {
	const changeUserNameDisplay = useCallback((display: boolean) => {
		const iframeElement = useYTDLiveChatNoLsStore.getState().iframeElement;
		const iframeDocument = iframeElement?.contentDocument?.documentElement;
		if (!iframeDocument) return;
		iframeDocument.style.setProperty(
			"--extension-user-name-display",
			display ? "inline" : "none",
		);
	}, []);
	const changeDisplay = useCallback(
		(display: boolean) => {
			changeUserNameDisplay(display);
		},
		[changeUserNameDisplay],
	);
	return { changeDisplay };
};
