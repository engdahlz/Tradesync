"""HTTP handlers for TradeSync ADK (Python)."""

from __future__ import annotations

import json
from typing import Any, Dict, Iterable, List

import asyncio

from firebase_functions import https_fn, options
from flask import stream_with_context
from google.adk.events import Event
from google.genai import types

from .runner import trade_sync_runner, get_or_create_session


def _format_history(history: List[Dict[str, str]]) -> str:
    trimmed = history[-12:]
    return '\n'.join([f"{item['role'].upper()}: {item['content']}" for item in trimmed])


def _extract_sources_from_response(response: types.FunctionResponse) -> List[Dict[str, Any]]:
    payload = response.response or {}
    if isinstance(payload, dict) and 'output' in payload:
        payload = payload.get('output') or {}

    sources: List[Dict[str, Any]] = []

    if response.name == 'search_knowledge_base':
        chunks = payload.get('chunks') if isinstance(payload, dict) else []
        if isinstance(chunks, list):
            for chunk in chunks:
                content = chunk.get('content') if isinstance(chunk, dict) else ''
                excerpt = (content or '')[:240]
                if not excerpt:
                    continue
                sources.append({
                    'title': chunk.get('source', 'Unknown Source'),
                    'sourceType': chunk.get('sourceType', 'rag'),
                    'excerpt': excerpt,
                    'score': chunk.get('score'),
                    'page': chunk.get('page'),
                })

    if response.name == 'vertex_ai_search':
        results = payload.get('results') if isinstance(payload, dict) else []
        if isinstance(results, list):
            for item in results:
                snippet = item.get('snippet', '') if isinstance(item, dict) else ''
                snippet = snippet[:240]
                if not snippet:
                    continue
                sources.append({
                    'title': item.get('title', 'Vertex Search Result'),
                    'sourceType': 'vertex_search',
                    'excerpt': snippet,
                    'score': item.get('score'),
                })

    if response.name == 'vertex_ai_rag_retrieval':
        chunks = payload.get('chunks') if isinstance(payload, dict) else []
        if isinstance(chunks, list):
            for chunk in chunks:
                content = chunk.get('content', '') if isinstance(chunk, dict) else ''
                excerpt = content[:240]
                if not excerpt:
                    continue
                sources.append({
                    'title': chunk.get('source', 'Vertex RAG'),
                    'sourceType': 'vertex_rag',
                    'excerpt': excerpt,
                    'score': chunk.get('score'),
                })

    return sources


def _dedupe_sources(sources: List[Dict[str, Any]], limit: int = 5) -> List[Dict[str, Any]]:
    by_title: Dict[str, Dict[str, Any]] = {}
    for source in sources:
        title = source.get('title') or 'Unknown'
        existing = by_title.get(title)
        if not existing or (source.get('score') or 0) > (existing.get('score') or 0):
            by_title[title] = source
    sorted_sources = sorted(by_title.values(), key=lambda s: s.get('score') or 0, reverse=True)
    return sorted_sources[:limit]


def _collect_agent_text(user_id: str, session_id: str, prompt: str) -> tuple[str, List[Dict[str, Any]]]:
    text = ''
    sources: List[Dict[str, Any]] = []
    for event in trade_sync_runner.run(
        user_id=user_id,
        session_id=session_id,
        new_message=types.Content(role='user', parts=[types.Part(text=prompt)]),
    ):
        if event.content and event.content.parts:
            for part in event.content.parts:
                if getattr(part, 'text', None):
                    text += part.text
                if part.function_call:
                    pass
        for response in event.get_function_responses():
            sources.extend(_extract_sources_from_response(response))
    return text, _dedupe_sources(sources)


@https_fn.on_request(cors=options.CorsOptions(cors_origins="*", cors_methods=["post"]))
def advisorChatPy(request: https_fn.Request) -> https_fn.Response:
    payload = request.get_json(silent=True) or {}
    message = payload.get('message')
    if not message:
        return https_fn.Response(
            json.dumps({'error': 'Missing message'}),
            status=400,
            headers={'Content-Type': 'application/json'},
        )

    user_id = payload.get('userId') or 'anonymous'
    session_id = payload.get('sessionId')
    conversation_history = payload.get('conversationHistory') or []

    session, is_new = asyncio.run(get_or_create_session(user_id, session_id))
    history_text = _format_history(conversation_history) if is_new and conversation_history else ''
    prompt = f"Conversation so far:\n{history_text}\n\nUSER: {message}" if history_text else message

    text, sources = _collect_agent_text(user_id, session.id, prompt)
    return https_fn.Response(
        json.dumps({'response': text, 'sources': sources, 'sessionId': session.id}),
        headers={'Content-Type': 'application/json'},
    )


@https_fn.on_request(cors=options.CorsOptions(cors_origins="*", cors_methods=["post"]))
def advisorChatStreamPy(request: https_fn.Request) -> https_fn.Response:
    payload = request.get_json(silent=True) or {}
    message = payload.get('message')
    if not message:
        return https_fn.Response(
            json.dumps({'error': 'Missing message'}),
            status=400,
            headers={'Content-Type': 'application/json'},
        )

    user_id = payload.get('userId') or 'anonymous'
    session_id = payload.get('sessionId')
    conversation_history = payload.get('conversationHistory') or []

    session, is_new = asyncio.run(get_or_create_session(user_id, session_id))
    history_text = _format_history(conversation_history) if is_new and conversation_history else ''
    prompt = f"Conversation so far:\n{history_text}\n\nUSER: {message}" if history_text else message

    def event_stream():
        sources: List[Dict[str, Any]] = []
        for event in trade_sync_runner.run(
            user_id=user_id,
            session_id=session.id,
            new_message=types.Content(role='user', parts=[types.Part(text=prompt)]),
        ):
            if event.content and event.content.parts:
                for part in event.content.parts:
                    if getattr(part, 'text', None):
                        yield f"event: text\ndata: {json.dumps(part.text)}\n\n"
                    if part.function_call:
                        yield f"event: function_call\ndata: {json.dumps({'name': part.function_call.name, 'args': part.function_call.args})}\n\n"

            for response in event.get_function_responses():
                sources.extend(_extract_sources_from_response(response))

        yield f"event: sources\ndata: {json.dumps(_dedupe_sources(sources))}\n\n"
        yield "event: done\ndata: {}\n\n"

    return https_fn.Response(
        stream_with_context(event_stream()),
        headers={
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
        },
    )
