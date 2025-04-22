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

## Available Commands

Use uv's command runner (`uvx`) to invoke the CLI:

- `uvx generate-locales`
  - Generate translated Chrome extension locale files under `_locales/`.
  - Usage:
    ```bash
uvx generate-locales \
  --base-langs en ja \
  --locales-dir path/to/_locales \
  --lang-codes-file path/to/language_codes.json \
  --max-workers 4
    ```

- `uvx generate-i18n`
  - Generate translated JSON i18n asset files under `shared/i18n/assets/`.
  - Usage:
    ```bash
uvx generate-i18n \
  --base-langs en ja \
  --assets-dir path/to/shared/i18n/assets \
  --lang-codes-file path/to/language_codes.json \
  --max-workers 4
    ```

## Configuration Options

Both commands support the following flags:

- `--base-langs`  : List of base language codes (primary first). Default: `en ja`.
- `--locales-dir` / `--assets-dir`: Path to the source or output directory for JSON files.
- `--lang-codes-file`: Path to the JSON file containing language codes and display names.
- `--max-workers` : Number of parallel translation workers. Default: `3`.

## License

This project is licensed under the terms of the GPL-3.0 license.
