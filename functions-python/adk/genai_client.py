"""GenAI helper utilities for TradeSync ADK (Python)."""

from __future__ import annotations

import math
import os
from typing import Iterable, List, Optional

from google import genai
from google.genai import types

from . import config

_client: Optional[genai.Client] = None
_cached_safety_settings: Optional[List[types.SafetySetting]] = None
_warned_thinking_conflict = False


def get_genai_client() -> genai.Client:
    global _client
    if _client:
        return _client

    api_key = os.getenv('GOOGLE_API_KEY') or os.getenv('GOOGLE_AI_API_KEY')
    use_vertex = os.getenv('GOOGLE_GENAI_USE_VERTEXAI', 'false').lower() == 'true' or (
        not api_key and os.getenv('GOOGLE_CLOUD_PROJECT')
    )

    if use_vertex:
        project = os.getenv('GOOGLE_CLOUD_PROJECT') or os.getenv('GCLOUD_PROJECT')
        location = os.getenv('GOOGLE_CLOUD_LOCATION') or 'us-central1'
        if not project:
            raise RuntimeError('GOOGLE_CLOUD_PROJECT environment variable is required for Vertex AI')
        _client = genai.Client(vertexai=True, project=project, location=location)
    else:
        if not api_key:
            raise RuntimeError('GOOGLE_AI_API_KEY environment variable is required')
        _client = genai.Client(api_key=api_key, vertexai=False)

    return _client


def get_safety_settings() -> List[types.SafetySetting]:
    global _cached_safety_settings
    if _cached_safety_settings is not None:
        return _cached_safety_settings

    dangerous = config.parse_threshold(config.GENAI_SAFETY_DANGEROUS) or types.HarmBlockThreshold.BLOCK_LOW_AND_ABOVE
    harassment = config.parse_threshold(config.GENAI_SAFETY_HARASSMENT) or types.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
    hate_speech = config.parse_threshold(config.GENAI_SAFETY_HATE_SPEECH) or types.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
    sexual = config.parse_threshold(config.GENAI_SAFETY_SEXUAL) or types.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE

    _cached_safety_settings = [
        types.SafetySetting(category=types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold=dangerous),
        types.SafetySetting(category=types.HarmCategory.HARM_CATEGORY_HARASSMENT, threshold=harassment),
        types.SafetySetting(category=types.HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold=hate_speech),
        types.SafetySetting(category=types.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold=sexual),
    ]

    return _cached_safety_settings


def get_thinking_config(model_name: str) -> Optional[types.ThinkingConfig]:
    global _warned_thinking_conflict

    thinking_level = config.parse_thinking_level(config.GENAI_THINKING_LEVEL)
    thinking_budget = config.GENAI_THINKING_BUDGET
    include_thoughts = config.GENAI_INCLUDE_THOUGHTS

    if thinking_level is None and thinking_budget is None and not include_thoughts:
        return None

    if thinking_level and thinking_budget is not None and not _warned_thinking_conflict:
        _warned_thinking_conflict = True
        print('[GenAI] Both GENAI_THINKING_LEVEL and GENAI_THINKING_BUDGET are set; using thinking level.')

    if not config.model_supports_thinking(model_name) and not config.GENAI_FORCE_THINKING:
        return None

    if thinking_level:
        return types.ThinkingConfig(thinking_level=thinking_level, include_thoughts=include_thoughts)

    if thinking_budget is not None:
        return types.ThinkingConfig(thinking_budget=thinking_budget, include_thoughts=include_thoughts)

    return types.ThinkingConfig(include_thoughts=include_thoughts) if include_thoughts else None


def get_temperature_for_model(model_name: str, fallback: float) -> float:
    lower = (model_name or '').lower()
    if 'flash' in lower:
        return config.GENAI_TEMPERATURE_FLASH if config.GENAI_TEMPERATURE_FLASH is not None else fallback
    if 'pro' in lower:
        return config.GENAI_TEMPERATURE_PRO if config.GENAI_TEMPERATURE_PRO is not None else fallback
    return config.GENAI_TEMPERATURE if config.GENAI_TEMPERATURE is not None else fallback


def _normalize_embedding(values: Iterable[float]) -> List[float]:
    vector = [float(v) for v in values]
    norm = math.sqrt(sum(v * v for v in vector))
    if norm == 0:
        return vector
    return [v / norm for v in vector]


def generate_embedding(text: str, task_type: str) -> List[float]:
    client = get_genai_client()
    embed_config = types.EmbedContentConfig(
        task_type=task_type,
        output_dimensionality=config.EMBEDDING_DIMENSION if config.EMBEDDING_DIMENSION else None,
    )
    response = client.models.embed_content(
        model=config.EMBEDDING_MODEL,
        contents=text,
        config=embed_config,
    )
    values = response.embeddings[0].values if response.embeddings else []
    return _normalize_embedding(values)


def _extract_event_text(event) -> str:
    parts = event.content.parts if event.content else []
    text = ' '.join([part.text for part in parts if getattr(part, 'text', None)])
    if not text.strip():
        return ''
    author = event.author or 'agent'
    return f"{author.upper()}: {text.strip()}"


def summarize_conversation(events, existing_summary: str | None = None) -> str:
    lines = [
        _extract_event_text(event)
        for event in events
        if event.content and event.content.parts
    ]
    lines = [line for line in lines if line]

    if not lines:
        return existing_summary or ''

    prompt_parts = [
        'Summarize the conversation for future context.',
        'Focus on: user goals, risk tolerance, time horizon, assets discussed, decisions, constraints, and unresolved questions.',
        'Be concise and factual. Use short bullet points.',
    ]
    if existing_summary:
        prompt_parts.append(f"Existing summary:\n{existing_summary}")
    prompt_parts.append('Conversation:')
    prompt_parts.append('\n'.join(lines))

    prompt = '\n\n'.join(prompt_parts)

    client = get_genai_client()
    response = client.models.generate_content(
        model=config.MODEL_FLASH,
        contents=prompt,
        config=types.GenerateContentConfig(
            safety_settings=get_safety_settings(),
            temperature=get_temperature_for_model(config.MODEL_FLASH, 0.2),
        ),
    )

    text = response.text if hasattr(response, 'text') else ''
    if callable(text):
        text = text()
    return (text or '').strip()
