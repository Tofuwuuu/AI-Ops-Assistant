from __future__ import annotations

import re
from dataclasses import dataclass


SECRET_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("aws_access_key", re.compile(r"AKIA[0-9A-Z]{16}")),
    ("generic_api_key", re.compile(r"(?i)(api[_-]?key|secret|token)\s*[:=]\s*['\"]?[A-Za-z0-9_\-]{20,}")),
    ("private_key", re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----")),
    ("openai_key", re.compile(r"sk-[A-Za-z0-9]{20,}")),
    ("anthropic_key", re.compile(r"sk-ant-[A-Za-z0-9\-]{20,}")),
]

TOXIC_TERMS = {
    "idiot",
    "stupid",
    "hate you",
    "kill yourself",
    "dumbass",
}


@dataclass
class ValidationResult:
    ok: bool
    reasons: list[str]


def validate_draft(draft: str) -> ValidationResult:
    reasons: list[str] = []
    text = (draft or "").strip()

    if not text:
        reasons.append("empty_answer")
    elif len(text) < 20:
        reasons.append("too_short")

    for name, pattern in SECRET_PATTERNS:
        if pattern.search(text):
            reasons.append(f"secret_detected:{name}")

    lower = text.lower()
    for term in TOXIC_TERMS:
        if term in lower:
            reasons.append(f"toxicity:{term}")
            break

    return ValidationResult(ok=len(reasons) == 0, reasons=reasons)
