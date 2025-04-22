import json
import os

from src.config import (
    get_base_langs,
    get_lang_codes_file,
    get_locales_dir,
    get_max_workers,
)
from src.logger import get_logger
from src.utils import (
    build_response_format,
    combine_json_data,
    get_lang_codes,
    process_translations,
    save_json_file,
    translate,
)

# Create a logger for this module
logger = get_logger(__name__)


def translate_language(code, language):
    """Process translation for a single language using multiple base languages"""
    logger.info(f"Started translating to {language} ({code})...")

    # Get configuration
    base_languages = get_base_langs()
    locales_dir = get_locales_dir()

    # Skip translation if the target language is one of the base languages
    if code in base_languages:
        logger.info(f"Skipping {language} ({code}) as it's a base language")
        return code, language

    file_name = "messages.json"
    # Prepare files to combine from configured locales_dir
    files_to_combine = [
        os.path.join(locales_dir, base_lang, file_name) for base_lang in base_languages
    ]

    # Combine data from all base languages
    combined_data = combine_json_data(files_to_combine)

    # Get schema from primary language files
    primary_source_path = os.path.join(locales_dir, base_languages[0], file_name)
    schema = build_response_format(primary_source_path)

    # Target path for the translated file
    target_path = os.path.join(locales_dir, code, file_name)

    # Log which base languages are being used
    source_info = f"Combined from base languages: {', '.join(base_languages)}"
    logger.info(f"  {source_info}")

    # Translate the combined data
    translated_data = translate(
        json.dumps(combined_data, ensure_ascii=False), language, schema
    )

    # Save the translated data, creating directories if needed
    save_json_file(target_path, translated_data, create_dirs=True)

    return code, language


def main():
    # Load configuration
    lang_codes_file = get_lang_codes_file()
    max_workers = get_max_workers()

    # Load language codes from configured JSON
    lang_codes = get_lang_codes(lang_codes_file)
    # Start parallel translations with configured concurrency
    process_translations(lang_codes, translate_language, max_workers=max_workers)


if __name__ == "__main__":
    main()
