import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import translation_en from "./en.json";
import translation_ja from "./ja.json";

const resources = {
	ja: {
		translation: translation_ja,
	},
	en: {
		translation: translation_en,
	},
};

i18n.use(LanguageDetector).use(initReactI18next).init({
	resources,
	fallbackLng: "en",
	debug: true,
});

export default i18n;
