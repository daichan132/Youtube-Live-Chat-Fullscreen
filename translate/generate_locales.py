import json
import os

from utils import (
    build_response_format,
    combine_json_data,
    get_file_path,
    get_lang_codes,
    process_translations,
    save_json_file,
    translate,
)

# The first language is considered the primary base language
base_languages = ["en", "ja"]


def translate_language(code, language):
    """Process translation for a single language using multiple base languages"""
    print(f"Started translating to {language} ({code})...")
    script_dir = os.path.dirname(os.path.abspath(__file__))

    # Skip translation if the target language is one of the base languages
    if code in base_languages:
        print(f"Skipping {language} ({code}) as it's a base language")
        return code, language

    # Path components for locales
    locales_path = ["..", "public", "_locales"]
    file_name = "messages.json"

    # Prepare files to combine
    files_to_combine = [
        get_file_path(script_dir, locales_path + [base_lang, file_name])
        for base_lang in base_languages
    ]

    # Combine data from all base languages
    combined_data = combine_json_data(files_to_combine)

    # Get schema from primary language
    primary_source_path = get_file_path(
        script_dir, locales_path + [base_languages[0], file_name]
    )
    schema = build_response_format(primary_source_path)

    # Target path for the translated file
    target_path = get_file_path(script_dir, locales_path + [code, file_name])

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
    lang_codes = get_lang_codes()
    # Use max_workers=3 to avoid API rate limits
    process_translations(lang_codes, translate_language, max_workers=3)


if __name__ == "__main__":
    main()
