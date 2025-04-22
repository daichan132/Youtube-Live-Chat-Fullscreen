import json
from typing import Tuple

from src.config import get_settings
from src.logger import get_logger
from src.translator import LocalesTranslator
from src.utils import process_translations

# Create a logger for this module
logger = get_logger(__name__)


def translate_language(lang_code: str, lang_name: str) -> Tuple[str, str]:
    """Process translation for a single language using multiple base languages"""
    logger.info(f"Started translating to {lang_name} ({lang_code})...")

    # Create a translator instance
    translator = LocalesTranslator(lang_name)

    # Translate using base languages
    translated_data = translator.translate()

    # Save the result
    translator.save_translation(lang_code, translated_data)

    return lang_code, lang_name


def main() -> None:
    # Load configuration
    settings = get_settings()

    # Resolve the absolute path for lang_codes_file and load language codes
    lang_codes_file = settings.get_absolute_path("lang_codes_file")
    with open(lang_codes_file, "r", encoding="utf-8") as f:
        lang_codes = json.load(f)

    # Start parallel translations with configured concurrency
    process_translations(
        lang_codes, translate_language, settings, max_workers=settings.max_workers
    )


if __name__ == "__main__":
    main()
