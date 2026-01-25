"""Firestore-backed memory service for ADK."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

import firebase_admin
from firebase_admin import firestore
from google.adk.memory.base_memory_service import BaseMemoryService, SearchMemoryResponse
from google.adk.memory.memory_entry import MemoryEntry
from google.adk.sessions import Session
from google.cloud.firestore_v1 import FieldFilter
from google.cloud.firestore_v1.base_vector_query import DistanceMeasure
from google.cloud.firestore_v1.vector import Vector

from . import config
from .cache import TtlCache
from .genai_client import generate_embedding, summarize_conversation


def _ensure_firebase() -> None:
    if not firebase_admin._apps:
        firebase_admin.initialize_app()


def _scope_key(app_name: str, user_id: str) -> str:
    return f"{app_name}:{user_id}"


class FirestoreMemoryService(BaseMemoryService):
    def __init__(self) -> None:
        _ensure_firebase()
        self._db = firestore.client()
        ttl_seconds = config.MEMORY_CACHE_TTL_SECONDS or 120
        max_size = config.MEMORY_CACHE_MAX or 200
        self._cache = TtlCache[SearchMemoryResponse](max_size=max_size, ttl_seconds=ttl_seconds)

    async def add_session_to_memory(self, session: Session):
        events = session.events or []
        min_events = config.MEMORY_SUMMARY_MIN_EVENTS or 6
        if len(events) < min_events:
            return

        window = config.MEMORY_SUMMARY_WINDOW or 12
        window_events = events[-window:] if window > 0 else events
        summary = summarize_conversation(window_events)
        if not summary:
            return

        embedding = generate_embedding(summary, 'RETRIEVAL_DOCUMENT')
        scope = _scope_key(session.app_name, session.user_id)
        timestamp = datetime.now(timezone.utc).isoformat()

        self._db.collection('memories').add({
            'appName': session.app_name,
            'userId': session.user_id,
            'scopeKey': scope,
            'content': summary,
            'embedding': Vector(embedding),
            'timestamp': timestamp,
            'createdAt': firestore.SERVER_TIMESTAMP,
        })

    async def search_memory(self, *, app_name: str, user_id: str, query: str) -> SearchMemoryResponse:
        query = query.strip()
        if not query:
            return SearchMemoryResponse(memories=[])

        scope = _scope_key(app_name, user_id)
        cache_key = f"{scope}:{query.lower()}"
        cached = self._cache.get(cache_key)
        if cached:
            return cached

        try:
            vector = generate_embedding(query, 'RETRIEVAL_QUERY')
            base_query = self._db.collection('memories').where(
                filter=FieldFilter('scopeKey', '==', scope)
            )
            vector_query = base_query.find_nearest(
                'embedding',
                vector,
                limit=config.MEMORY_SEARCH_LIMIT or 5,
                distance_measure=DistanceMeasure.COSINE,
                distance_result_field='_distance',
            )
            snapshot = vector_query.get()

            memories = []
            for doc in snapshot:
                data = doc.to_dict() or {}
                content = data.get('content', '')
                if not content:
                    continue
                memories.append(
                    MemoryEntry(
                        content={
                            'role': 'assistant',
                            'parts': [{'text': content}],
                        },
                        author='memory',
                        timestamp=data.get('timestamp') or '',
                    )
                )

            response = SearchMemoryResponse(memories=memories)
            self._cache.set(cache_key, response)
            return response
        except Exception as exc:  # pragma: no cover - network/runtime dependent
            print(f'[Memory] search failed: {exc}')
            return SearchMemoryResponse(memories=[])
