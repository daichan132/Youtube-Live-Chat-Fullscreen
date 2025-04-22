"""Translators for i18n content using OpenAI API."""

import json
import os
from abc import ABC, abstractmethod
from typing import Any, Dict, List

from openai import OpenAI

from src.config import get_settings
from src.logger import get_logger

# Create a logger for this module
logger = get_logger(__name__)

# Create the OpenAI client
client = OpenAI()


def combine_json_data(files_to_combine: List[str]) -> List[Dict[str, Any]]:
    """
    Combine JSON data from multiple files

    Args:
        files_to_combine: List of file paths to combine

    Returns:
        Combined JSON data from multiple files as a list
    """
    combined_data: List[Dict[str, Any]] = []

    for file_path in files_to_combine:
        data: Dict[str, Any] = {}
        if os.path.exists(file_path):
            # Load JSON file
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            # Add data if key doesn't already exist
            for key, value in data.items():
                if key not in data:
                    data[key] = value
        combined_data.append(data)

    return combined_data


def build_response_format(file_path: str) -> Dict[str, Any]:
    """
    Reads a JSON file (e.g. ja.json) and returns a JSON response_format
    that reflects its structure. Designed for i18n file usage.
    """
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    def parse_value(value: Any) -> Dict[str, Any]:
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


class BaseTranslator(ABC):
    """Base class for translators"""

    def __init__(self, base_languages: List[str], target_language: str):
        self.base_languages = base_languages
        self.target_language = target_language
        self.settings = get_settings()
        self.model = self.settings.openai_model

    @abstractmethod
    def get_base_files(self) -> List[str]:
        """Get list of base language files"""
        pass

    @abstractmethod
    def get_schema_file(self) -> str:
        """Get schema file path"""
        pass

    @abstractmethod
    def get_target_file(self, target_code: str) -> str:
        """Get target file path"""
        pass

    def translate(self) -> Dict[str, Any]:
        """Translate content using OpenAI API"""
        # Get file paths
        base_files = self.get_base_files()
        schema_file = self.get_schema_file()

        # Combine data from all base languages
        combined_data = combine_json_data(base_files)

        # Build response format schema
        response_format = build_response_format(schema_file)

        # Prepare combined data as text
        combined_text = "\n".join(
            json.dumps(data, ensure_ascii=False, indent=2) for data in combined_data
        )

        # Make the API call
        response = client.chat.completions.create(
            model=self.model,
            messages=[
                {
                    "role": "system",
                    "content": f"I want to generate json data for i18n for an extension called YouTube Live Chat Fullscreen. Translate the following json into {self.target_language}",
                },
                {
                    "role": "user",
                    "content": combined_text,
                },
            ],
            response_format=response_format,
        )

        return json.loads(response.choices[0].message.content)

    def save_translation(self, target_code: str, data: Dict[str, Any]) -> None:
        """Save translation data to file"""
        target_path = self.get_target_file(target_code)

        # Ensure directory exists
        if not os.path.exists(os.path.dirname(target_path)):
            os.makedirs(os.path.dirname(target_path), exist_ok=True)

        # Save file
        with open(target_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)


class LocalesTranslator(BaseTranslator):
    """Translator for Chrome extension locales"""

    def get_base_files(self) -> List[str]:
        locales_dir = self.settings.get_absolute_path("locales_dir")
        file_name = "messages.json"
        return [
            os.path.join(locales_dir, lang, file_name) for lang in self.base_languages
        ]

    def get_schema_file(self) -> str:
        locales_dir = self.settings.get_absolute_path("locales_dir")
        file_name = "messages.json"
        return os.path.join(locales_dir, self.base_languages[0], file_name)

    def get_target_file(self, target_code: str) -> str:
        locales_dir = self.settings.get_absolute_path("locales_dir")
        file_name = "messages.json"
        return os.path.join(locales_dir, target_code, file_name)


class I18nTranslator(BaseTranslator):
    """Translator for i18n JSON assets"""

    def get_base_files(self) -> List[str]:
        assets_dir = self.settings.get_absolute_path("assets_dir")
        return [
            os.path.join(assets_dir, f"{lang}.json") for lang in self.base_languages
        ]

    def get_schema_file(self) -> str:
        assets_dir = self.settings.get_absolute_path("assets_dir")
        return os.path.join(assets_dir, f"{self.base_languages[0]}.json")

    def get_target_file(self, target_code: str) -> str:
        assets_dir = self.settings.get_absolute_path("assets_dir")
        return os.path.join(assets_dir, f"{target_code}.json")
