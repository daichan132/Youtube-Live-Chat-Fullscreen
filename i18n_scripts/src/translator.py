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


class BaseTranslator(ABC):
    """Base class for translators"""

    def __init__(self, target_language: str, settings=None):
        self.settings = settings or get_settings()
        self.target_language = target_language

    def build_response_format(self, file_path: str) -> Dict[str, Any]:
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
        base_languages = self.settings.base_langs
        target_language = self.target_language
        base_files = self.get_base_files()
        schema_file = self.get_schema_file()

        # baseファイルをまとめて読み込み、combined_textを生成
        combined_text = "\n".join(
            json.dumps(
                json.load(open(fp, "r", encoding="utf-8"))
                if os.path.exists(fp)
                else {},
                ensure_ascii=False,
                indent=2,
            )
            for fp in base_files
        )

        response_format = self.build_response_format(schema_file)

        system_prompt = f"""
You are an expert localization assistant for the Chrome extension 'YouTube Live Chat Fullscreen'.
Ensure the translation is natural, accurate, and culturally appropriate for {target_language} speakers using the extension.
Translate all string values into {target_language} based on the JSON data from the following base languages: {", ".join(base_languages)}.
""".strip()

        response = client.chat.completions.create(
            model=self.settings.openai_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": combined_text},
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

    def __init__(self, target_language: str, settings=None):
        super().__init__(target_language, settings)

    def get_base_files(self) -> List[str]:
        locales_dir = self.settings.get_absolute_path("locales_dir")
        file_name = "messages.json"
        return [
            os.path.join(locales_dir, lang, file_name)
            for lang in self.settings.base_langs
        ]

    def get_schema_file(self) -> str:
        locales_dir = self.settings.get_absolute_path("locales_dir")
        file_name = "messages.json"
        return os.path.join(locales_dir, self.settings.base_langs[0], file_name)

    def get_target_file(self, target_code: str) -> str:
        locales_dir = self.settings.get_absolute_path("locales_dir")
        file_name = "messages.json"
        return os.path.join(locales_dir, target_code, file_name)


class I18nTranslator(BaseTranslator):
    """Translator for i18n JSON assets"""

    def __init__(self, target_language: str, settings=None):
        super().__init__(target_language, settings)

    def get_base_files(self) -> List[str]:
        assets_dir = self.settings.get_absolute_path("assets_dir")
        return [
            os.path.join(assets_dir, f"{lang}.json")
            for lang in self.settings.base_langs
        ]

    def get_schema_file(self) -> str:
        assets_dir = self.settings.get_absolute_path("assets_dir")
        return os.path.join(assets_dir, f"{self.settings.base_langs[0]}.json")

    def get_target_file(self, target_code: str) -> str:
        assets_dir = self.settings.get_absolute_path("assets_dir")
        return os.path.join(assets_dir, f"{target_code}.json")
