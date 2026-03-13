"""
OpenClaw Gateway integration for OnyxFire chat.

Streams chat responses from an OpenClaw gateway WebSocket and yields them
as OnyxFire Packet objects compatible with the existing streaming format.
"""
import json
import uuid
from collections.abc import AsyncGenerator

from websockets.asyncio.client import connect

from onyx.server.query_and_chat.placement import Placement
from onyx.server.query_and_chat.streaming_models import (
    AgentResponseDelta,
    AgentResponseStart,
    OverallStop,
    Packet,
)
from onyx.utils.logger import setup_logger

logger = setup_logger()

_DEFAULT_PLACEMENT = Placement(turn_index=0, tab_index=0)


async def stream_from_openclaw(
    message: str,
    session_key: str,
    gateway_url: str,
    token: str,
) -> AsyncGenerator[Packet, None]:
    """
    Connect to an OpenClaw gateway WebSocket, send a chat message, and yield
    OnyxFire Packet objects as the response streams in.

    Protocol:
    1. Connect → receive connect.challenge event
    2. Send connect request with token auth → wait for res with matching id
    3. Send chat.send request → wait for res with matching id
    4. Receive chat events with state=delta (cumulative text) and state=final
    5. Yield AgentResponseStart, AgentResponseDelta (diffs), OverallStop

    Background events (tick, agent, health) are skipped during handshake.
    ping_interval=None disables websockets keepalive so long responses don't time out.
    """
    instance_id = str(uuid.uuid4())
    connect_id = str(uuid.uuid4())
    chat_id = str(uuid.uuid4())
    idempotency_key = str(uuid.uuid4())

    # ping_interval=None disables the websockets keepalive ping so long-running
    # OpenClaw responses don't cause the connection to be dropped.
    async with connect(gateway_url, ping_interval=None) as ws:
        # ── Step 1: wait for the connect.challenge event ──────────────────────
        async for raw in ws:
            msg = json.loads(raw)
            if msg.get("type") == "event" and msg.get("event") == "connect.challenge":
                break
        else:
            raise RuntimeError("OpenClaw gateway closed before sending connect.challenge")

        # ── Step 2: send connect and wait for the matching response ───────────
        await ws.send(json.dumps({
            "type": "req",
            "id": connect_id,
            "method": "connect",
            "params": {
                "minProtocol": 3,
                "maxProtocol": 3,
                "client": {
                    "id": "cli",
                    "mode": "cli",
                    "version": "1.0.0",
                    "platform": "linux",
                    "instanceId": instance_id,
                },
                "caps": [],
                "auth": {"token": token},
                "role": "operator",
                "scopes": ["operator.admin", "operator.read", "operator.write"],
            },
        }))

        async for raw in ws:
            msg = json.loads(raw)
            if msg.get("type") == "res" and msg.get("id") == connect_id:
                if not msg.get("ok"):
                    error = msg.get("error", {}).get("message", "unknown")
                    raise RuntimeError(f"OpenClaw connect failed: {error}")
                break
            # skip background events that arrive before the connect response

        # ── Step 3: send chat.send and wait for the matching response ─────────
        await ws.send(json.dumps({
            "type": "req",
            "id": chat_id,
            "method": "chat.send",
            "params": {
                "sessionKey": session_key,
                "message": message,
                "idempotencyKey": idempotency_key,
            },
        }))

        async for raw in ws:
            msg = json.loads(raw)
            if msg.get("type") == "res" and msg.get("id") == chat_id:
                if not msg.get("ok"):
                    error = msg.get("error", {}).get("message", "unknown")
                    raise RuntimeError(f"OpenClaw chat.send failed: {error}")
                break
            # skip background events that arrive before chat.send is accepted

        # ── Step 4: stream chat events ────────────────────────────────────────
        yield Packet(placement=_DEFAULT_PLACEMENT, obj=AgentResponseStart())

        prev_text = ""

        async for raw in ws:
            msg = json.loads(raw)

            if msg.get("type") != "event" or msg.get("event") != "chat":
                continue

            payload = msg.get("payload", {})
            state = payload.get("state")
            message_obj = payload.get("message") or {}

            full_text = "".join(
                block.get("text", "")
                for block in message_obj.get("content", [])
                if block.get("type") == "text"
            )

            if state == "delta":
                if len(full_text) > len(prev_text):
                    yield Packet(
                        placement=_DEFAULT_PLACEMENT,
                        obj=AgentResponseDelta(content=full_text[len(prev_text):]),
                    )
                    prev_text = full_text

            elif state == "final":
                if len(full_text) > len(prev_text):
                    yield Packet(
                        placement=_DEFAULT_PLACEMENT,
                        obj=AgentResponseDelta(content=full_text[len(prev_text):]),
                    )
                yield Packet(placement=_DEFAULT_PLACEMENT, obj=OverallStop())
                return

            elif state in ("aborted", "error"):
                error_msg = payload.get("errorMessage", "OpenClaw stream aborted")
                logger.warning(f"OpenClaw stream ended with state={state}: {error_msg}")
                yield Packet(placement=_DEFAULT_PLACEMENT, obj=OverallStop(stop_reason=state))
                return
