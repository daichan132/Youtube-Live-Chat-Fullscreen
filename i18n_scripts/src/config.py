"""Configuration management for i18n scripts."""

import json
import os
from typing import Dict, List, Optional


def get_config_path() -> str:
    """Get the path to the config file."""
    return os.path.normpath(
        os.path.join(os.path.dirname(__file__), "..", "config.json")
    )


def load_config() -> Dict:
    """Load the config from the config file."""
    config_path = get_config_path()

    # Check if config file exists
    if not os.path.exists(config_path):
        raise FileNotFoundError(f"Config file not found at {config_path}")

    # Load the config
    with open(config_path, "r", encoding="utf-8") as f:
        return json.load(f)


def get_config_value(key: str, default: Optional[any] = None) -> any:
    """Get a value from the config."""
    config = load_config()
    return config.get(key, default)


def get_base_langs() -> List[str]:
    """Get the base languages from the config."""
    return get_config_value("base_langs", ["en", "ja"])


def get_locales_dir() -> str:
    """Get the locales directory from the config."""
    config_dir = get_config_value("locales_dir", "../../public/_locales")
    return os.path.normpath(os.path.join(os.path.dirname(__file__), "..", config_dir))


def get_assets_dir() -> str:
    """Get the assets directory from the config."""
    config_dir = get_config_value("assets_dir", "../../shared/i18n/assets")
    return os.path.normpath(os.path.join(os.path.dirname(__file__), "..", config_dir))


def get_lang_codes_file() -> str:
    """Get the language codes file from the config."""
    config_file = get_config_value(
        "lang_codes_file", "../../shared/i18n/language_codes.json"
    )
    return os.path.normpath(os.path.join(os.path.dirname(__file__), "..", config_file))


def get_max_workers() -> int:
    """Get the maximum number of workers from the config."""
    return get_config_value("max_workers", 3)
