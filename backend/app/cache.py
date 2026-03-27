import hashlib
import threading
import time
from collections import OrderedDict
from dataclasses import dataclass


@dataclass
class CachedResponse:
    status_code: int
    media_type: str | None
    body: bytes
    etag: str
    expires_at: float


class ResponseCache:
    def __init__(self, ttl_seconds: int = 120, max_entries: int = 256):
        self.ttl_seconds = ttl_seconds
        self.max_entries = max_entries
        self._items: OrderedDict[str, CachedResponse] = OrderedDict()
        self._lock = threading.Lock()
        self._hits = 0
        self._misses = 0

    def get(self, key: str) -> CachedResponse | None:
        now = time.time()
        with self._lock:
            item = self._items.get(key)
            if item is None:
                self._misses += 1
                return None
            if item.expires_at <= now:
                self._items.pop(key, None)
                self._misses += 1
                return None
            self._items.move_to_end(key)
            self._hits += 1
            return item

    def set(self, key: str, status_code: int, media_type: str | None, body: bytes, etag: str) -> None:
        expires_at = time.time() + self.ttl_seconds
        value = CachedResponse(
            status_code=status_code,
            media_type=media_type,
            body=body,
            etag=etag,
            expires_at=expires_at,
        )
        with self._lock:
            self._items[key] = value
            self._items.move_to_end(key)
            self._evict()

    def _evict(self) -> None:
        now = time.time()
        expired_keys = [key for key, value in self._items.items() if value.expires_at <= now]
        for key in expired_keys:
            self._items.pop(key, None)
        while len(self._items) > self.max_entries:
            self._items.popitem(last=False)

    def stats(self) -> dict[str, int]:
        with self._lock:
            self._evict()
            return {
                "entries": len(self._items),
                "ttl_seconds": self.ttl_seconds,
                "max_entries": self.max_entries,
                "hits": self._hits,
                "misses": self._misses,
            }


def build_etag(content: bytes) -> str:
    digest = hashlib.sha256(content).hexdigest()
    return f"\"{digest}\""
