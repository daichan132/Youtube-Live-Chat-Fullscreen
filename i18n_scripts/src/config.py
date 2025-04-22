"""Configuration management for i18n scripts."""

import json
import os
from typing import Any, Dict, List, Optional

from src.logger import get_logger

# Create a logger for this module
logger = get_logger(__name__)


def get_config_path() -> str:
    """Get the path to the config file."""
    config_path = os.path.normpath(
        os.path.join(os.path.dirname(__file__), "..", "config.json")
    )
    logger.debug(f"Config path: {config_path}")
    return config_path


def load_config() -> Dict:
    """Load the config from the config file."""
    config_path = get_config_path()

    # Check if config file exists
    if not os.path.exists(config_path):
        logger.error(f"Config file not found at {config_path}")
        raise FileNotFoundError(f"Config file not found at {config_path}")

    # Load the config
    with open(config_path, "r", encoding="utf-8") as f:
        config = json.load(f)
        logger.debug(f"Loaded configuration with {len(config)} keys")
        return config


def get_config_value(key: str, default: Optional[Any] = None) -> Any:
    """Get a value from the config.

    Raises:
        KeyError: If the key is not found in the config and no default is provided.
    """
    config = load_config()
    if key not in config and default is None:
        logger.error(f"Configuration key '{key}' not found in config file")
        raise KeyError(f"Configuration key '{key}' not found in config file")
    value = config.get(key, default)
    logger.debug(f"Config value for '{key}': {value}")
    return value


def get_base_langs() -> List[str]:
    """Get the base languages from the config."""
    base_langs = get_config_value("base_langs")
    logger.debug(f"Base languages: {base_langs}")
    return base_langs


def get_locales_dir() -> str:
    """Get the locales directory from the config."""
    config_dir = get_config_value("locales_dir")
    locales_dir = os.path.normpath(
        os.path.join(os.path.dirname(__file__), "..", config_dir)
    )
    logger.debug(f"Locales directory: {locales_dir}")
    return locales_dir


def get_assets_dir() -> str:
    """Get the assets directory from the config."""
    config_dir = get_config_value("assets_dir")
    assets_dir = os.path.normpath(
        os.path.join(os.path.dirname(__file__), "..", config_dir)
    )
    logger.debug(f"Assets directory: {assets_dir}")
    return assets_dir


def get_lang_codes_file() -> str:
    """Get the language codes file from the config."""
    config_file = get_config_value("lang_codes_file")
    lang_codes_file = os.path.normpath(
        os.path.join(os.path.dirname(__file__), "..", config_file)
    )
    logger.debug(f"Language codes file: {lang_codes_file}")
    return lang_codes_file


def get_max_workers() -> int:
    """Get the maximum number of workers from the config."""
    max_workers = get_config_value("max_workers")
    logger.debug(f"Maximum workers: {max_workers}")
    return max_workers
