import { useEffect } from "react";

function useChromeRuntimeMessageListener(
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	handleMessage: (request: any) => void,
) {
	useEffect(() => {
		chrome.runtime.onMessage.addListener(handleMessage);

		return () => {
			chrome.runtime.onMessage.removeListener(handleMessage);
		};
	}, [handleMessage]);
}

export default useChromeRuntimeMessageListener;
