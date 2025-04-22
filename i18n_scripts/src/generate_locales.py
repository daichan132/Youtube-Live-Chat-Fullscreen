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

# -- Configuration via CLI arguments --
parser = argparse.ArgumentParser(
    description="Generate translated locales for Chrome extension"
)
parser.add_argument(
    "--base-langs",
    nargs="+",
    default=["en", "ja"],
    help="Base language codes (primary first)",
)
parser.add_argument(
    "--locales-dir",
    default=os.path.normpath(
        os.path.join(os.path.dirname(__file__), "..", "public", "_locales")
    ),
    help="Path to Chrome extension _locales directory",
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
args = parser.parse_args()

base_languages = args.base_langs
locales_dir = args.locales_dir
max_workers = args.max_workers
lang_codes_file = args.lang_codes_file


def translate_language(code, language):
    """Process translation for a single language using multiple base languages"""
    print(f"Started translating to {language} ({code})...")

    # Skip translation if the target language is one of the base languages
    if code in base_languages:
        print(f"Skipping {language} ({code}) as it's a base language")
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
    print(f"  {source_info}")

    # Translate the combined data
    translated_data = translate(
        json.dumps(combined_data, ensure_ascii=False), language, schema
    )

    # Save the translated data, creating directories if needed
    save_json_file(target_path, translated_data, create_dirs=True)

    return code, language


def main():
    # Load language codes from configured JSON
    lang_codes = get_lang_codes(lang_codes_file)
    # Start parallel translations with configured concurrency
    process_translations(lang_codes, translate_language, max_workers=max_workers)


if __name__ == "__main__":
    main()
