from __future__ import annotations

import logging
from abc import ABC, abstractmethod

from app.config import get_settings

logger = logging.getLogger(__name__)


class EmailAdapter(ABC):
    @abstractmethod
    def send(self, *, to: str, subject: str, body: str) -> str:
        raise NotImplementedError


class MockEmailAdapter(EmailAdapter):
    def send(self, *, to: str, subject: str, body: str) -> str:
        msg_id = f"mock-email-{to}-{abs(hash(subject + body)) % 10_000_000}"
        logger.info("Mock email to=%s subject=%s id=%s", to, subject, msg_id)
        return msg_id


class SendGridEmailAdapter(EmailAdapter):
    def __init__(self, api_key: str) -> None:
        from sendgrid import SendGridAPIClient
        from sendgrid.helpers.mail import Mail

        self.client = SendGridAPIClient(api_key)
        self._Mail = Mail

    def send(self, *, to: str, subject: str, body: str) -> str:
        message = self._Mail(
            from_email="noreply@aiopsassistant.local",
            to_emails=to,
            subject=subject,
            plain_text_content=body,
        )
        response = self.client.send(message)
        return str(response.headers.get("X-Message-Id") or response.status_code)


def get_email_adapter() -> EmailAdapter:
    settings = get_settings()
    if not settings.sendgrid_api_key or settings.sendgrid_api_key.startswith("SG.your"):
        logger.warning("SENDGRID_API_KEY missing/placeholder — using MockEmailAdapter")
        return MockEmailAdapter()
    return SendGridEmailAdapter(settings.sendgrid_api_key)
