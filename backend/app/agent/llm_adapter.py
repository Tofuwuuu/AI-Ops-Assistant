from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from typing import Any

from app.config import get_settings

logger = logging.getLogger(__name__)


class LLMAdapter(ABC):
    @abstractmethod
    def generate(self, messages: list[dict[str, str]], temperature: float = 0.2) -> str:
        raise NotImplementedError


class OpenAIAdapter(LLMAdapter):
    def __init__(self, api_key: str, model: str) -> None:
        from openai import OpenAI

        self.client = OpenAI(api_key=api_key)
        self.model = model

    def generate(self, messages: list[dict[str, str]], temperature: float = 0.2) -> str:
        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages,  # type: ignore[arg-type]
            temperature=temperature,
        )
        content = response.choices[0].message.content or ""
        return content.strip()


class GroqAdapter(LLMAdapter):
    """Groq's API is OpenAI-compatible — reuse the OpenAI SDK with a different base_url.
    Free tier, no credit card required: https://console.groq.com
    """

    def __init__(self, api_key: str, model: str) -> None:
        from openai import OpenAI

        self.client = OpenAI(api_key=api_key, base_url="https://api.groq.com/openai/v1")
        # Groq doesn't host OpenAI's gpt-* models — fall back to a solid free default
        # (llama-3.3-70b-versatile) if the configured model looks like an OpenAI one.
        self.model = model if not model.startswith("gpt-") else "llama-3.3-70b-versatile"

    def generate(self, messages: list[dict[str, str]], temperature: float = 0.2) -> str:
        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages,  # type: ignore[arg-type]
            temperature=temperature,
        )
        content = response.choices[0].message.content or ""
        return content.strip()


class AnthropicAdapter(LLMAdapter):
    def __init__(self, api_key: str, model: str) -> None:
        from anthropic import Anthropic

        self.client = Anthropic(api_key=api_key)
        # Map OpenAI-style default if user forgot to change model
        self.model = model if model.startswith("claude") else "claude-3-5-haiku-latest"

    def generate(self, messages: list[dict[str, str]], temperature: float = 0.2) -> str:
        system = ""
        chat_messages: list[dict[str, Any]] = []
        for msg in messages:
            if msg["role"] == "system":
                system = msg["content"]
            else:
                chat_messages.append({"role": msg["role"], "content": msg["content"]})
        response = self.client.messages.create(
            model=self.model,
            max_tokens=1024,
            temperature=temperature,
            system=system or "You are a helpful support assistant.",
            messages=chat_messages,
        )
        parts = [block.text for block in response.content if hasattr(block, "text")]
        return "\n".join(parts).strip()


class MockAdapter(LLMAdapter):
    """Offline fallback when no API key is configured — keeps the scaffold runnable."""

    def generate(self, messages: list[dict[str, str]], temperature: float = 0.2) -> str:
        user = next((m["content"] for m in reversed(messages) if m["role"] == "user"), "")
        lower = user.lower()
        # Prefer draft detection first — generate prompts also mention "category".
        if '"draft"' in lower or "draft reply" in lower or ("respond with json" in lower and "draft" in lower):
            if "ask_clarifying" in lower or "ask clarifying" in lower:
                return (
                    '{"draft":"Thanks for reaching out. To help you faster, could you share '
                    'which account email you use and when you last signed in successfully?",'
                    '"confidence":0.65}'
                )
            if "escalate" in lower:
                return (
                    '{"draft":"Thanks for reporting this. I have flagged it for a specialist '
                    'who will follow up shortly with next steps.",'
                    '"confidence":0.7}'
                )
            return (
                '{"draft":"Thanks for contacting support. Based on our docs, you can reset '
                "your password from Account Settings > Security > Reset password. Check your "
                'inbox for the reset link (valid 24 hours) and choose a new strong password.",'
                '"confidence":0.82}'
            )
        if "classify this support ticket" in lower or (
            "classify" in lower and "category" in lower and "confidence" in lower
        ):
            if any(w in lower for w in ("bill", "invoice", "payment", "refund")):
                return '{"category":"billing","confidence":0.85}'
            if any(w in lower for w in ("bug", "error", "crash", "broken")):
                return '{"category":"bug","confidence":0.8}'
            if any(w in lower for w in ("feature", "request", "wishlist", "enhancement")):
                return '{"category":"feature","confidence":0.75}'
            return '{"category":"how-to","confidence":0.7}'
        return (
            "Thank you for contacting support. We have received your request and a teammate "
            "will review this draft shortly."
        )


def get_llm_adapter() -> LLMAdapter:
    settings = get_settings()
    provider = settings.llm_provider.lower().strip()

    if provider == "openai":
        if not settings.openai_api_key or settings.openai_api_key.startswith("sk-your"):
            logger.warning("OPENAI_API_KEY missing/placeholder — using MockAdapter")
            return MockAdapter()
        return OpenAIAdapter(settings.openai_api_key, settings.llm_model)

    if provider == "anthropic":
        if not settings.anthropic_api_key or settings.anthropic_api_key.startswith("sk-ant-your"):
            logger.warning("ANTHROPIC_API_KEY missing/placeholder — using MockAdapter")
            return MockAdapter()
        return AnthropicAdapter(settings.anthropic_api_key, settings.llm_model)

    if provider == "groq":
        if not settings.groq_api_key or settings.groq_api_key.startswith("gsk_your"):
            logger.warning("GROQ_API_KEY missing/placeholder — using MockAdapter")
            return MockAdapter()
        return GroqAdapter(settings.groq_api_key, settings.llm_model)

    logger.warning("Unknown LLM_PROVIDER=%s — using MockAdapter", provider)
    return MockAdapter()
