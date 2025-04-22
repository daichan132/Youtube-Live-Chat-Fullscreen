import logging
import sys

# Define log levels
NOTSET = logging.NOTSET
DEBUG = logging.DEBUG
INFO = logging.INFO
WARNING = logging.WARNING
ERROR = logging.ERROR
CRITICAL = logging.CRITICAL


class ColoredFormatter(logging.Formatter):
    # ANSI escape codes for colors
    COLORS = {
        "DEBUG": "\033[36m",  # Cyan
        "INFO": "\033[32m",  # Green
        "WARNING": "\033[33m",  # Yellow
        "ERROR": "\033[31m",  # Red
        "CRITICAL": "\033[41m\033[97m",  # White on Red background
        "RESET": "\033[0m",
    }

    def format(self, record: logging.LogRecord) -> str:
        levelname = record.levelname
        color = self.COLORS.get(levelname, self.COLORS["RESET"])
        reset = self.COLORS["RESET"]
        record.levelname = f"{color}{levelname}{reset}"
        record.msg = f"{color}{record.msg}{reset}"
        return super().format(record)


# Configure root logger
def setup_logger(level: int = logging.INFO) -> logging.Logger:
    """
    Set up and configure the root logger with colored console output.

    Args:
        level: The log level to use (default: INFO)

    Returns:
        The configured root logger
    """
    # Get the root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(level)

    # Remove existing handlers to avoid duplicates
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    # Create console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(level)

    # Create formatter
    formatter = ColoredFormatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    console_handler.setFormatter(formatter)

    # Add the handler to the logger
    root_logger.addHandler(console_handler)

    return root_logger


# Set up the root logger at module import time
setup_logger()

# Create a logger for this package that modules can import
logger = logging.getLogger("i18n_scripts")
