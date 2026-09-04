from __future__ import annotations

import logging

from app.config import get_settings

logger = logging.getLogger(__name__)


def create_checkout_session(
    *,
    invoice_id: str,
    amount: float,
    currency: str,
    description: str,
    success_url: str,
    cancel_url: str,
) -> tuple[str | None, str | None, str | None]:
    """Returns (session_id, checkout_url, payment_intent_id). Uses mock when no Stripe key."""
    settings = get_settings()
    if not settings.stripe_secret_key or settings.stripe_secret_key.startswith("sk_test_your"):
        session_id = f"cs_mock_{invoice_id}"
        url = f"{settings.frontend_public_url}/invoices?paid={invoice_id}&mock=1"
        logger.warning("STRIPE_SECRET_KEY missing — mock checkout url=%s", url)
        return session_id, url, f"pi_mock_{invoice_id}"

    import stripe

    stripe.api_key = settings.stripe_secret_key
    session = stripe.checkout.Session.create(
        mode="payment",
        success_url=success_url,
        cancel_url=cancel_url,
        line_items=[
            {
                "price_data": {
                    "currency": currency,
                    "product_data": {"name": description or "Invoice"},
                    "unit_amount": int(round(amount * 100)),
                },
                "quantity": 1,
            }
        ],
        metadata={"invoice_id": invoice_id},
    )
    return session.id, session.url, session.payment_intent


def verify_webhook(payload: bytes, sig_header: str) -> dict:
    settings = get_settings()
    if not settings.stripe_webhook_secret or settings.stripe_webhook_secret.startswith("whsec_your"):
        import json

        return json.loads(payload.decode("utf-8"))

    import stripe

    stripe.api_key = settings.stripe_secret_key
    event = stripe.Webhook.construct_event(payload, sig_header, settings.stripe_webhook_secret)
    return event
