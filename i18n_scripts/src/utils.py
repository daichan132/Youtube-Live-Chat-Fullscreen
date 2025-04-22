"""Utility functions for i18n scripts."""

from concurrent.futures import ProcessPoolExecutor, as_completed
from typing import Any, Callable, Dict, Optional

from src.logger import get_logger

# Create a logger for this module
logger = get_logger(__name__)


def process_translations(
    lang_codes: Dict[str, str],
    translate_func: Callable[[str, str], Any],
    settings,
    max_workers: Optional[int] = None,
) -> None:
    """
    Process all translations in parallel with limited concurrency

    Args:
        lang_codes: Dictionary of language codes and names
        translate_func: Function to translate a single language
        settings: Settings instance
        max_workers: Maximum number of concurrent workers (default: from settings)
    """
    if max_workers is None:
        max_workers = settings.max_workers

    base_langs = settings.base_langs
    logger.info(f"Starting translations with {max_workers} concurrent workers...")
    with ProcessPoolExecutor(max_workers=max_workers) as executor:
        # Submit all translation tasks
        future_to_lang = {
            executor.submit(translate_func, lang_code, lang_name): (
                lang_code,
                lang_name,
            )
            for lang_code, lang_name in lang_codes.items()
        }

        # Process results as they complete
        for future in as_completed(future_to_lang):
            lang_code, lang_name = future_to_lang[future]
            if lang_code in base_langs:
                logger.info(f"Skipping base language: {lang_name} ({lang_code})")
                continue
            try:
                result_code, result_language = future.result()
                logger.info(
                    f"✅ Completed translation for {result_language} ({result_code})"
                )
            except Exception as exc:
                logger.error(
                    f"❌ Translation for {lang_name} ({lang_code}) failed: {exc}"
                )
                logger.error(f"   Error: {str(exc)}")
