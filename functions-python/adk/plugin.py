"""Custom TradeSync ADK plugin (Python)."""

from __future__ import annotations

from typing import Any, Optional

from google.adk.plugins.base_plugin import BasePlugin
from google.adk.tools.base_tool import BaseTool
from google.adk.tools.tool_context import ToolContext
from google.genai import types

from . import config


class TradeSyncPlugin(BasePlugin):
    def __init__(self) -> None:
        super().__init__('tradesync')
        self._metrics = {
            'agent_invocations': 0,
            'model_calls': 0,
            'tool_calls': 0,
            'errors': 0,
        }

    async def on_user_message_callback(self, *, invocation_context, user_message: types.Content):
        text = ''
        if user_message.parts and hasattr(user_message.parts[0], 'text'):
            text = user_message.parts[0].text or ''
        print(f'[TradeSync] User: "{text[:100]}"')
        return None

    async def before_run_callback(self, *, invocation_context):
        session = invocation_context.session
        if session:
            session.state = {
                **session.state,
                config.RESEARCH_STATE_KEYS['signals']: '',
                config.RESEARCH_STATE_KEYS['technical']: '',
                config.RESEARCH_STATE_KEYS['news']: '',
                config.RESEARCH_STATE_KEYS['rag']: '',
                config.RESEARCH_STATE_KEYS['memory']: '',
                config.RESEARCH_STATE_KEYS['search']: '',
                config.RESEARCH_STATE_KEYS['vertexSearch']: '',
                config.RESEARCH_STATE_KEYS['vertexRag']: '',
            }
            service = invocation_context.session_service
            if hasattr(service, 'update_session'):
                await service.update_session(
                    app_name=session.app_name,
                    user_id=session.user_id,
                    session_id=session.id,
                    state=session.state,
                )
        return None

    async def before_agent_callback(self, *, agent, callback_context):
        self._metrics['agent_invocations'] += 1
        print(f"[TradeSync] Agent: {agent.name} (#{self._metrics['agent_invocations']})")
        return None

    async def after_agent_callback(self, *, agent, callback_context):
        print(f"[TradeSync] Agent done: {agent.name}")
        return None

    async def before_model_callback(self, *, callback_context, llm_request):
        self._metrics['model_calls'] += 1
        print(f"[TradeSync] Model call #{self._metrics['model_calls']}")
        return None

    async def after_model_callback(self, *, callback_context, llm_response):
        usage = getattr(llm_response, 'usage_metadata', None)
        if usage and getattr(usage, 'total_token_count', None):
            print(f"[TradeSync] Tokens: {usage.total_token_count}")
        return llm_response

    async def on_model_error_callback(self, *, callback_context, llm_request, error: Exception):
        self._metrics['errors'] += 1
        print(f"[TradeSync] Model error: {error}")
        return None

    async def before_tool_callback(self, *, tool: BaseTool, tool_args: dict[str, Any], tool_context: ToolContext):
        self._metrics['tool_calls'] += 1
        print(f"[TradeSync] Tool: {tool.name} ({str(tool_args)[:120]})")

        if tool.name != 'execute_trade':
            return None

        invocation_context = getattr(tool_context, '_invocation_context', None)
        session = invocation_context.session if invocation_context else tool_context.session
        service = invocation_context.session_service if invocation_context else None
        state = session.state if session else {}

        if not state.get('pendingTradeConfirmed'):
            if session and service and hasattr(service, 'update_session'):
                session.state = {
                    **state,
                    'pendingTrade': tool_args,
                    'awaitingConfirmation': True,
                }
                await service.update_session(
                    app_name=session.app_name,
                    user_id=session.user_id,
                    session_id=session.id,
                    state=session.state,
                )
            return {
                'blocked': True,
                'message': (
                    '⚠️ CONFIRM TRADE: Please confirm the execution of '
                    f"{tool_args.get('side')} {tool_args.get('quantity')} {tool_args.get('symbol')} "
                    f"@ {tool_args.get('price') or 'market'}. Respond with \"CONFIRM\" to proceed."
                ),
            }

        if session and service and hasattr(service, 'update_session'):
            new_state = {**state}
            new_state.pop('pendingTradeConfirmed', None)
            new_state.pop('pendingTrade', None)
            new_state.pop('awaitingConfirmation', None)
            session.state = new_state
            await service.update_session(
                app_name=session.app_name,
                user_id=session.user_id,
                session_id=session.id,
                state=session.state,
            )
        return None

    async def after_tool_callback(self, *, tool: BaseTool, tool_args: dict[str, Any], tool_context: ToolContext, result: Any):
        print(f"[TradeSync] Tool done: {tool.name}")
        return result

    async def on_tool_error_callback(self, *, tool: BaseTool, tool_args: dict[str, Any], tool_context: ToolContext, error: Exception):
        self._metrics['errors'] += 1
        print(f"[TradeSync] Tool error in {tool.name}: {error}")
        return {'error': True, 'message': str(error)}

    async def on_event_callback(self, *, invocation_context, event):
        return None

    async def after_run_callback(self, *, invocation_context):
        print(
            '[TradeSync] Run done - '
            f"Agents: {self._metrics['agent_invocations']}, "
            f"Models: {self._metrics['model_calls']}, "
            f"Tools: {self._metrics['tool_calls']}"
        )

        session = invocation_context.session
        memory_service = invocation_context.memory_service
        memory_every = config.MEMORY_SAVE_EVERY_EVENTS or 6
        if not session or not memory_service or memory_every <= 0:
            return

        event_count = len(session.events or [])
        last_count_raw = session.state.get(config.MEMORY_EVENT_COUNT_KEY, 0)
        try:
            last_count = int(last_count_raw)
        except (TypeError, ValueError):
            last_count = 0

        if event_count >= last_count + memory_every:
            try:
                await memory_service.add_session_to_memory(session)
                session.state = {
                    **session.state,
                    config.MEMORY_EVENT_COUNT_KEY: event_count,
                }
                service = invocation_context.session_service
                if hasattr(service, 'update_session'):
                    await service.update_session(
                        app_name=session.app_name,
                        user_id=session.user_id,
                        session_id=session.id,
                        state=session.state,
                    )
            except Exception as exc:
                print(f'[TradeSync] Memory save failed: {exc}')

    def reset_metrics(self) -> None:
        self._metrics = {
            'agent_invocations': 0,
            'model_calls': 0,
            'tool_calls': 0,
            'errors': 0,
        }
