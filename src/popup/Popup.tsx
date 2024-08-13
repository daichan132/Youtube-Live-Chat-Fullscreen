import React from "react";

import classNames from "classnames";
import { useTranslation } from "react-i18next";
import { IoLanguage, IoChatboxOutline, IoLinkOutline } from "react-icons/io5";

import LanguageSelector from "./components/LanguageSelector";
import { YTDLiveChatSwitch } from "./components/YTDLiveChatSwitch";
import styles from "./styles/Popup.module.scss";

import type { IconType } from "react-icons";
import { Links } from "./components/Links";

interface itemType {
	icon?: IconType;
	title: string;
	data: React.ReactNode;
}

const Popup = () => {
	const { t } = useTranslation();
	const items: itemType[] = [
		{
			icon: IoLanguage,
			title: t("popup.language"),
			data: <LanguageSelector />,
		},
		{
			icon: IoChatboxOutline,
			title: t("popup.showChatOnFullscreen"),
			data: <YTDLiveChatSwitch />
		},
		{
			icon: IoLinkOutline,
			title: t("popup.links"),
			data: <Links />
		}
	];

	return (
		<div className={styles.settings}>
			<div className={styles.content}>
				{items.map((item, i) => {
					return (
						<React.Fragment key={`${item.title}-${i}`}>
							<div className={classNames(styles["content-item"])}>
								<div
									className={
										item.icon ? styles["title-with-icon"] : styles.title
									}
								>
									{item.icon ? <item.icon size={16} /> : null}
									<div>{item.title}</div>
								</div>
								{item.data}
							</div>
							{i === items.length - 1 ? null : <hr />}
						</React.Fragment>
					);
				})}
				<div className={styles.footer}>
					<div className={styles.help}>
						{t("content.setting.footer")}
						<a
							href="https://smart-persimmon-6f9.notion.site/Chrome-extension-help-1606385e75a14d65ae4d0e42ba47fb84?pvs=4"
							target="_blank"
							rel="noopener noreferrer"
						>
							{t("content.setting.help")}
						</a>
					</div>
				</div>
			</div>
		</div>
	);
};

export default Popup;
