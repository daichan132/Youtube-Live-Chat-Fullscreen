import json
import os
from typing import Tuple

from src.config import get_settings
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


def translate_language(code: str, language: str) -> Tuple[str, str]:
    """Process translation for a single language using multiple base languages"""
    logger.info(f"Started translating to {language} ({code})...")

    # Get configuration
    settings = get_settings()
    base_languages = settings.base_langs

    # Resolve the absolute path for assets_dir
    assets_dir = settings.get_absolute_path("assets_dir")

    # Combine data from all base languages
    combined_data = combine_json_data(
        os.path.join(assets_dir, f"{base_lang}.json") for base_lang in base_languages
    )
    schema = build_response_format(
        os.path.join(assets_dir, f"{base_languages[0]}.json")
    )

    # Target path for the translated file
    target_path = os.path.join(assets_dir, f"{code}.json")

    # Log which base languages are being used
    source_info = f"Combined from base languages: {', '.join(base_languages)}"
    logger.info(f"  {source_info}")

    # Translate the combined data
    translated_data = translate(
        "\n".join(
            json.dumps(data, ensure_ascii=False, indent=2) for data in combined_data
        ),
        language,
        schema,
    )

    # Save the translated data, creating directories if needed
    save_json_file(target_path, translated_data, create_dirs=True)

    return code, language


def main() -> None:
    # Load configuration
    settings = get_settings()

    # Resolve the absolute path for lang_codes_file
    lang_codes_file = settings.get_absolute_path("lang_codes_file")

    # Load language codes
    lang_codes = get_lang_codes(lang_codes_file)

    # Start parallel translations with configured concurrency
    process_translations(
        lang_codes, translate_language, max_workers=settings.max_workers
    )


if __name__ == "__main__":
    main()
