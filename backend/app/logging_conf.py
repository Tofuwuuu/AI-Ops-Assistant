import json
import logging
import re
from typing import Any

from app.config import get_settings

SENSITIVE_KEY_RE = re.compile(r"(key|secret|token|password|authorization|api_key)", re.IGNORECASE)
REDACTED = "***REDACTED***"


def redact_value(key: str, value: Any) -> Any:
    if SENSITIVE_KEY_RE.search(str(key)):
        return REDACTED
    if isinstance(value, dict):
        return redact_dict(value)
    if isinstance(value, list):
        return [redact_value(key, item) for item in value]
    return value


def redact_dict(data: dict[str, Any] | None) -> dict[str, Any]:
    if not data:
        return {}
    return {k: redact_value(k, v) for k, v in data.items()}


class RedactingFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        if isinstance(record.msg, dict):
            record.msg = json.dumps(redact_dict(record.msg))
        elif isinstance(record.args, dict):
            record.args = redact_dict(record.args)
        return super().format(record)


def setup_logging() -> None:
    settings = get_settings()
    root = logging.getLogger()
    root.setLevel(settings.log_level.upper())
    handler = logging.StreamHandler()
    handler.setFormatter(
        RedactingFormatter("%(asctime)s | %(levelname)s | %(name)s | %(message)s")
    )
    root.handlers.clear()
    root.addHandler(handler)
