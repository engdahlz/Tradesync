"""Firestore-backed session service for ADK."""

from __future__ import annotations

import time
from typing import Any, Optional

import firebase_admin
from firebase_admin import firestore
from google.adk.events import Event
from google.adk.sessions.base_session_service import BaseSessionService, GetSessionConfig, ListSessionsResponse
from google.adk.sessions.session import Session
from . import config
from .genai_client import summarize_conversation

SUMMARY_SKIP_AUTHORS = {
    'signals_research_agent',
    'technical_research_agent',
    'news_research_agent',
    'rag_research_agent',
    'memory_research_agent',
    'search_research_agent',
    'vertex_search_agent',
    'vertex_rag_agent',
}


def _ensure_firebase() -> None:
    if not firebase_admin._apps:
        firebase_admin.initialize_app()


def _serialize_event(event: Event) -> dict[str, Any]:
    return event.model_dump(by_alias=True, mode='json', exclude_none=True)


def _deserialize_event(raw: dict[str, Any]) -> Event:
    return Event.model_validate(raw)


def _get_timestamp_value(value: Any) -> float:
    if value is None:
        return time.time()
    if hasattr(value, 'timestamp'):
        return value.timestamp()
    if isinstance(value, (int, float)):
        return float(value)
    return time.time()


class FirestoreSessionService(BaseSessionService):
    def __init__(self) -> None:
        _ensure_firebase()
        self._db = firestore.client()

    async def create_session(
        self,
        *,
        app_name: str,
        user_id: str,
        state: Optional[dict[str, Any]] = None,
        session_id: Optional[str] = None,
    ) -> Session:
        session_id = session_id or f'session_{user_id}_{int(time.time() * 1000)}'
        session = Session(
            id=session_id,
            app_name=app_name,
            user_id=user_id,
            state=state or {},
            events=[],
            last_update_time=time.time(),
        )

        doc = session.model_dump(by_alias=True, mode='json', exclude_none=True)
        doc['lastUpdateTime'] = firestore.SERVER_TIMESTAMP
        self._db.collection('sessions').document(session_id).set(doc)
        return session

    async def get_session(
        self,
        *,
        app_name: str,
        user_id: str,
        session_id: str,
        config: Optional[GetSessionConfig] = None,
    ) -> Optional[Session]:
        doc_ref = self._db.collection('sessions').document(session_id)
        snapshot = doc_ref.get()
        if not snapshot.exists:
            return None
        data = snapshot.to_dict() or {}
        if data.get('userId') != user_id or data.get('appName') != app_name:
            return None

        raw_events = data.get('events') or []
        events = [_deserialize_event(e) for e in raw_events if isinstance(e, dict)]
        last_update = _get_timestamp_value(data.get('lastUpdateTime'))

        session = Session(
            id=data.get('id', session_id),
            app_name=data.get('appName', app_name),
            user_id=data.get('userId', user_id),
            state=data.get('state') or {},
            events=events,
            last_update_time=last_update,
        )

        if config:
            if config.after_timestamp is not None:
                session.events = [e for e in session.events if e.timestamp > config.after_timestamp]
            if config.num_recent_events:
                session.events = session.events[-config.num_recent_events :]

        return session

    async def list_sessions(self, *, app_name: str, user_id: Optional[str] = None) -> ListSessionsResponse:
        query = self._db.collection('sessions').where('appName', '==', app_name)
        if user_id:
            query = query.where('userId', '==', user_id)
        query = query.order_by('lastUpdateTime', direction=firestore.Query.DESCENDING)

        sessions = []
        for doc in query.stream():
            data = doc.to_dict() or {}
            sessions.append(
                Session(
                    id=data.get('id', doc.id),
                    app_name=data.get('appName', app_name),
                    user_id=data.get('userId', user_id or ''),
                    state={},
                    events=[],
                    last_update_time=_get_timestamp_value(data.get('lastUpdateTime')),
                )
            )
        return ListSessionsResponse(sessions=sessions)

    async def delete_session(self, *, app_name: str, user_id: str, session_id: str) -> None:
        doc_ref = self._db.collection('sessions').document(session_id)
        snapshot = doc_ref.get()
        if not snapshot.exists:
            return
        data = snapshot.to_dict() or {}
        if data.get('appName') == app_name and data.get('userId') == user_id:
            doc_ref.delete()

    async def append_event(self, session: Session, event: Event) -> Event:
        event = await super().append_event(session, event)
        if event.partial:
            return event

        session.last_update_time = time.time()
        await self._maybe_summarize_session(session, event)

        if config.SESSION_EVENT_LIMIT and len(session.events) > config.SESSION_EVENT_LIMIT:
            session.events = session.events[-config.SESSION_EVENT_LIMIT :]

        serialized_events = [_serialize_event(e) for e in session.events]
        self._db.collection('sessions').document(session.id).update({
            'events': serialized_events,
            'lastUpdateTime': firestore.SERVER_TIMESTAMP,
            'state': session.state or {},
        })

        return event

    async def update_session(self, *, app_name: str, user_id: str, session_id: str, state: dict[str, Any]) -> None:
        self._db.collection('sessions').document(session_id).update({
            'state': state,
            'lastUpdateTime': firestore.SERVER_TIMESTAMP,
        })

    async def _maybe_summarize_session(self, session: Session, event: Event) -> None:
        if not event.author or event.author == 'user':
            return
        if event.author in SUMMARY_SKIP_AUTHORS:
            return
        if not event.is_final_response():
            return

        trigger = config.SESSION_SUMMARY_TRIGGER or 40
        keep = config.SESSION_SUMMARY_KEEP or 12
        cooldown = config.SESSION_SUMMARY_COOLDOWN or 20

        if trigger <= 0 or keep <= 0 or len(session.events) <= trigger:
            return

        last_count_raw = session.state.get(config.SUMMARY_EVENT_COUNT_KEY, 0)
        try:
            last_count = int(last_count_raw)
        except (TypeError, ValueError):
            last_count = 0

        if len(session.events) < last_count + cooldown:
            return

        summary_events = session.events[: max(0, len(session.events) - keep)]
        existing_summary = session.state.get(config.SUMMARY_STATE_KEY, '')

        summary = summarize_conversation(summary_events, existing_summary if isinstance(existing_summary, str) else None)
        if not summary:
            return

        session.state = {
            **session.state,
            config.SUMMARY_STATE_KEY: summary,
            config.SUMMARY_EVENT_COUNT_KEY: len(session.events),
        }
        session.events = session.events[-keep:]
