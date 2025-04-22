# i18n-scripts

A small CLI toolset to generate and translate i18n JSON assets for Chrome extensions (or other web projects).

## Installation

Install using uv (https://github.com/astral-sh/uv):

```bash
# macOS/Linux
curl -LsSf https://astral.sh/uv/install.sh | sh
# Windows
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
# pip
pip install uv
# Homebrew
brew install uv
# Cargo
cargo install --git https://github.com/astral-sh/uv uv
```

Install project dependencies and sync the virtual environment:

```bash
uv sync
```

## Configuration

The scripts are configured using the `config.json` file in the root of the i18n_scripts directory. Here's an example configuration:

```json
{
  "base_langs": ["en", "ja"],
  "locales_dir": "../../public/_locales",
  "assets_dir": "../../shared/i18n/assets",
  "lang_codes_file": "../../shared/i18n/language_codes.json",
  "max_workers": 3
}
```

Configuration options:

- `base_langs`: List of base language codes (primary first). Default: `["en", "ja"]`.
- `locales_dir`: Path to the Chrome extension locales directory for JSON files.
- `assets_dir`: Path to the i18n assets directory for JSON files.
- `lang_codes_file`: Path to the JSON file containing language codes and display names.
- `max_workers`: Number of parallel translation workers. Default: `3`.

If the configuration file doesn't exist, a default one will be created automatically when running the scripts.

## Available Commands

Run the scripts using `uv run python`:

- Generate translated Chrome extension locale files:
  ```bash
  uv run python -m src.generate_locales
  ```

- Generate translated JSON i18n asset files:
  ```bash
  uv run python -m src.generate_i18n
  ```

## How It Works

Both scripts will:
1. Read settings from `config.json`
2. Combine content from base languages (`en` and `ja` by default)
3. Translate to all languages defined in the language codes file
4. Save translated files to the appropriate directories

## License

This project is licensed under the terms of the GPL-3.0 license.
