import type { IconType } from "react-icons";

export interface SettingItemType {
	icon: IconType;
	title: string;
	data: React.ReactNode;
	disable?: boolean;
}
