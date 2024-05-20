import { useCallback, useState } from "react";
import React from "react";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import classNames from "classnames";
import { useTranslation } from "react-i18next";
import { IoTrashOutline } from "react-icons/io5";
import { MdAutoFixNormal, MdOutlineDragIndicator } from "react-icons/md";
import Modal from "react-modal";
import { useShallow } from "zustand/react/shallow";

import { useYTDLiveChatStore } from "@/stores";
import { useChangeYLCStyle } from "../../../hooks/YTDLiveChatIframe/useChangeYLCStyle";
import modalStyles from "../../../styles/YTDLiveChatSetting/DeleteConfirmationModal.module.scss";
import styles from "../../../styles/YTDLiveChatSetting/PresetContent.module.scss";

import type { YLCStyleType } from "../../../../../../types/ytdLiveChatType";

interface PresetItemType {
	id: string;
}

export const PresetItem = ({ id }: PresetItemType) => {
	const {
		title,
		ylcStyle,
		updateTitle,
		updateYLCStyle,
		deletePresetItem,
		setAddPresetEnabled,
	} = useYTDLiveChatStore(
		useShallow((state) => ({
			title: state.presetItemTitles[id],
			ylcStyle: state.presetItemStyles[id],
			updateTitle: state.updateTitle,
			deletePresetItem: state.deletePresetItem,
			updateYLCStyle: state.updateYLCStyle,
			setAddPresetEnabled: state.setAddPresetEnabled,
		})),
	);
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const {
		attributes,
		setActivatorNodeRef,
		listeners,
		setNodeRef,
		transform,
		isDragging,
		transition,
	} = useSortable({
		id: id,
	});
	const changeYLCStyle = useChangeYLCStyle();
	const updateStyle = useCallback(
		(ylcStyle: YLCStyleType) => {
			updateYLCStyle(ylcStyle);
			changeYLCStyle(ylcStyle);
			setAddPresetEnabled(false);
		},
		[changeYLCStyle, setAddPresetEnabled, updateYLCStyle],
	);
	const { t } = useTranslation();

	return (
		<div
			className={classNames(
				styles["preset-item"],
				isDragging && styles.dragging,
			)}
			ref={setNodeRef}
			style={{ transform: CSS.Translate.toString(transform), transition }}
		>
			<div className={styles.flex}>
				<div className={styles.leftContainer}>
					<div ref={setActivatorNodeRef}>
						<MdOutlineDragIndicator
							className={classNames(
								styles.dragIcon,
								isDragging && styles.dragging,
							)}
							size={20}
							{...listeners}
							{...attributes}
						/>
					</div>
					<input
						type="text"
						value={title}
						onChange={(event) => updateTitle(id, event.target.value)}
						className={styles.title}
					/>
				</div>
				<div className={styles.rightContainer}>
					<MdAutoFixNormal
						className={styles.applyStyleButton}
						size={20}
						onClick={() => updateStyle(ylcStyle)}
					/>
					<IoTrashOutline
						className={styles.deleteButton}
						size={20}
						onClick={() => setIsDeleteModalOpen(true)}
					/>
				</div>
			</div>
			{isDeleteModalOpen && (
				<Modal
					isOpen={isDeleteModalOpen}
					className={modalStyles.Modal}
					onRequestClose={() => setIsDeleteModalOpen(false)}
					overlayClassName={modalStyles.Overlay}
					appElement={document.body}
				>
					<div className={modalStyles.content}>
						<p>{t("content.preset.deleteConfirmationMessage")}</p>
						<div className={modalStyles.actions}>
							<button
								type="button"
								onClick={() => deletePresetItem(id)}
								className={modalStyles.buttonDelete}
							>
								{t("content.preset.delete")}
							</button>
							<button
								type="button"
								onClick={() => setIsDeleteModalOpen(false)}
								className={modalStyles.buttonCancel}
							>
								{t("content.preset.cancel")}
							</button>
						</div>
					</div>
				</Modal>
			)}
		</div>
	);
};
