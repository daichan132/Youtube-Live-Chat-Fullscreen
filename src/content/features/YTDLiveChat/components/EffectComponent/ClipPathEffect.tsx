import { useCallback, useEffect } from "react";

import { usePrevious, useUnmount, useUpdateEffect } from "react-use";
import { useShallow } from "zustand/react/shallow";

import { useYTDLiveChatNoLsStore, useYTDLiveChatStore } from "@/stores";

interface ClipPathEffectType {
	isDragging: boolean;
	isResizing: boolean;
}
export const ClipPathEffect = ({
	isDragging,
	isResizing,
}: ClipPathEffectType) => {
	const { alwaysOnDisplay, chatOnlyDisplay, setSize, setCoordinates } =
		useYTDLiveChatStore(
			useShallow((state) => ({
				chatOnlyDisplay: state.chatOnlyDisplay,
				alwaysOnDisplay: state.alwaysOnDisplay,
				setSize: state.setSize,
				setCoordinates: state.setCoordinates,
			})),
		);
	const {
		isHover,
		isClipPath,
		isIframeLoaded,
		isOpenSettingModal,
		iframeElement,
		setIsClipPath,
		setIsHover,
		setClip,
	} = useYTDLiveChatNoLsStore(
		useShallow((state) => ({
			isHover: state.isHover,
			isOpenSettingModal: state.isOpenSettingModal,
			isClipPath: state.isClipPath,
			isIframeLoaded: state.isIframeLoaded,
			iframeElement: state.iframeElement,
			setIsClipPath: state.setIsClipPath,
			setIsHover: state.setIsHover,
			setClip: state.setClip,
		})),
	);
	const prevClipPath = usePrevious(isClipPath);
	const handleClipPathChange = useCallback(
		(isClipPath: boolean) => {
			const { size, coordinates } = useYTDLiveChatStore.getState();
			const { clip } = useYTDLiveChatNoLsStore.getState();
			const topClip = clip.header;
			const bottomClip = clip.input;
			if (isClipPath) {
				setCoordinates({ x: coordinates.x, y: coordinates.y - topClip });
				setSize({
					width: size.width,
					height: size.height + (topClip + bottomClip),
				});
			} else {
				setCoordinates({ x: coordinates.x, y: coordinates.y + topClip });
				setSize({
					width: size.width,
					height: size.height - (topClip + bottomClip),
				});
			}
		},
		[setCoordinates, setSize],
	);
	const getClip = useCallback(() => {
		const body = iframeElement?.contentDocument?.body;
		const header =
			(body?.querySelector("yt-live-chat-header-renderer")?.clientHeight || 0) -
			8;
		const input =
			(body?.querySelector("yt-live-chat-message-input-renderer")
				?.clientHeight ||
				body?.querySelector("yt-live-chat-restricted-participation-renderer")
					?.clientHeight ||
				0) - 4;
		return { header, input };
	}, [iframeElement?.contentDocument?.body]);
	const removeFocus = useCallback(() => {
		(iframeElement?.contentDocument?.activeElement as HTMLElement)?.blur();
	}, [iframeElement?.contentDocument?.activeElement]);

	/* ---------------------------- Clip Path update ---------------------------- */
	useEffect(() => {
		if (
			isIframeLoaded &&
			alwaysOnDisplay &&
			chatOnlyDisplay &&
			!isDragging &&
			!isResizing &&
			(isOpenSettingModal || !isHover)
		) {
			setTimeout(() => {
				setIsClipPath(true);
			}, 10);
		} else {
			setTimeout(() => {
				setIsClipPath(false);
			}, 10);
		}
	}, [
		isHover,
		alwaysOnDisplay,
		isOpenSettingModal,
		chatOnlyDisplay,
		isDragging,
		isResizing,
		setIsClipPath,
		isIframeLoaded,
	]);

	/* ------------------------- handle Clip Path change ------------------------ */
	useUpdateEffect(() => {
		const body = iframeElement?.contentDocument?.body;
		if (
			isClipPath === undefined ||
			prevClipPath === undefined ||
			body === undefined
		)
			return;
		removeFocus();
		const newClip = getClip();
		if (newClip) setClip(newClip);
		handleClipPathChange(isClipPath);
	}, [isClipPath]);
	useUnmount(() => {
		if (isClipPath) {
			setIsClipPath(undefined);
			setIsHover(false);
			handleClipPathChange(false);
		}
	});

	/* ---------------------------- add style change ---------------------------- */
	useUpdateEffect(() => {
		const body = iframeElement?.contentDocument?.body;
		if (!body) return;
		if (isClipPath) {
			body.classList.add("clip-path-enable");
		} else {
			body.classList.remove("clip-path-enable");
		}
	}, [isClipPath]);
	return null;
};
