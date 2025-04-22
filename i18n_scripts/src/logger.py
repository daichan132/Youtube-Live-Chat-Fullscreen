import logging
import sys

# Define log levels
NOTSET = logging.NOTSET
DEBUG = logging.DEBUG
INFO = logging.INFO
WARNING = logging.WARNING
ERROR = logging.ERROR
CRITICAL = logging.CRITICAL


# Configure the root logger
def configure_logger(name=None, level=logging.INFO):
    """
    Configure and return a logger with the given name and level.

    Args:
        name: The name of the logger. If None, returns the root logger.
        level: The log level to use (default: INFO)

    Returns:
        The configured logger instance
    """
    logger = logging.getLogger(name)
    logger.setLevel(level)

    # Remove existing handlers to avoid duplicates
    for handler in logger.handlers[:]:
        logger.removeHandler(handler)

    # Create console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(level)

    # Create formatter
    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    console_handler.setFormatter(formatter)

    # Add the handler to the logger
    logger.addHandler(console_handler)

    return logger


# Create default module-level logger
logger = configure_logger(__name__)


# Helper functions for common log levels
def debug(msg, *args, **kwargs):
    logger.debug(msg, *args, **kwargs)


def info(msg, *args, **kwargs):
    logger.info(msg, *args, **kwargs)


def warning(msg, *args, **kwargs):
    logger.warning(msg, *args, **kwargs)


def error(msg, *args, **kwargs):
    logger.error(msg, *args, **kwargs)


def critical(msg, *args, **kwargs):
    logger.critical(msg, *args, **kwargs)


def get_logger(name, level=logging.INFO):
    """
    Get a logger with the specified name and level.

    Args:
        name: The name of the logger
        level: The log level to use (default: INFO)

    Returns:
        Logger instance
    """
    return configure_logger(name, level)
