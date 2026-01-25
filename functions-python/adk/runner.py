"""ADK runner wiring for TradeSync (Python)."""

from __future__ import annotations

import time

from google.adk.artifacts.in_memory_artifact_service import InMemoryArtifactService
from google.adk.runners import Runner
from google.adk.sessions import Session

from .agents import trade_sync_orchestrator
from .firestore_memory_service import FirestoreMemoryService
from .firestore_session_service import FirestoreSessionService
from .plugin import TradeSyncPlugin

session_service = FirestoreSessionService()
memory_service = FirestoreMemoryService()
artifact_service = InMemoryArtifactService()

trade_sync_runner = Runner(
    app_name='TradeSync',
    agent=trade_sync_orchestrator,
    plugins=[TradeSyncPlugin()],
    session_service=session_service,
    artifact_service=artifact_service,
    memory_service=memory_service,
)


async def get_or_create_session(user_id: str, session_id: str | None = None) -> tuple[Session, bool]:
    sid = session_id or f'session_{user_id}_{int(time.time() * 1000)}'
    existing = await session_service.get_session(
        app_name='TradeSync',
        user_id=user_id,
        session_id=sid,
    )
    if existing:
        return existing, False

    session = await session_service.create_session(
        app_name='TradeSync',
        user_id=user_id,
        session_id=sid,
    )
    return session, True
