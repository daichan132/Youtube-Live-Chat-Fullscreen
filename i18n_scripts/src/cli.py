"""Command-line interface for i18n translation tools."""

import argparse
import functools
import json
from typing import Tuple, Type

from src.config import Settings, get_settings
from src.logger import logger
from src.translator import BaseTranslator, I18nTranslator, LocalesTranslator
from src.utils import process_translations


def translate_with_translator(
    lang_code: str,
    lang_name: str,
    settings: Settings,
    translator_class: Type[BaseTranslator],
) -> Tuple[str, str]:
    """Process translation for a single language using the specified translator class"""
    logger.info(f"Started translating to {lang_name} ({lang_code})...")

    # Log the source languages being used for this translation
    base_langs = settings.base_langs
    source_info = f"Combined from base languages: {', '.join(base_langs)}"
    logger.info(f"  Source: {source_info}")

    translator = translator_class(lang_name, settings)
    translated_data = translator.translate()
    translator.save_translation(lang_code, translated_data)
    return lang_code, lang_name


def run_translation(translator_class: Type[BaseTranslator]) -> None:
    """Run translation process with the specified translator class"""
    settings = get_settings()
    lang_codes_file = settings.get_absolute_path("lang_codes_file")
    with open(lang_codes_file, "r", encoding="utf-8") as f:
        lang_codes = json.load(f)

    # Create a partial function with settings and translator_class pre-filled
    # This partial object is pickleable
    translate_func_partial = functools.partial(
        translate_with_translator,
        settings=settings,
        translator_class=translator_class,
    )

    process_translations(
        lang_codes,
        translate_func_partial,  # Pass the partial function
        settings,
        max_workers=settings.max_workers,
    )


def main() -> None:
    """Main CLI entry point"""
    parser = argparse.ArgumentParser(description="Translate i18n files for the project")
    parser.add_argument(
        "--type",
        choices=["locales", "i18n"],
        default="i18n",
        help="Type of translation to perform (default: i18n)",
    )

    args = parser.parse_args()

    if args.type == "locales":
        logger.info("Running Chrome extension locales translation")
        run_translation(LocalesTranslator)
    else:
        logger.info("Running i18n assets translation")
        run_translation(I18nTranslator)


if __name__ == "__main__":
    main()
