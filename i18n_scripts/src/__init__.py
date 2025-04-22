"""
i18n-scripts package initialization.
Initializes settings at package import time.
"""

from src.config import init_settings

# Initialize settings when the package is imported
init_settings()
