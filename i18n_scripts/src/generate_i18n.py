import json
import os
from typing import Tuple

from src.config import get_settings
from src.logger import get_logger
from src.utils import (
    build_response_format,
    combine_json_data,
    process_translations,
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
    if not os.path.exists(os.path.dirname(target_path)):
        os.makedirs(os.path.dirname(target_path), exist_ok=True)

    with open(target_path, "w", encoding="utf-8") as f:
        json.dump(translated_data, f, ensure_ascii=False, indent=2)

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
