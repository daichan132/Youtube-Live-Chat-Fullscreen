"""Translators for i18n content using OpenAI API."""

import json
import os
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional

from openai import OpenAI

from src.config import Settings, get_settings
from src.logger import logger

# Create the OpenAI client
client = OpenAI()


class BaseTranslator(ABC):
    """Base class for translators"""

    def __init__(self, target_language: str, settings: Optional[Settings] = None):
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
    def get_base_path(self) -> str:
        """Get base directory path for this translator type"""
        pass

    @abstractmethod
    def get_file_name(self, lang_code: str) -> str:
        """Get the file name pattern for this translator type"""
        pass

    def get_base_files(self) -> List[str]:
        """Get list of base language files"""
        base_path = self.get_base_path()
        return [
            os.path.join(base_path, self.get_file_name(lang))
            for lang in self.settings.base_langs
        ]

    def get_schema_file(self) -> str:
        """Get schema file path based on first base language"""
        base_path = self.get_base_path()
        return os.path.join(base_path, self.get_file_name(self.settings.base_langs[0]))

    def get_target_file(self, target_code: str) -> str:
        """Get target file path"""
        base_path = self.get_base_path()
        return os.path.join(base_path, self.get_file_name(target_code))

    def translate(self) -> Dict[str, Any]:
        """Translate content using OpenAI API"""
        base_languages = self.settings.base_langs
        target_language = self.target_language
        base_files = self.get_base_files()
        schema_file = self.get_schema_file()

        # Create a list of base files that actually exist
        existing_base_files = [fp for fp in base_files if os.path.exists(fp)]

        if not existing_base_files:
            logger.warning(f"No base files found at {base_files}")
            return {}

        # baseファイルをまとめて読み込み、combined_textを生成
        combined_text = "\n".join(
            json.dumps(
                json.load(open(fp, "r", encoding="utf-8")),
                ensure_ascii=False,
                indent=2,
            )
            for fp in existing_base_files
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
        os.makedirs(os.path.dirname(target_path), exist_ok=True)

        # Save file with proper formatting
        with open(target_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        logger.debug(f"Saved translation to {target_path}")


class LocalesTranslator(BaseTranslator):
    """Translator for Chrome extension locales"""

    def __init__(self, target_language: str, settings: Optional[Settings] = None):
        super().__init__(target_language, settings)

    def get_base_path(self) -> str:
        """Get the base path for locales files"""
        return self.settings.get_absolute_path("locales_dir")

    def get_file_name(self, lang_code: str) -> str:
        """Get file name pattern for locales"""
        return os.path.join(lang_code, "messages.json")


class I18nTranslator(BaseTranslator):
    """Translator for i18n JSON assets"""

    def __init__(self, target_language: str, settings: Optional[Settings] = None):
        super().__init__(target_language, settings)

    def get_base_path(self) -> str:
        """Get the base path for i18n assets"""
        return self.settings.get_absolute_path("assets_dir")

    def get_file_name(self, lang_code: str) -> str:
        """Get file name pattern for i18n assets"""
        return f"{lang_code}.json"
