"""Shared configuration values for TradeSync ADK (Python)."""

from __future__ import annotations

import os
from typing import Optional

from google.genai import types


def _parse_number(value: Optional[str], fallback: Optional[int] = None) -> Optional[int]:
    if value is None:
        return fallback
    try:
        parsed = int(value)
    except ValueError:
        return fallback
    return parsed


def _parse_float(value: Optional[str], fallback: Optional[float] = None) -> Optional[float]:
    if value is None:
        return fallback
    try:
        parsed = float(value)
    except ValueError:
        return fallback
    return parsed


MODEL_FLASH = os.getenv('MODEL_FLASH') or os.getenv('GEMINI_FLASH_MODEL') or 'gemini-3-flash-preview'
MODEL_PRO = os.getenv('MODEL_PRO') or os.getenv('GEMINI_PRO_MODEL') or 'gemini-3-pro-preview'
EMBEDDING_MODEL = os.getenv('EMBEDDING_MODEL') or 'gemini-embedding-001'
EMBEDDING_DIMENSION = _parse_number(os.getenv('EMBEDDING_DIMENSION'), 768)

ENABLE_GOOGLE_SEARCH = os.getenv('ENABLE_GOOGLE_SEARCH', 'true').lower() != 'false'

RESEARCH_STATE_KEYS = {
    'signals': 'app:research_signals',
    'technical': 'app:research_technical',
    'news': 'app:research_news',
    'rag': 'app:research_rag',
    'memory': 'app:research_memory',
    'search': 'app:research_search',
    'vertexSearch': 'app:research_vertex_search',
    'vertexRag': 'app:research_vertex_rag',
}

SUMMARY_STATE_KEY = 'app:summary'
MEMORY_EVENT_COUNT_KEY = 'app:memory_last_event_count'
SUMMARY_EVENT_COUNT_KEY = 'app:summary_last_event_count'

# Session summarization
SESSION_EVENT_LIMIT = _parse_number(os.getenv('SESSION_EVENT_LIMIT'), 50)
SESSION_SUMMARY_TRIGGER = _parse_number(os.getenv('SESSION_SUMMARY_TRIGGER'), 40)
SESSION_SUMMARY_KEEP = _parse_number(os.getenv('SESSION_SUMMARY_KEEP'), 12)
SESSION_SUMMARY_COOLDOWN = _parse_number(os.getenv('SESSION_SUMMARY_COOLDOWN'), 20)

# Memory service
MEMORY_CACHE_TTL_SECONDS = _parse_number(os.getenv('MEMORY_CACHE_TTL_SECONDS'), 120)
MEMORY_CACHE_MAX = _parse_number(os.getenv('MEMORY_CACHE_MAX'), 200)
MEMORY_SEARCH_LIMIT = _parse_number(os.getenv('MEMORY_SEARCH_LIMIT'), 5)
MEMORY_SUMMARY_WINDOW = _parse_number(os.getenv('MEMORY_SUMMARY_WINDOW'), 12)
MEMORY_SUMMARY_MIN_EVENTS = _parse_number(os.getenv('MEMORY_SUMMARY_MIN_EVENTS'), 6)
MEMORY_SAVE_EVERY_EVENTS = _parse_number(os.getenv('MEMORY_SAVE_EVERY_EVENTS'), 6)

# RAG cache
RAG_CACHE_TTL_SECONDS = _parse_number(os.getenv('RAG_CACHE_TTL_SECONDS'), 600)
RAG_CACHE_MAX = _parse_number(os.getenv('RAG_CACHE_MAX'), 200)

# Vertex AI Search / RAG
VERTEX_AI_SEARCH_DATASTORE_ID = os.getenv('VERTEX_AI_SEARCH_DATASTORE_ID')
VERTEX_AI_SEARCH_LOCATION = os.getenv('VERTEX_AI_SEARCH_LOCATION') or 'global'
VERTEX_AI_SEARCH_SERVING_CONFIG = os.getenv('VERTEX_AI_SEARCH_SERVING_CONFIG') or 'default_search'
VERTEX_AI_SEARCH_ENDPOINT = os.getenv('VERTEX_AI_SEARCH_ENDPOINT')
VERTEX_RAG_CORPUS_ID = os.getenv('VERTEX_RAG_CORPUS_ID')
VERTEX_RAG_LOCATION = os.getenv('VERTEX_RAG_LOCATION') or os.getenv('GOOGLE_CLOUD_LOCATION') or 'us-central1'
VERTEX_RAG_RETRIEVAL_ENDPOINT = os.getenv('VERTEX_RAG_RETRIEVAL_ENDPOINT')

# HTTP helper
FUNCTIONS_REGION = os.getenv('FUNCTIONS_REGION') or os.getenv('GCLOUD_REGION') or 'us-central1'
TS_FUNCTIONS_BASE_URL = os.getenv('TS_FUNCTIONS_BASE_URL')

# Safety + thinking
GENAI_SAFETY_DANGEROUS = os.getenv('GENAI_SAFETY_DANGEROUS')
GENAI_SAFETY_HARASSMENT = os.getenv('GENAI_SAFETY_HARASSMENT')
GENAI_SAFETY_HATE_SPEECH = os.getenv('GENAI_SAFETY_HATE_SPEECH')
GENAI_SAFETY_SEXUAL = os.getenv('GENAI_SAFETY_SEXUAL')
GENAI_THINKING_LEVEL = os.getenv('GENAI_THINKING_LEVEL')
GENAI_THINKING_BUDGET = _parse_number(os.getenv('GENAI_THINKING_BUDGET'))
GENAI_INCLUDE_THOUGHTS = os.getenv('GENAI_INCLUDE_THOUGHTS', 'false').lower() == 'true'
GENAI_FORCE_THINKING = os.getenv('GENAI_FORCE_THINKING', 'false').lower() == 'true'

GENAI_TEMPERATURE = _parse_float(os.getenv('GENAI_TEMPERATURE'))
GENAI_TEMPERATURE_FLASH = _parse_float(os.getenv('GENAI_TEMPERATURE_FLASH'))
GENAI_TEMPERATURE_PRO = _parse_float(os.getenv('GENAI_TEMPERATURE_PRO'))


def parse_thinking_level(value: Optional[str]) -> Optional[types.ThinkingLevel]:
    if not value:
        return None
    normalized = value.strip().upper()
    mapping = {
        'LOW': types.ThinkingLevel.LOW,
        'MEDIUM': types.ThinkingLevel.MEDIUM,
        'HIGH': types.ThinkingLevel.HIGH,
        'MINIMAL': types.ThinkingLevel.MINIMAL,
    }
    return mapping.get(normalized)


def parse_threshold(value: Optional[str]) -> Optional[types.HarmBlockThreshold]:
    if not value:
        return None
    normalized = value.strip().upper()
    mapping = {
        'BLOCK_LOW_AND_ABOVE': types.HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
        'BLOCK_MEDIUM_AND_ABOVE': types.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        'BLOCK_ONLY_HIGH': types.HarmBlockThreshold.BLOCK_ONLY_HIGH,
        'BLOCK_NONE': types.HarmBlockThreshold.BLOCK_NONE,
        'OFF': types.HarmBlockThreshold.OFF,
    }
    return mapping.get(normalized)


def model_supports_thinking(model_name: str) -> bool:
    lower = (model_name or '').lower()
    return 'pro' in lower or 'thinking' in lower
