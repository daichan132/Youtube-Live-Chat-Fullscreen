import json
from typing import Tuple

from src.config import Settings, get_settings
from src.logger import logger
from src.translator import I18nTranslator
from src.utils import process_translations


def translate_language(
    lang_code: str, lang_name: str, settings: Settings
) -> Tuple[str, str]:
    """Process translation for a single language using multiple base languages"""
    logger.info(f"Started translating to {lang_name} ({lang_code})...")

    base_langs = settings.base_langs
    source_info = f"Combined from base languages: {', '.join(base_langs)}"
    logger.info(f"  {source_info}")

    translator = I18nTranslator(lang_name, settings)
    translated_data = translator.translate()
    translator.save_translation(lang_code, translated_data)
    return lang_code, lang_name


def main() -> None:
    settings = get_settings()
    lang_codes_file = settings.get_absolute_path("lang_codes_file")
    with open(lang_codes_file, "r", encoding="utf-8") as f:
        lang_codes = json.load(f)
    process_translations(
        lang_codes,
        lambda code, name: translate_language(code, name, settings),
        settings,
        max_workers=settings.max_workers,
    )


if __name__ == "__main__":
    main()
