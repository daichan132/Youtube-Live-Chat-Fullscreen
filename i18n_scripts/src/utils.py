import json
import os
from concurrent.futures import ProcessPoolExecutor, as_completed

from openai import OpenAI

from src.config import get_settings
from src.logger import get_logger

# Create a logger for this module
logger = get_logger(__name__)

# Create the OpenAI client
client = OpenAI()


def get_lang_codes(lang_codes_path=None):
    """
    Load language codes JSON from the given path or default path from settings.
    """
    # Determine path if not provided
    if not lang_codes_path:
        settings = get_settings()
        lang_codes_path = settings.get_absolute_path("lang_codes_file")

    with open(lang_codes_path, "r", encoding="utf-8") as f:
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
    combined_data = []

    for file_path in files_to_combine:
        data = {}
        if os.path.exists(file_path):
            data = load_json_file(file_path)
            # Add data if key doesn't already exist
            for key, value in data.items():
                if key not in data:
                    data[key] = value
        combined_data.append(data)

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
    """Translate text using OpenAI API with model from config"""
    settings = get_settings()
    model = settings.openai_model

    response = client.chat.completions.create(
        model=model,
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


def process_translations(lang_codes, translate_func, max_workers=None):
    """
    Process all translations in parallel with limited concurrency

    Args:
        lang_codes: Dictionary of language codes and names
        translate_func: Function to translate a single language
        max_workers: Maximum number of concurrent workers (default: from settings)
    """
    if max_workers is None:
        max_workers = get_settings().max_workers

    logger.info(f"Starting translations with {max_workers} concurrent workers...")
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
                logger.info(
                    f"✅ Completed translation for {result_language} ({result_code})"
                )
            except Exception as exc:
                logger.error(f"❌ Translation for {language} ({code}) failed: {exc}")
                logger.error(f"   Error: {str(exc)}")
