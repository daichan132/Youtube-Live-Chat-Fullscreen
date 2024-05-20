import { useCallback, useRef, useState } from "react";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import classNames from "classnames";
import { Resizable } from "re-resizable";
import { useShallow } from "zustand/react/shallow";

import { useYTDLiveChatNoLsStore } from "@/stores/ytdLiveChatNoLsStore";
import useYTDLiveChatStore from "@/stores/ytdLiveChatStore";
import { useDisanleTopTransition } from "../../hooks/Draggable/useDisanleTopTransition";
import { useIconDisplay } from "../../hooks/Draggable/useIconDisplay";
import styles from "../../styles/Draggable/DraggableItem.module.scss";
import { ClipPathEffect } from "../EffectComponent/ClipPathEffect";
import { HoverEffect } from "../EffectComponent/HoverEffect";

import { DragIcon } from "./DragIcon";
import { SettingIcon } from "./SettingIcon";

import type { NumberSize } from "re-resizable";
import type { Direction } from "re-resizable/lib/resizer";

interface DraggableItemType {
	top?: number;
	left?: number;
	children: React.ReactNode;
}
export const DraggableItem = ({
	top = 0,
	left = 0,
	children,
}: DraggableItemType) => {
	const { attributes, isDragging, listeners, setNodeRef, transform } =
		useDraggable({
			id: "wrapper",
		});
	const [isResizing, setResiziging] = useState(false);
	const { size, setSize, setCoordinates } = useYTDLiveChatStore(
		useShallow((state) => ({
			size: state.size,
			setSize: state.setSize,
			setCoordinates: state.setCoordinates,
		})),
	);
	const { clip, isClipPath } = useYTDLiveChatNoLsStore(
		useShallow((state) => ({
			clip: state.clip,
			isClipPath: state.isClipPath,
		})),
	);
	const disableTopTransition = useDisanleTopTransition(isDragging, isResizing);
	const isIconDisplay = useIconDisplay();
	const coordinateRef = useRef({ x: left, y: top });
	const onResize = useCallback(
		({ delta, direction }: { delta: NumberSize; direction: Direction }) => {
			if (!isResizing) {
				return;
			}
			const directions = ["top", "left", "topLeft", "bottomLeft", "topRight"];

			if (directions.indexOf(direction) !== -1) {
				let newLeft = coordinateRef.current.x;
				let newTop = coordinateRef.current.y;

				if (direction === "bottomLeft") {
					newLeft = coordinateRef.current.x - delta.width;
				} else if (direction === "topRight") {
					newTop = coordinateRef.current.y - delta.height;
				} else {
					newLeft = coordinateRef.current.x - delta.width;
					newTop = coordinateRef.current.y - delta.height;
				}

				setCoordinates({
					x: newLeft < 0 ? 0 : newLeft,
					y: newTop < 0 ? 0 : newTop,
				});
			}
		},
		[isResizing, setCoordinates],
	);

	return (
		<>
			<ClipPathEffect isDragging={isDragging} isResizing={isResizing} />
			<HoverEffect isDragging={isDragging} />
			<Resizable
				size={size}
				minWidth={300}
				minHeight={350}
				className={styles.Resizable}
				onResizeStop={(event, direction, ref, d) => {
					setResiziging(false);
					let newWidth = size.width + d.width;
					let newHeight = size.height + d.height;
					if (newWidth + left > window.innerWidth) {
						newWidth = window.innerWidth - left;
					}
					if (newHeight + top > window.innerHeight) {
						newHeight = window.innerHeight - top;
					}
					setSize({ width: newWidth, height: newHeight });
				}}
				onResize={(event, direction, ref, delta) => {
					onResize({ delta, direction });
				}}
				onResizeStart={() => {
					setResiziging(true);
					coordinateRef.current = { x: left, y: top };
				}}
				style={{
					top,
					left,
					transition: `${!disableTopTransition && "top 250ms ease"}, ${
						!isResizing && "height 250ms ease"
					}`,
					pointerEvents: isClipPath ? "none" : "all",
				}}
			>
				<div
					className={classNames(styles.Container)}
					style={{
						transform: CSS.Translate.toString(transform),
						clipPath: isClipPath
							? `inset(${clip.header}px 0 ${clip.input}px 0 round 10px)`
							: "inset(0 round 10px)",
						transition: "clip-path 250ms ease",
					}}
					ref={setNodeRef}
				>
					<div
						className={classNames(
							styles.dragButton,
							isDragging && styles.dragging,
						)}
						{...attributes}
						{...listeners}
						style={{ opacity: isIconDisplay ? 1 : 0 }}
					>
						<DragIcon />
					</div>
					<div
						className={styles.settingButton}
						style={{ opacity: isIconDisplay ? 1 : 0 }}
					>
						<SettingIcon />
					</div>
					<div className={styles.children}>
						{isDragging && <div className={styles.overlay} />}
						{children}
					</div>
				</div>
			</Resizable>
		</>
	);
};
