"""
In-process rate limiter — no Redis dependency for development.
Tracks request counts per IP per minute using a rolling window.
"""
from __future__ import annotations
import time
from collections import defaultdict, deque
from fastapi import Request
from app.core.errors import AppError


class RateLimitExceededError(AppError):
    def __init__(self, limit: int, window_seconds: int):
        super().__init__(
            code="RATE_LIMIT_EXCEEDED",
            message=f"Too many requests. Max {limit} per {window_seconds}s. Please slow down.",
            status_code=429,
        )


class InMemoryRateLimiter:
    """
    Sliding-window rate limiter.
    Thread-safe for asyncio (single-threaded event loop).
    """
    def __init__(self, max_requests: int = 10, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._buckets: dict[str, deque[float]] = defaultdict(deque)

    def check(self, key: str) -> None:
        """Raise RateLimitExceededError if the key has hit the limit."""
        now = time.monotonic()
        cutoff = now - self.window_seconds
        bucket = self._buckets[key]

        # Drop expired timestamps
        while bucket and bucket[0] < cutoff:
            bucket.popleft()

        if len(bucket) >= self.max_requests:
            raise RateLimitExceededError(self.max_requests, self.window_seconds)

        bucket.append(now)

    def reset(self, key: str) -> None:
        self._buckets.pop(key, None)

    def reset_all(self) -> None:
        """Clear all buckets — use in tests only."""
        self._buckets.clear()


# ── Shared limiters ───────────────────────────────────────────────────
login_limiter = InMemoryRateLimiter(max_requests=10, window_seconds=60)
preview_limiter = InMemoryRateLimiter(max_requests=5, window_seconds=60)


def get_client_ip(request: Request) -> str:
    """Extract the real client IP, respecting X-Forwarded-For from proxies."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"
