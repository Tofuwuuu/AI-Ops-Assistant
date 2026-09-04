from __future__ import annotations

import logging
from abc import ABC, abstractmethod

from app.config import get_settings

logger = logging.getLogger(__name__)


class SmsAdapter(ABC):
    @abstractmethod
    def send(self, *, to: str, body: str) -> str:
        raise NotImplementedError


class MockSmsAdapter(SmsAdapter):
    def send(self, *, to: str, body: str) -> str:
        msg_id = f"mock-sms-{to}-{abs(hash(body)) % 10_000_000}"
        logger.info("Mock SMS to=%s id=%s", to, msg_id)
        return msg_id


class TwilioSmsAdapter(SmsAdapter):
    def __init__(self, account_sid: str, auth_token: str, from_number: str) -> None:
        from twilio.rest import Client

        self.client = Client(account_sid, auth_token)
        self.from_number = from_number

    def send(self, *, to: str, body: str) -> str:
        message = self.client.messages.create(to=to, from_=self.from_number, body=body)
        return message.sid


def get_sms_adapter() -> SmsAdapter:
    settings = get_settings()
    if (
        not settings.twilio_account_sid
        or not settings.twilio_auth_token
        or not settings.twilio_from_number
        or settings.twilio_account_sid.startswith("ACyour")
    ):
        logger.warning("Twilio credentials missing/placeholder — using MockSmsAdapter")
        return MockSmsAdapter()
    return TwilioSmsAdapter(
        settings.twilio_account_sid,
        settings.twilio_auth_token,
        settings.twilio_from_number,
    )
