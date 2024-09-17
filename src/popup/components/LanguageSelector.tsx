import React from "react";

import { useTranslation } from "react-i18next";
import Select from "react-select";

export const LanguageSelector = () => {
	const languageOptions = [
		{ value: "en", label: "English" },
		{ value: "id", label: "Bahasa Indonesia" },
		{ value: "es", label: "Español" },
		{ value: "th", label: "ไทย" },
		{ value: "tl", label: "Filipino" },
		{ value: "ms", label: "Bahasa Melayu" },
		{ value: "zh-TW", label: "中文 (繁體)" },
		{ value: "ja", label: "日本語" },
	];

	const { i18n } = useTranslation();

	const changeLanguage = (
		selectedOption: {
			value: string;
			label: string;
		} | null,
	) => {
		if (selectedOption === null) return;
		i18n.changeLanguage(selectedOption.value);
		chrome.runtime.sendMessage({
			message: "language",
			language: selectedOption.value,
		});
	};

	return (
		<Select
			styles={{
				control: (baseStyles) => ({
					...baseStyles,
					fontSize: "14px",
					width: 180,
					borderRadius: 4,
					minHeight: "unset"
				}),
				menu: (baseStyles) => ({
					...baseStyles,
					fontSize: "14px",
					borderRadius: 4,
				}),
				option: (baseStyles) => ({
					...baseStyles,
					padding: "6px 10px",
				}),
				dropdownIndicator: (baseStyles) => ({
					...baseStyles,
					padding: "7px 8px",
				}),
			}}
			defaultValue={languageOptions.find(
				(option) => option.value === i18n.language,
			)}
			options={languageOptions}
			onChange={changeLanguage}
			components={{
				IndicatorSeparator: () => null,
			}}
		/>
	);
};
