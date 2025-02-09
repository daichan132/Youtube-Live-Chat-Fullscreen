# Translation Scripts for YouTube Live Chat Fullscreen

These Python scripts automate translation for various JSON files.

## How to Use

1. Place your language codes in `shared/i18n/language_codes.json`.
2. Run the following commands to generate or update localized JSON files:

   ```bash
   cd path/to/your/project/translate
   python generate_locales.py
   ```

   ```bash
   cd path/to/your/project/translate
   python generate_i18n.py
   ```

   - `generate_locales.py` creates files under `public/_locales`.
   - `generate_i18n.py` creates files under `shared/i18n/assets`.

## Notes

- Install dependencies (e.g., openai) as listed in `pyproject.toml`.
- Ensure Python 3.12+ and valid OpenAI credentials.
