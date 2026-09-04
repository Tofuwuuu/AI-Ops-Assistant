import logging
from typing import Any

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)


def notify_n8n(payload: dict[str, Any]) -> bool:
    """POST ticket result to n8n webhook. Returns True on success."""
    settings = get_settings()
    url = settings.n8n_webhook_url
    if not url:
        logger.warning("N8N_WEBHOOK_URL not set; skipping handoff webhook")
        return False

    headers = {
        "Content-Type": "application/json",
        "X-Webhook-Secret": settings.n8n_webhook_secret,
    }
    try:
        with httpx.Client(timeout=15.0) as client:
            resp = client.post(url, json=payload, headers=headers)
            if resp.status_code >= 400:
                logger.warning("n8n webhook returned %s: %s", resp.status_code, resp.text[:200])
                return False
            logger.info("n8n webhook accepted ticket %s", payload.get("ticket_id"))
            return True
    except Exception as exc:  # noqa: BLE001
        logger.warning("n8n webhook failed: %s", exc)
        return False
