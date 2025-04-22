# i18n-scripts

A small CLI toolset to generate and translate i18n JSON assets for Chrome extensions and other web projects using the OpenAI API.

## Prerequisites

- Python 3.13 or later
- [uv](https://github.com/astral-sh/uv) (Python package installer and virtual environment manager)
- An OpenAI API key set as an environment variable (`OPENAI_API_KEY`).

## Installation

1.  **Install uv** (if you haven't already):
    Follow the instructions for your OS at [https://github.com/astral-sh/uv](https://github.com/astral-sh/uv). Examples:
    ```bash
    # macOS/Linux
    curl -LsSf https://astral.sh/uv/install.sh | sh
    # Windows (PowerShell)
    powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
    # pip
    pip install uv
    # Homebrew
    brew install uv
    ```

2.  **Install project dependencies:**
    Navigate to the `i18n_scripts` directory in your terminal and run:
    ```bash
    uv sync
    ```
    This command installs the required Python packages into a virtual environment managed by `uv`.

## Configuration

The scripts are configured using the `config.json` file located in the root of the `i18n_scripts` directory. If this file doesn't exist when you first run a script, it will be created automatically with default values.

Configuration is managed using Pydantic for validation.

**Default `config.json`:**

```json
{
  "base_langs": ["en", "ja"],
  "locales_dir": "../public/_locales",
  "assets_dir": "../shared/i18n/assets",
  "lang_codes_file": "../shared/i18n/language_codes.json",
  "max_workers": 3,
  "openai_model": "gpt-4.1-2025-04-14"
}
```

**Configuration Options:**

-   `base_langs` (List[str]): A list of language codes (e.g., "en", "ja") that serve as the source languages for translations. The content from files corresponding to these languages will be combined and sent to the OpenAI API.
-   `locales_dir` (str): The relative path from the `i18n_scripts` directory to the Chrome extension's `_locales` directory. This is used when translating Chrome-specific locale files (`messages.json`).
-   `assets_dir` (str): The relative path from the `i18n_scripts` directory to the general i18n assets directory. This is used when translating standard i18n JSON files (e.g., `en.json`, `ja.json`).
-   `lang_codes_file` (str): The relative path from the `i18n_scripts` directory to a JSON file containing the target language codes and their display names (e.g., `{"es": "Spanish", "fr": "French"}`). The script will generate translations for all languages listed in this file, excluding the `base_langs`.
-   `max_workers` (int): The maximum number of translation tasks to run in parallel. Adjust based on your system resources and OpenAI API rate limits. Must be at least 1.
-   `openai_model` (str): The specific OpenAI model ID to use for the translation task.

**Note on Paths:** All paths specified in `config.json` are relative to the `i18n_scripts` directory itself.

## Usage

Run the translation commands from within the `i18n_scripts` directory using `uv run python`.

**1. Translate Chrome Extension Locales:**

This command translates the `messages.json` files found within language-specific subdirectories inside the `locales_dir`.

```bash
uv run python -m src.cli --type locales
```

**2. Translate General i18n Assets:**

This command translates JSON files named like `[lang_code].json` (e.g., `en.json`) found directly within the `assets_dir`.

```bash
uv run python -m src.cli --type i18n
```

## License

This project is licensed under the terms of the GPL-3.0 license.
