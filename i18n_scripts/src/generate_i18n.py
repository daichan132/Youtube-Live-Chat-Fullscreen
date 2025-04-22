import json
from typing import Tuple

from src.config import get_settings
from src.logger import get_logger
from src.translator import I18nTranslator
from src.utils import process_translations

# Create a logger for this module
logger = get_logger(__name__)


def translate_language(code: str, language: str) -> Tuple[str, str]:
    """Process translation for a single language using multiple base languages"""
    logger.info(f"Started translating to {language} ({code})...")

    # Get configuration
    settings = get_settings()
    base_languages = settings.base_langs

    # Log which base languages are being used
    source_info = f"Combined from base languages: {', '.join(base_languages)}"
    logger.info(f"  {source_info}")

    # Create a translator instance
    translator = I18nTranslator(base_languages, language)

    # Translate using base languages
    translated_data = translator.translate()

    # Save the result
    translator.save_translation(code, translated_data)

    return code, language


def main() -> None:
    # Load configuration
    settings = get_settings()

    # Resolve the absolute path for lang_codes_file and load language codes
    lang_codes_file = settings.get_absolute_path("lang_codes_file")
    with open(lang_codes_file, "r", encoding="utf-8") as f:
        lang_codes = json.load(f)

    # Start parallel translations with configured concurrency
    process_translations(
        lang_codes, translate_language, max_workers=settings.max_workers
    )


if __name__ == "__main__":
    main()
