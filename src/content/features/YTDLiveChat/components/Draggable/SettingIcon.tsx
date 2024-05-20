import { CiSettings } from "react-icons/ci";
import { useShallow } from "zustand/react/shallow";

import { useYTDLiveChatNoLsStore, useYTDLiveChatStore } from "@/stores";

export const SettingIcon = () => {
	const { setIsOpenSettingModal } = useYTDLiveChatNoLsStore(
		useShallow((state) => ({
			setIsOpenSettingModal: state.setIsOpenSettingModal,
		})),
	);
	const { fontColor: rgba } = useYTDLiveChatStore(
		useShallow((state) => ({ fontColor: state.fontColor })),
	);

	return (
		<CiSettings
			size={24}
			onClick={() => {
				setIsOpenSettingModal(true);
			}}
			color={`rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a})`}
		/>
	);
};
