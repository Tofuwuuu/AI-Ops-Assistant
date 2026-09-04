from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "AI Ops Assistant"
    app_env: str = "development"
    log_level: str = "INFO"
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    llm_provider: str = "openai"  # openai | anthropic | groq
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    groq_api_key: str = ""
    llm_model: str = "gpt-4o-mini"

    database_url: str = "postgresql+psycopg://ops:ops@localhost:5432/ai_ops"
    redis_url: str = "redis://localhost:6379/0"
    agent_queue_key: str = "agent:queue"
    rate_limit_max: int = 30
    rate_limit_window_seconds: int = 60

    n8n_webhook_url: str = "http://localhost:5678/webhook/ops-assistant"
    n8n_webhook_secret: str = "change-me-n8n-secret"

    kb_docs_path: str = "../knowledge_base"

    # Auth
    jwt_secret_key: str = "change-me-jwt-secret-dev-only"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7

    # Email / SMS
    sendgrid_api_key: str = ""
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_from_number: str = ""
    campaign_queue_key: str = "campaign:queue"

    # Stripe
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_publishable_key: str = ""
    frontend_public_url: str = "http://localhost:5173"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def sqlalchemy_database_url(self) -> str:
        """Normalize managed-provider DATABASE_URLs (Render/Heroku give
        postgres:// or postgresql://) to the psycopg3 driver scheme we install."""
        url = self.database_url
        if url.startswith("postgres://"):
            return "postgresql+psycopg://" + url[len("postgres://") :]
        if url.startswith("postgresql://"):
            return "postgresql+psycopg://" + url[len("postgresql://") :]
        return url


@lru_cache
def get_settings() -> Settings:
    return Settings()
