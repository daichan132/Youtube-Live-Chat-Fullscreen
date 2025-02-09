import json

from openai import OpenAI

client = OpenAI()


def get_lang_codes():
    with open("shared/i18n/language_codes.json", "r", encoding="utf-8") as f:
        return json.load(f)


def build_response_format(file_path: str) -> dict:
    """
    Reads a JSON file (e.g. ja.json) and returns a JSON response_format
    that reflects its structure. Designed for i18n file usage.
    """
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    def parse_value(value) -> dict:
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


def translate(text: str, target_language: str, response_format: dict) -> dict:
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "system",
                "content": f"I want to generate json data for i18n for an extension called YouTube Live Chat Fullscreen. Translate the following json into {target_language}",
            },
            {
                "role": "user",
                "content": text,
            },
        ],
        response_format=response_format,
    )

    return json.loads(response.choices[0].message.content)
