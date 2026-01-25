"""Knowledge base search (RAG) via Firestore vector search."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, List

import firebase_admin
from firebase_admin import firestore
from google.cloud.firestore_v1.base_vector_query import DistanceMeasure

from . import config
from .cache import TtlCache
from .genai_client import generate_embedding


def _ensure_firebase() -> None:
    if not firebase_admin._apps:
        firebase_admin.initialize_app()


@dataclass
class ChunkResult:
    content: str
    metadata: dict[str, Any]
    similarity: float


_cache = TtlCache[List[ChunkResult]](
    max_size=config.RAG_CACHE_MAX or 200,
    ttl_seconds=config.RAG_CACHE_TTL_SECONDS or 600,
)


def search_knowledge(query: str, limit: int = 5) -> List[ChunkResult]:
    normalized_query = query.strip().lower()
    if not normalized_query:
        return []

    cache_key = f"{normalized_query}:{limit}"
    cached = _cache.get(cache_key)
    if cached is not None:
        return cached

    _ensure_firebase()
    db = firestore.client()

    try:
        vector = generate_embedding(query, 'RETRIEVAL_QUERY')
        collection = db.collection('rag_chunks')
        vector_query = collection.find_nearest(
            'embedding',
            vector,
            limit=limit,
            distance_measure=DistanceMeasure.COSINE,
            distance_result_field='_distance',
        )
        snapshot = vector_query.get()

        results: List[ChunkResult] = []
        for doc in snapshot:
            data = doc.to_dict() or {}
            distance = data.get('_distance') or data.get('distance')
            similarity = 1 - float(distance) if distance is not None else 0.0
            results.append(
                ChunkResult(
                    content=data.get('content', ''),
                    metadata=data.get('metadata') or {},
                    similarity=similarity,
                )
            )

        _cache.set(cache_key, results)
        return results
    except Exception as exc:  # pragma: no cover - network/runtime dependent
        print(f'[RAG] search failed: {exc}')
        return []
