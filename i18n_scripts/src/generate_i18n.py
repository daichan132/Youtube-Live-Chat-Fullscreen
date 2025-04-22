import argparse
import json
import os

from i18n_scripts.src.utils import (
    build_response_format,
    combine_json_data,
    get_lang_codes,
    process_translations,
    save_json_file,
    translate,
)


def parse_args():
    parser = argparse.ArgumentParser(
        description="Generate translated i18n JSON assets for Chrome extension"
    )
    parser.add_argument(
        "--base-langs",
        nargs="+",
        default=["en", "ja"],
        help="Base language codes (primary first)",
    )
    parser.add_argument(
        "--assets-dir",
        default=os.path.normpath(
            os.path.join(os.path.dirname(__file__), "..", "shared", "i18n", "assets")
        ),
        help="Path to source i18n assets directory",
    )
    parser.add_argument(
        "--lang-codes-file",
        default=os.path.normpath(
            os.path.join(os.getcwd(), "shared", "i18n", "language_codes.json")
        ),
        help="Path to language codes JSON file",
    )
    parser.add_argument(
        "--max-workers",
        type=int,
        default=3,
        help="Maximum number of concurrent translation workers",
    )
    return parser.parse_args()


args = parse_args()
base_languages = args.base_langs
assets_dir = args.assets_dir
lang_codes_file = args.lang_codes_file
max_workers = args.max_workers


def translate_language(code, language):
    """Process translation for a single language using multiple base languages"""
    print(f"Started translating to {language} ({code})...")

    # Skip translation if the target language is one of the base languages
    if code in base_languages:
        print(f"Skipping {language} ({code}) as it's a base language")
        return code, language

    # Prepare base files to combine
    files_to_combine = [
        os.path.join(assets_dir, f"{base_lang}.json") for base_lang in base_languages
    ]

    # Combine data from all base languages
    combined_data = combine_json_data(files_to_combine)

    # Get schema from primary language JSON
    primary_source_path = os.path.join(assets_dir, f"{base_languages[0]}.json")
    schema = build_response_format(primary_source_path)

    # Target path for the translated file
    target_path = os.path.join(assets_dir, f"{code}.json")

    # Log which base languages are being used
    source_info = f"Combined from base languages: {', '.join(base_languages)}"
    print(f"  {source_info}")

    # Translate the combined data
    translated_data = translate(
        json.dumps(combined_data, ensure_ascii=False), language, schema
    )

    # Save the translated data, creating directories if needed
    save_json_file(target_path, translated_data, create_dirs=True)

    return code, language


def main():
    # Load language codes
    lang_codes = get_lang_codes(lang_codes_file)
    # Start parallel translations with configured concurrency
    process_translations(lang_codes, translate_language, max_workers=max_workers)


if __name__ == "__main__":
    main()
