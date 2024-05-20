import { useRef } from "react";

import { CSSTransition } from "react-transition-group";
import { useShallow } from "zustand/react/shallow";

import { useYTDLiveChatNoLsStore, useYTDLiveChatStore } from "@/stores";
import { useIframeLoader } from "../../hooks/YTDLiveChatIframe/useIframeLoader";
import fade from "../../styles/YTDLiveChatIframe/Fade.module.scss";
import styles from "../../styles/YTDLiveChatIframe/YTDLiveChatIframe.module.scss";

export const YTDLiveChatIframe = () => {
	const { ref } = useIframeLoader();
	const nodeRef = useRef(null);
	const backgroundColorRef = useRef(useYTDLiveChatStore.getState().bgColor);
	const { blur, alwaysOnDisplay } = useYTDLiveChatStore(
		useShallow((state) => ({
			blur: state.blur,
			alwaysOnDisplay: state.alwaysOnDisplay,
		})),
	);
	const { isDisplay, isIframeLoaded } = useYTDLiveChatNoLsStore(
		useShallow((state) => ({
			isDisplay: state.isDisplay,
			isIframeLoaded: state.isIframeLoaded,
		})),
	);

	return (
		<>
			<div
				style={{
					opacity: isIframeLoaded && (isDisplay || alwaysOnDisplay) ? 1 : 0,
					backdropFilter: `blur(${blur}px)`,
					width: "100%",
					height: "100%",
					overflow: "hidden",
					borderRadius: "10px",
					transition: "opacity 300ms ease",
				}}
				id="live-chat-iframe-wrapper"
				ref={ref}
			/>
			<CSSTransition
				nodeRef={nodeRef}
				in={!isIframeLoaded}
				timeout={100}
				classNames={fade}
				unmountOnExit
			>
				<div
					className={styles.skelton}
					ref={nodeRef}
					style={{
						backdropFilter: `blur(${blur}px)`,
						backgroundColor: `rgba(${backgroundColorRef.current.r}, ${backgroundColorRef.current.g}, ${backgroundColorRef.current.b}, ${backgroundColorRef.current.a})`,
					}}
				/>
			</CSSTransition>
		</>
	);
};
