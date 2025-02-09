import json
import os

from utils import build_response_format, get_lang_codes, translate

base_language = "en"


def main():
    lang_codes = get_lang_codes()
    for code, language in lang_codes.items():
        print(f"Translating to {language} ({code})...")
        script_dir = os.path.dirname(os.path.abspath(__file__))
        source_path = os.path.join(
            script_dir, "..", "shared", "i18n", "assets", f"{base_language}.json"
        )
        target_path = os.path.join(
            script_dir, "..", "shared", "i18n", "assets", f"{code}.json"
        )

        schema = build_response_format(source_path)
        with open(source_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        translated_data = translate(
            json.dumps(data, ensure_ascii=False), language, schema
        )

        with open(target_path, "w", encoding="utf-8") as f:
            json.dump(translated_data, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()
