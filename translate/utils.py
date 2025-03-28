import json
import os
from concurrent.futures import ProcessPoolExecutor, as_completed

from openai import OpenAI

client = OpenAI()


def get_lang_codes():
    with open("shared/i18n/language_codes.json", "r", encoding="utf-8") as f:
        return json.load(f)


def get_file_path(script_dir, path_parts):
    """Construct file path from parts"""
    return os.path.join(script_dir, *path_parts)


def load_json_file(file_path):
    """Load and return JSON data from a file"""
    if os.path.exists(file_path):
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_json_file(file_path, data, create_dirs=False):
    """Save JSON data to a file"""
    if create_dirs:
        os.makedirs(os.path.dirname(file_path), exist_ok=True)

    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def combine_json_data(files_to_combine):
    """
    Combine JSON data from multiple files

    Args:
        files_to_combine: List of file paths to combine

    Returns:
        Combined JSON data dictionary
    """
    combined_data = {}

    for file_path in files_to_combine:
        if os.path.exists(file_path):
            data = load_json_file(file_path)
            # Add data if key doesn't already exist
            for key, value in data.items():
                if key not in combined_data:
                    combined_data[key] = value

    return combined_data


def build_response_format(file_path: str) -> dict:
    """
    Reads a JSON file (e.g. ja.json) and returns a JSON response_format
    that reflects its structure. Designed for i18n file usage.
    """
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    def parse_value(value) -> dict:
        if isinstance(value, dict):
            return {
                "type": "object",
                "properties": {k: parse_value(v) for k, v in value.items()},
                "required": list(value.keys()),
                "additionalProperties": False,
            }
        elif isinstance(value, list):
            return {
                "type": "array",
                "items": parse_value(value[0]) if value else {},
            }
        elif isinstance(value, bool):
            return {"type": "boolean"}
        elif isinstance(value, (int, float)):
            return {"type": "number"}
        else:
            return {"type": "string"}

    return {
        "type": "json_schema",
        "json_schema": {
            "name": "locale_response",
            "strict": True,
            "schema": parse_value(data),
        },
    }


def translate(text: str, target_language: str, response_format: dict) -> dict:
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "system",
                "content": f"I want to generate json data for i18n for an extension called YouTube Live Chat Fullscreen. Translate the following json into {target_language}",
            },
            {
                "role": "user",
                "content": text,
            },
        ],
        response_format=response_format,
    )

    return json.loads(response.choices[0].message.content)


def process_translations(lang_codes, translate_func, max_workers=3):
    """
    Process all translations in parallel with limited concurrency

    Args:
        lang_codes: Dictionary of language codes and names
        translate_func: Function to translate a single language
        max_workers: Maximum number of concurrent workers (default: 3)
    """
    print(f"Starting translations with {max_workers} concurrent workers...")
    with ProcessPoolExecutor(max_workers=max_workers) as executor:
        # Submit all translation tasks
        future_to_lang = {
            executor.submit(translate_func, code, language): (code, language)
            for code, language in lang_codes.items()
        }

        # Process results as they complete
        for future in as_completed(future_to_lang):
            code, language = future_to_lang[future]
            try:
                result_code, result_language = future.result()
                print(f"✅ Completed translation for {result_language} ({result_code})")
            except Exception as exc:
                print(f"❌ Translation for {language} ({code}) failed: {exc}")
                print(f"   Error: {str(exc)}")
