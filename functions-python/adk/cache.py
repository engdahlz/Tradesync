"""Simple TTL cache for ADK helpers."""

from __future__ import annotations

import time
from collections import OrderedDict
from dataclasses import dataclass
from typing import Generic, Optional, TypeVar

T = TypeVar('T')


@dataclass
class _CacheEntry(Generic[T]):
    value: T
    expires_at: float


class TtlCache(Generic[T]):
    def __init__(self, *, max_size: int = 200, ttl_seconds: int = 120) -> None:
        self._max_size = max(1, max_size)
        self._ttl_seconds = max(1, ttl_seconds)
        self._data: OrderedDict[str, _CacheEntry[T]] = OrderedDict()

    def get(self, key: str) -> Optional[T]:
        entry = self._data.get(key)
        if not entry:
            return None
        if entry.expires_at < time.time():
            self._data.pop(key, None)
            return None
        self._data.move_to_end(key)
        return entry.value

    def set(self, key: str, value: T) -> None:
        expires_at = time.time() + self._ttl_seconds
        self._data[key] = _CacheEntry(value=value, expires_at=expires_at)
        self._data.move_to_end(key)
        while len(self._data) > self._max_size:
            self._data.popitem(last=False)
