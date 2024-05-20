import React, { useCallback } from "react";

import classNames from "classnames";
import { useTranslation } from "react-i18next";
import { MdAdd } from "react-icons/md";
import { v4 as uuidv4 } from "uuid";
import { useShallow } from "zustand/react/shallow";

import { useYTDLiveChatStore } from "@/stores";
import styles from "../../../styles/YTDLiveChatSetting/PresetContent.module.scss";

import type { YLCStyleType } from "../../../../../../types/ytdLiveChatType";

export const AddPresetItem = () => {
	const { addPresetEnabled, addPresetItem } = useYTDLiveChatStore(
		useShallow((state) => ({
			addPresetEnabled: state.addPresetEnabled,
			addPresetItem: state.addPresetItem,
		})),
	);
	const { t } = useTranslation();
	const addItem = useCallback(() => {
		const state = useYTDLiveChatStore.getState();
		const ylcStyle: YLCStyleType = {
			bgColor: state.bgColor,
			fontColor: state.fontColor,
			fontFamily: state.fontFamily,
			fontSize: state.fontSize,
			blur: state.blur,
			space: state.space,
			alwaysOnDisplay: state.alwaysOnDisplay,
			chatOnlyDisplay: state.chatOnlyDisplay,
			userNameDisplay: state.userNameDisplay,
			userIconDisplay: state.userIconDisplay,
			reactionButtonDisplay: state.reactionButtonDisplay,
			superChatBarDisplay: state.superChatBarDisplay,
		};
		addPresetItem(uuidv4(), t("content.preset.addItemTitle"), ylcStyle);
	}, [addPresetItem, t]);
	return (
		<div
			className={classNames(
				styles["add-preset-item"],
				!addPresetEnabled && styles.disable,
			)}
			onClick={() => addPresetEnabled && addItem()}
			onKeyDown={() => {}}
		>
			<MdAdd size={20} /> <div>{t("content.preset.addMessage")}</div>
		</div>
	);
};
