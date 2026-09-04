from redis import Redis

from app.config import get_settings

_redis: Redis | None = None


def get_redis() -> Redis:
    global _redis
    if _redis is None:
        settings = get_settings()
        _redis = Redis.from_url(settings.redis_url, decode_responses=True)
    return _redis


def enqueue_ticket(ticket_id: str) -> None:
    settings = get_settings()
    get_redis().lpush(settings.agent_queue_key, ticket_id)


def check_rate_limit(client_key: str) -> bool:
    """Return True if request is allowed, False if rate limited."""
    settings = get_settings()
    r = get_redis()
    key = f"rate_limit:{client_key}"
    count = r.incr(key)
    if count == 1:
        r.expire(key, settings.rate_limit_window_seconds)
    return count <= settings.rate_limit_max
