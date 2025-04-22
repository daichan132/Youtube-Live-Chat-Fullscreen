"""Configuration management for i18n scripts using Pydantic."""

import json
import os
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator
from pydantic_core import PydanticCustomError

from src.logger import get_logger

# Create a logger for this module
logger = get_logger(__name__)


class Settings(BaseModel):
    """Configuration settings for i18n scripts."""

    base_langs: List[str] = Field(
        default=["en", "ja"],
        description="List of base language codes used as source for translations",
    )
    locales_dir: str = Field(
        default="../public/_locales",
        description="Path to the Chrome extension locales directory for JSON files",
    )
    assets_dir: str = Field(
        default="../shared/i18n/assets",
        description="Path to the i18n assets directory for JSON files",
    )
    lang_codes_file: str = Field(
        default="../shared/i18n/language_codes.json",
        description="Path to the JSON file containing language codes and display names",
    )
    max_workers: int = Field(
        default=3,
        description="Number of parallel translation workers",
        ge=1,
    )
    openai_model: str = Field(
        default="gpt-4o",
        description="OpenAI model to use for translations",
    )

    @field_validator("max_workers")
    @classmethod
    def validate_max_workers(cls, v: int) -> int:
        """Validate max_workers is at least 1."""
        if v < 1:
            raise PydanticCustomError(
                "max_workers_too_small",
                "max_workers must be at least 1",
                {"value": v},
            )
        return v

    def get_absolute_path(self, path_attr: str) -> str:
        """
        Get the absolute path for a relative path attribute.

        Args:
            path_attr: The name of the attribute that contains a relative path

        Returns:
            The absolute path
        """
        relative_path = getattr(self, path_attr)
        absolute_path = os.path.normpath(
            os.path.join(os.path.dirname(__file__), "..", relative_path)
        )
        logger.debug(f"Absolute path for {path_attr}: {absolute_path}")
        return absolute_path


def get_config_path() -> str:
    """Get the path to the config file."""
    config_path: str = os.path.normpath(
        os.path.join(os.path.dirname(__file__), "..", "config.json")
    )
    logger.debug(f"Config path: {config_path}")
    return config_path


def create_default_config() -> Settings:
    """Create default configuration."""
    settings: Settings = Settings()
    logger.debug("Created default configuration")
    return settings


# Global settings instance - will be initialized once
_settings_instance: Optional[Settings] = None


def init_settings() -> Settings:
    """
    Initialize the global settings instance.
    This should be called once at application startup.
    """
    global _settings_instance

    if _settings_instance is not None:
        logger.debug("Settings already initialized")
        return _settings_instance

    config_path: str = get_config_path()

    # If config file doesn't exist, create default and save it
    if not os.path.exists(config_path):
        logger.warning(f"Config file not found at {config_path}, creating default")
        settings: Settings = create_default_config()

        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(config_path), exist_ok=True)

        # Save default config
        with open(config_path, "w", encoding="utf-8") as f:
            json.dump(settings.model_dump(), f, ensure_ascii=False, indent=2)

        _settings_instance = settings
        return settings

    # Load config from file
    try:
        with open(config_path, "r", encoding="utf-8") as f:
            config_data: dict = json.load(f)
            settings: Settings = Settings(**config_data)
            logger.debug(f"Loaded configuration from {config_path}")
            _settings_instance = settings
            return settings
    except json.JSONDecodeError as e:
        logger.error(f"Error parsing config.json: {e}")
        logger.warning("Using default configuration instead")
        settings: Settings = create_default_config()
        _settings_instance = settings
        return settings
    except Exception as e:
        logger.error(f"Error loading config: {e}")
        logger.warning("Using default configuration instead")
        settings: Settings = create_default_config()
        _settings_instance = settings
        return settings


def get_settings() -> Settings:
    """
    Get the application settings.
    If settings have not been initialized, initialize them.
    """
    global _settings_instance

    if _settings_instance is None:
        logger.debug("Settings not initialized, initializing now")
        return init_settings()

    return _settings_instance
