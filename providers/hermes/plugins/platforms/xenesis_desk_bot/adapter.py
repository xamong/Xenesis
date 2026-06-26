from __future__ import annotations

import asyncio
import json
import math
import os
import threading
import uuid
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Awaitable, Callable, Dict, Optional
from urllib import request as urllib_request
from urllib.parse import urlsplit, urlunsplit

from gateway.config import Platform, PlatformConfig
from gateway.platforms.base import BasePlatformAdapter, MessageEvent, MessageType, SendResult

Platform("xenesis_desk_bot")

DEFAULT_BRIDGE_URL = "http://127.0.0.1:3847"
DEFAULT_INPUT_URL = "http://127.0.0.1:3859/message"
DEFAULT_LISTEN_HOST = "127.0.0.1"
WSL_LISTEN_HOST = "0.0.0.0"
DEFAULT_LISTEN_PORT = 3859
DEFAULT_LOCAL_USER_ID = "xenesis"
DEFAULT_LOCAL_USER_NAME = "Xenesis Desk"
BRIDGE_TIMEOUT_SECONDS = 10
DEFAULT_APPROVAL_TTL_SECONDS = 300
STREAM_EDIT_COALESCE_INTERVAL_SECONDS = 0.16

BridgePost = Callable[[str, Dict[str, Any]], Awaitable[Dict[str, Any]]]

_APPROVAL_ACTION_IDS: Dict[str, list[str]] = {}
_APPROVAL_ACTION_IDS_LOCK = threading.Lock()
_XENIS_TEXT_METADATA_FIELDS = (
    "surface",
    "mode",
    "sourceMessageId",
    "packetCommand",
    "artifactAction",
    "artifactTitle",
    "artifactPath",
)


def _is_truthy(value: Any) -> bool:
    return str(value or "").strip().lower() in {"1", "true", "yes", "on"}


def _ensure_default_local_allowed_user() -> None:
    if os.getenv("XENIS_BOT_ALLOWED_USERS", "").strip():
        return
    if _is_truthy(os.getenv("XENIS_BOT_ALLOW_ALL_USERS")):
        return
    os.environ["XENIS_BOT_ALLOWED_USERS"] = DEFAULT_LOCAL_USER_ID


def _bridge_state_file() -> Path:
    state_file = os.getenv("XENIS_MCP_STATE_FILE", "").strip()
    if state_file:
        return Path(state_file)
    home = os.getenv("XENIS_HOME", "").strip()
    if home:
        return Path(home) / "mcp" / "bridge.json"
    home_state_file = Path.home() / ".xenis" / "mcp" / "bridge.json"
    if home_state_file.exists():
        return home_state_file
    return _discover_wsl_bridge_state_file() or home_state_file


def _is_wsl_environment() -> bool:
    if os.getenv("WSL_DISTRO_NAME") or os.getenv("WSL_INTEROP"):
        return True
    try:
        text = Path("/proc/version").read_text(encoding="utf-8", errors="ignore").lower()
    except Exception:
        return False
    return "microsoft" in text or "wsl" in text


def _wsl_windows_users_dirs() -> list[Path]:
    return [Path("/mnt/c/Users")]


def _discover_wsl_bridge_state_file() -> Optional[Path]:
    if not _is_wsl_environment():
        return None
    candidates: list[Path] = []
    for users_dir in _wsl_windows_users_dirs():
        if not users_dir.exists():
            continue
        candidates.extend(users_dir.glob("*/.xenis/mcp/bridge.json"))
        candidates.extend(users_dir.glob("*/AppData/Roaming/xenesis-desk/mcp/bridge.json"))
        candidates.extend(users_dir.glob("*/AppData/Roaming/xenesis-desk-dev/mcp/bridge.json"))

    valid: list[Path] = []
    for candidate in candidates:
        try:
            parsed = json.loads(candidate.read_text(encoding="utf-8"))
        except Exception:
            continue
        if isinstance(parsed, dict) and (parsed.get("bridgeUrl") or parsed.get("url")):
            valid.append(candidate)
    if not valid:
        return None
    return max(valid, key=lambda item: item.stat().st_mtime)


def _read_bridge_state() -> Dict[str, Any]:
    state_file = _bridge_state_file()
    if not state_file.exists():
        return {}
    try:
        parsed = json.loads(state_file.read_text(encoding="utf-8"))
    except Exception:
        return {}
    return parsed if isinstance(parsed, dict) else {}


def _coerce_port(value: Any, default: int = DEFAULT_LISTEN_PORT) -> int:
    try:
        port = int(value)
    except (TypeError, ValueError):
        return default
    return port if 0 < port < 65536 else default


def _config_extra(config: PlatformConfig) -> Dict[str, Any]:
    extra = getattr(config, "extra", {}) or {}
    return extra if isinstance(extra, dict) else {}


def _wsl_host_ip() -> str:
    try:
        for line in Path("/etc/resolv.conf").read_text(encoding="utf-8", errors="ignore").splitlines():
            parts = line.strip().split()
            if len(parts) >= 2 and parts[0] == "nameserver":
                value = parts[1].strip()
                if value and not value.startswith("127."):
                    return value
    except Exception:
        pass
    return ""


def _rewrite_loopback_bridge_url_for_wsl(value: str) -> str:
    text = str(value or DEFAULT_BRIDGE_URL).strip().rstrip("/")
    if not _is_wsl_environment():
        return text
    try:
        parsed = urlsplit(text)
    except Exception:
        return text
    host = (parsed.hostname or "").lower()
    if host not in {"127.0.0.1", "localhost", "::1"}:
        return text
    wsl_host = _wsl_host_ip()
    if not wsl_host:
        return text
    netloc = wsl_host
    if parsed.port:
        netloc = f"{netloc}:{parsed.port}"
    return urlunsplit((parsed.scheme or "http", netloc, parsed.path, parsed.query, parsed.fragment)).rstrip("/")


def _resolve_bridge_url(extra: Dict[str, Any]) -> str:
    state = _read_bridge_state()
    raw = extra.get("bridge_url") or os.getenv("XENIS_MCP_BRIDGE_URL")
    if raw:
        return str(raw).strip().rstrip("/")
    raw = state.get("bridgeUrl") or state.get("url")
    if raw:
        return _rewrite_loopback_bridge_url_for_wsl(str(raw))
    raw = DEFAULT_BRIDGE_URL
    return str(raw or DEFAULT_BRIDGE_URL).strip().rstrip("/")


def _resolve_bridge_token(extra: Dict[str, Any]) -> str:
    state = _read_bridge_state()
    raw = (
        extra.get("bridge_token")
        or os.getenv("XENIS_MCP_BRIDGE_TOKEN")
        or state.get("bridgeToken")
        or state.get("token")
        or ""
    )
    return str(raw or "").strip()


def _resolve_input_url(extra: Dict[str, Any]) -> str:
    raw = extra.get("input_url") or os.getenv("XENIS_BOT_INPUT_URL") or DEFAULT_INPUT_URL
    return str(raw or DEFAULT_INPUT_URL).strip()


def _resolve_listen_host(extra: Dict[str, Any]) -> str:
    raw = extra.get("listen_host") or os.getenv("XENIS_BOT_LISTEN_HOST")
    if raw:
        return str(raw).strip()
    if _is_wsl_environment() and _read_bridge_state():
        return WSL_LISTEN_HOST
    return DEFAULT_LISTEN_HOST


def xenesis_desk_bot_diagnostics(extra: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    config_extra = extra if isinstance(extra, dict) else {}
    state_file = _bridge_state_file()
    bridge_url = _resolve_bridge_url(config_extra)
    bridge_token = _resolve_bridge_token(config_extra)
    return {
        "available": check_requirements(),
        "bridgeUrl": bridge_url,
        "tokenPresent": bool(bridge_token),
        "stateFile": str(state_file),
        "stateFileExists": state_file.exists(),
        "wslDetected": _is_wsl_environment(),
        "wslHostIp": _wsl_host_ip() if _is_wsl_environment() else "",
        "listenHost": _resolve_listen_host(config_extra),
        "inputUrl": _resolve_input_url(config_extra),
    }


def _post_bridge_json_sync(bridge_url: str, bridge_token: str, path: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    data = json.dumps(payload).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if bridge_token:
        headers["Authorization"] = f"Bearer {bridge_token}"
    req = urllib_request.Request(
        f"{bridge_url}{path}",
        data=data,
        headers=headers,
        method="POST",
    )
    with urllib_request.urlopen(req, timeout=BRIDGE_TIMEOUT_SECONDS) as response:
        body = response.read().decode("utf-8")
    if not body.strip():
        return {"ok": True}
    parsed = json.loads(body)
    return parsed if isinstance(parsed, dict) else {"ok": True, "result": parsed}


def _clean_text(value: Any) -> str:
    return str(value or "").strip()


def _approval_ui_from_metadata(metadata: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    if not isinstance(metadata, dict):
        return {}
    raw = metadata.get("approval_ui") or metadata.get("approvalUi")
    if not isinstance(raw, dict):
        return {}

    choices = [
        _clean_text(choice)
        for choice in raw.get("choices", [])
        if _clean_text(choice)
    ] if isinstance(raw.get("choices"), list) else []

    labels_raw = raw.get("button_labels") or raw.get("buttonLabels") or {}
    button_labels = {}
    if isinstance(labels_raw, dict):
        button_labels = {
            _clean_text(key): _clean_text(value)
            for key, value in labels_raw.items()
            if _clean_text(key) and _clean_text(value)
        }

    result: Dict[str, Any] = {}
    title = _clean_text(raw.get("title"))
    subject_label = _clean_text(raw.get("subject_label") or raw.get("subjectLabel"))
    reason_label = _clean_text(raw.get("reason_label") or raw.get("reasonLabel"))
    if title:
        result["title"] = title
    if subject_label:
        result["subjectLabel"] = subject_label
    if reason_label:
        result["reasonLabel"] = reason_label
    if choices:
        result["choices"] = choices
    if button_labels:
        result["buttonLabels"] = button_labels
    return result


def _artifacts_from_metadata(metadata: Optional[Dict[str, Any]]) -> list[Dict[str, Any]]:
    if not isinstance(metadata, dict):
        return []
    raw = metadata.get("artifacts")
    if isinstance(raw, dict):
        raw_items = [raw]
    elif isinstance(raw, list):
        raw_items = raw
    else:
        return []

    artifacts: list[Dict[str, Any]] = []
    for item in raw_items:
        if not isinstance(item, dict):
            continue
        title = _clean_text(item.get("title") or item.get("name") or item.get("fileName") or item.get("file_name"))
        kind = _clean_text(item.get("kind") or item.get("type") or item.get("format"))
        file_path = _clean_text(item.get("filePath") or item.get("file_path") or item.get("path"))
        open_command = _clean_text(item.get("openCommand") or item.get("open_command") or item.get("command"))
        if not file_path and not open_command:
            continue
        artifact: Dict[str, Any] = {}
        if title:
            artifact["title"] = title
        if kind:
            artifact["kind"] = kind
        if file_path:
            artifact["filePath"] = file_path
        if open_command:
            artifact["openCommand"] = open_command
        artifacts.append(artifact)
    return artifacts


def _xenis_metadata_from_value(value: Any) -> Dict[str, Any]:
    if not isinstance(value, dict):
        return {}

    result: Dict[str, Any] = {}
    for key in _XENIS_TEXT_METADATA_FIELDS:
        clean_value = _clean_text(value.get(key))
        if clean_value:
            result[key] = clean_value

    raw_count = value.get("workPacketItemCount")
    if raw_count is None:
        raw_count = value.get("work_packet_item_count")
    try:
        count = float(raw_count)
    except (TypeError, ValueError):
        count = None
    if count is not None and math.isfinite(count) and count >= 0:
        result["workPacketItemCount"] = int(count)

    raw_formats = value.get("artifactFormats")
    if raw_formats is None:
        raw_formats = value.get("artifact_formats")
    if isinstance(raw_formats, list):
        formats = [_clean_text(item) for item in raw_formats if _clean_text(item)]
        if formats:
            result["artifactFormats"] = formats

    return result


def _xenis_metadata_from_metadata(metadata: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    if not isinstance(metadata, dict):
        return {}
    raw = metadata.get("xenesis_desk")
    if raw is None:
        raw = metadata.get("xd")
    if raw is None:
        raw = metadata.get("xenis")
    return _xenis_metadata_from_value(raw)


def _attach_bridge_metadata(payload: Dict[str, Any], metadata: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    approval_ui = _approval_ui_from_metadata(metadata)
    if approval_ui:
        payload["approvalUi"] = approval_ui
    artifacts = _artifacts_from_metadata(metadata)
    if artifacts:
        payload["artifacts"] = artifacts
    xenis = _xenis_metadata_from_metadata(metadata)
    if xenis:
        payload["xenesis_desk"] = xenis
    return payload


def _default_approval_ui(title: str = "Xenesis Desk Approval") -> Dict[str, Any]:
    return {
        "title": title,
        "choices": ["once", "deny"],
        "buttonLabels": {
            "once": "Approve",
            "deny": "Deny",
        },
    }


def _approval_card_content(command: str, description: str) -> str:
    command_text = str(command or "").strip() or "(unknown request)"
    description_text = str(description or "").strip() or "Approval required"
    return (
        "**Approval required**\n\n"
        "**Command:**\n"
        f"```\n{command_text}\n```\n"
        f"**Reason:** {description_text}"
    )


def _utc_iso_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _utc_iso_after(seconds: int) -> str:
    return (datetime.now(timezone.utc) + timedelta(seconds=seconds)).isoformat().replace("+00:00", "Z")


def _remember_action_inbox_approval(session_key: str, message_id: str) -> None:
    session_key = _clean_text(session_key)
    message_id = _clean_text(message_id)
    if not session_key or not message_id:
        return
    with _APPROVAL_ACTION_IDS_LOCK:
        _APPROVAL_ACTION_IDS.setdefault(session_key, []).append(message_id)


def _pop_action_inbox_approval(session_key: str) -> str:
    session_key = _clean_text(session_key)
    if not session_key:
        return ""
    with _APPROVAL_ACTION_IDS_LOCK:
        queue = _APPROVAL_ACTION_IDS.get(session_key) or []
        if not queue:
            return ""
        message_id = queue.pop(0)
        if queue:
            _APPROVAL_ACTION_IDS[session_key] = queue
        else:
            _APPROVAL_ACTION_IDS.pop(session_key, None)
        return message_id


def _chat_id_from_session_key(session_key: str) -> str:
    text = _clean_text(session_key)
    parts = text.split(":")
    return parts[-1] if len(parts) >= 5 and parts[-1] else "xenesis-bot"


def _choice_to_action_inbox_status(choice: str) -> str:
    normalized = _clean_text(choice).lower()
    if normalized in {"once", "session", "always", "approve", "approved"}:
        return "approved"
    if normalized in {"deny", "denied", "no", "reject", "rejected"}:
        return "rejected"
    if normalized == "timeout":
        return "expired"
    return "failed"


def _action_inbox_message_for_choice(choice: str) -> tuple[str, str]:
    status = _choice_to_action_inbox_status(choice)
    if status == "approved":
        return "Hermes approval completed.", ""
    if status == "rejected":
        return "Hermes approval rejected.", ""
    if status == "expired":
        return "", "Hermes approval timed out."
    return "", f"Hermes approval ended with unknown choice: {_clean_text(choice) or 'unknown'}"


def _action_inbox_request_from_approval(
    *,
    message_id: str,
    chat_id: str,
    session_key: str,
    command: str,
    description: str,
    input_url: str,
    approval_ui: Dict[str, Any],
) -> Dict[str, Any]:
    return {
        "id": message_id,
        "sessionId": str(chat_id or "xenesis-bot"),
        "title": _clean_text(approval_ui.get("title")) or "Xenesis Desk Approval",
        "kind": "approval",
        "command": str(command or ""),
        "description": str(description or ""),
        "callbackUrl": input_url,
        "approveText": "/approve once",
        "rejectText": "/deny",
        "approvalSessionKey": _clean_text(session_key),
        "expiresAt": _utc_iso_after(DEFAULT_APPROVAL_TTL_SECONDS),
        "source": "Hermes Gateway",
    }


def _handle_post_approval_response(**kwargs: Any) -> None:
    if _clean_text(kwargs.get("surface")).lower() != "gateway":
        return
    session_key = _clean_text(kwargs.get("session_key"))
    if not session_key:
        return
    choice = _clean_text(kwargs.get("choice"))
    status = _choice_to_action_inbox_status(choice)
    result, error = _action_inbox_message_for_choice(choice)
    message_id = _pop_action_inbox_approval(session_key)
    payload: Dict[str, Any] = {
        "sessionId": _chat_id_from_session_key(session_key),
        "approvalSessionKey": session_key,
        "kind": "approval",
        "command": str(kwargs.get("command") or ""),
        "description": str(kwargs.get("description") or ""),
        "status": status,
        "source": "Hermes Gateway",
        "at": _utc_iso_now(),
    }
    if message_id:
        payload["id"] = message_id
    if result:
        payload["result"] = result
    if error:
        payload["error"] = error
    try:
        _post_bridge_json_sync(
            _resolve_bridge_url({}),
            _resolve_bridge_token({}),
            "/action-inbox/request",
            payload,
        )
    except Exception:
        pass


def _stable_id_part(value: Any, default: str) -> str:
    text = _clean_text(value) or default
    cleaned = "".join(ch if ch.isalnum() or ch in {"-", "_"} else "-" for ch in text)
    cleaned = "-".join(part for part in cleaned.split("-") if part)
    return cleaned or default


class XenisBotAdapter(BasePlatformAdapter):
    MAX_MESSAGE_LENGTH = 64_000

    def __init__(
        self,
        config: PlatformConfig,
        *,
        bridge_post: Optional[BridgePost] = None,
        start_inbound: bool = True,
    ):
        super().__init__(config=config, platform=Platform("xenesis_desk_bot"))
        extra = _config_extra(config)
        self.bridge_url = _resolve_bridge_url(extra)
        self.bridge_token = _resolve_bridge_token(extra)
        self.input_url = _resolve_input_url(extra)
        self.listen_host = _resolve_listen_host(extra)
        self.listen_port = _coerce_port(extra.get("listen_port") or os.getenv("XENIS_BOT_LISTEN_PORT"))
        self._bridge_post = bridge_post
        self._start_inbound = start_inbound
        self._running = False
        self._loop: Optional[asyncio.AbstractEventLoop] = None
        self._server: Optional[ThreadingHTTPServer] = None
        self._server_thread: Optional[threading.Thread] = None
        self._xenis_metadata_by_session: Dict[str, Dict[str, Any]] = {}
        self._xenis_metadata_lock = threading.Lock()
        self._stream_edit_buffers: Dict[str, Dict[str, Any]] = {}
        self._stream_edit_tasks: Dict[str, asyncio.Task[Any]] = {}
        self._stream_edit_lock = asyncio.Lock()

    async def _post_bridge(self, path: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        if self._bridge_post is not None:
            return await self._bridge_post(path, payload)
        return await asyncio.to_thread(
            _post_bridge_json_sync,
            self.bridge_url,
            self.bridge_token,
            path,
            payload,
        )

    def _observe_stream_edit_task(self, task: asyncio.Task[Any]) -> None:
        def consume_result(done: asyncio.Task[Any]) -> None:
            try:
                done.result()
            except asyncio.CancelledError:
                pass
            except Exception:
                pass

        task.add_done_callback(consume_result)

    async def _delayed_stream_edit_post(self, message_id: str) -> None:
        await asyncio.sleep(STREAM_EDIT_COALESCE_INTERVAL_SECONDS)
        await self._flush_coalesced_stream_edit(message_id, cancel_timer=False)

    async def _post_coalesced_stream_edit(self, message_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        async with self._stream_edit_lock:
            self._stream_edit_buffers[message_id] = payload
            task = self._stream_edit_tasks.get(message_id)
            if task is None or task.done():
                task = asyncio.create_task(self._delayed_stream_edit_post(message_id))
                self._stream_edit_tasks[message_id] = task
                self._observe_stream_edit_task(task)
        return {"ok": True}

    async def _flush_coalesced_stream_edit(
        self,
        message_id: str,
        *,
        cancel_timer: bool = True,
    ) -> Dict[str, Any]:
        async with self._stream_edit_lock:
            payload = self._stream_edit_buffers.pop(message_id, None)
            task = self._stream_edit_tasks.pop(message_id, None)
        if cancel_timer and task is not None and not task.done():
            task.cancel()
        if payload is None:
            return {"ok": True}
        return await self._post_bridge("/bot/stream", payload)

    async def _flush_all_coalesced_stream_edits(self) -> None:
        async with self._stream_edit_lock:
            message_ids = list(self._stream_edit_buffers.keys())
        for message_id in message_ids:
            try:
                await self._flush_coalesced_stream_edit(message_id)
            except Exception:
                pass

    def _base_payload(
        self,
        chat_id: str,
        message_id: str,
        content: str,
        *,
        status: str = "",
    ) -> Dict[str, Any]:
        payload = {
            "sessionId": str(chat_id or "xenesis-bot"),
            "messageId": str(message_id),
            "role": "assistant",
            "content": str(content or ""),
            "title": "Xenesis Bot",
            "source": "Hermes Gateway",
            "inputUrl": self.input_url,
        }
        if status:
            payload["status"] = status
        return payload

    def _remember_inbound_xenis_metadata(self, session_id: str, payload: Dict[str, Any]) -> None:
        session_key = str(session_id or "xenesis-bot")
        xenis = _xenis_metadata_from_value(
            payload.get("xenesis_desk") or payload.get("xd") or payload.get("xenis")
        )
        with self._xenis_metadata_lock:
            if xenis:
                self._xenis_metadata_by_session[session_key] = xenis
            else:
                self._xenis_metadata_by_session.pop(session_key, None)

    def _outbound_metadata(self, chat_id: str, metadata: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        if isinstance(metadata, dict):
            merged: Dict[str, Any] = dict(metadata)
        else:
            merged = {}
        if _xenis_metadata_from_metadata(merged):
            return merged

        session_key = str(chat_id or "xenesis-bot")
        with self._xenis_metadata_lock:
            cached = dict(self._xenis_metadata_by_session.get(session_key) or {})
        if cached:
            merged["xenesis_desk"] = cached
        return merged or None

    async def connect(self) -> bool:
        self._running = True
        self._loop = asyncio.get_running_loop()
        if self._start_inbound:
            self._start_inbound_server()
        try:
            await self._post_bridge("/bot/session", {
                "sessionId": "xenesis-bot",
                "messageId": "xenesis-bot-session",
                "role": "system",
                "title": "Xenesis Bot",
                "source": "Hermes Gateway",
                "inputUrl": self.input_url,
                "status": "ready",
            })
        except Exception:
            pass
        return True

    async def disconnect(self) -> None:
        self._running = False
        await self._flush_all_coalesced_stream_edits()
        if self._server is not None:
            await asyncio.to_thread(self._server.shutdown)
            self._server.server_close()
            self._server = None
        if self._server_thread is not None:
            self._server_thread.join(timeout=2)
            self._server_thread = None

    async def send(
        self,
        chat_id: str,
        content: str,
        reply_to: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> SendResult:
        del reply_to
        message_id = f"xdbot-{uuid.uuid4().hex}"
        payload = _attach_bridge_metadata(
            self._base_payload(chat_id, message_id, content),
            self._outbound_metadata(chat_id, metadata),
        )
        try:
            await self._post_bridge("/bot/message", payload)
            return SendResult(success=True, message_id=message_id)
        except Exception as exc:
            return SendResult(success=False, message_id=message_id, error=str(exc), retryable=True)

    async def edit_message(
        self,
        chat_id: str,
        message_id: str,
        content: str,
        *,
        finalize: bool = False,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> SendResult:
        payload = _attach_bridge_metadata(
            self._base_payload(chat_id, message_id, content),
            self._outbound_metadata(chat_id, metadata),
        )
        try:
            if finalize:
                await self._flush_coalesced_stream_edit(message_id)
                await self._post_bridge("/bot/final", payload)
            else:
                await self._post_coalesced_stream_edit(message_id, payload)
            return SendResult(success=True, message_id=message_id)
        except Exception as exc:
            return SendResult(success=False, message_id=message_id, error=str(exc), retryable=True)

    async def send_typing(self, chat_id: str, metadata=None) -> None:
        payload = {
            "sessionId": str(chat_id or "xenesis-bot"),
            "messageId": f"xdbot-status-{uuid.uuid4().hex}",
            "role": "system",
            "status": "typing",
            "title": "Xenesis Bot",
            "source": "Hermes Gateway",
            "inputUrl": self.input_url,
        }
        _attach_bridge_metadata(payload, self._outbound_metadata(chat_id, metadata))
        await self._post_bridge("/bot/status", payload)

    async def stop_typing(self, chat_id: str) -> None:
        payload = {
            "sessionId": str(chat_id or "xenesis-bot"),
            "messageId": f"xdbot-status-{uuid.uuid4().hex}",
            "role": "system",
            "status": "completed",
            "title": "Xenesis Bot",
            "source": "Hermes Gateway",
            "inputUrl": self.input_url,
        }
        _attach_bridge_metadata(payload, self._outbound_metadata(chat_id, None))
        await self._post_bridge("/bot/status", payload)

    async def send_or_update_status(
        self,
        chat_id: str,
        status_key: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> SendResult:
        session_id = str(chat_id or "xenesis-bot")
        message_id = f"xdbot-status-{_stable_id_part(session_id, 'session')}-{_stable_id_part(status_key, 'status')}"
        payload = {
            "sessionId": session_id,
            "messageId": message_id,
            "role": "system",
            "status": str(content or ""),
            "content": str(content or ""),
            "title": "Xenesis Bot",
            "source": "Hermes Gateway",
            "inputUrl": self.input_url,
        }
        _attach_bridge_metadata(payload, self._outbound_metadata(chat_id, metadata))
        try:
            await self._post_bridge("/bot/status", payload)
            return SendResult(success=True, message_id=message_id)
        except Exception as exc:
            return SendResult(success=False, message_id=message_id, error=str(exc), retryable=True)

    async def send_exec_approval(
        self,
        chat_id: str,
        command: str,
        session_key: str,
        description: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> SendResult:
        message_id = f"xdbot-approval-{uuid.uuid4().hex}"
        payload = self._base_payload(
            chat_id,
            message_id,
            _approval_card_content(command, description),
            status="pending",
        )
        _attach_bridge_metadata(payload, metadata)
        payload.setdefault("approvalUi", _default_approval_ui())
        try:
            await self._post_bridge("/bot/message", payload)
            try:
                await self._post_bridge(
                    "/action-inbox/request",
                    _action_inbox_request_from_approval(
                        message_id=message_id,
                        chat_id=chat_id,
                        session_key=session_key,
                        command=command,
                        description=description,
                        input_url=self.input_url,
                        approval_ui=payload.get("approvalUi") or {},
                    ),
                )
                _remember_action_inbox_approval(session_key, message_id)
            except Exception:
                pass
            return SendResult(success=True, message_id=message_id)
        except Exception as exc:
            return SendResult(success=False, message_id=message_id, error=str(exc), retryable=True)

    async def get_chat_info(self, chat_id: str) -> Dict[str, Any]:
        return {"chat_id": chat_id, "type": "dm", "name": chat_id or "Xenesis Bot"}

    def build_message_event(self, payload: Dict[str, Any]) -> MessageEvent:
        session_id = str(payload.get("sessionId") or payload.get("chatId") or "xenesis-bot")
        user_id = str(payload.get("userId") or DEFAULT_LOCAL_USER_ID)
        user_name = str(payload.get("userName") or DEFAULT_LOCAL_USER_NAME)
        message_id = str(payload.get("messageId") or f"xdbot-user-{uuid.uuid4().hex}")
        self._remember_inbound_xenis_metadata(session_id, payload)
        source = self.build_source(
            chat_id=session_id,
            chat_name=str(payload.get("chatName") or session_id),
            chat_type="dm",
            user_id=user_id,
            user_name=user_name,
            message_id=message_id,
        )
        return MessageEvent(
            text=str(payload.get("text") or payload.get("content") or ""),
            message_type=MessageType.TEXT,
            source=source,
            raw_message=payload,
            message_id=message_id,
            timestamp=datetime.now(),
        )

    def _start_inbound_server(self) -> None:
        if self._server is not None:
            return
        adapter = self

        class Handler(BaseHTTPRequestHandler):
            def _headers(self, status: int = 200) -> None:
                self.send_response(status)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.send_header("Access-Control-Allow-Headers", "Content-Type")
                self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
                self.end_headers()

            def do_OPTIONS(self) -> None:
                self._headers(204)

            def do_POST(self) -> None:
                if self.path != "/message":
                    self._headers(404)
                    self.wfile.write(json.dumps({"ok": False, "error": "not found"}).encode("utf-8"))
                    return
                length = int(self.headers.get("Content-Length") or "0")
                try:
                    body = self.rfile.read(length).decode("utf-8") if length else "{}"
                    payload = json.loads(body)
                    if not isinstance(payload, dict):
                        raise ValueError("JSON object expected")
                    event = adapter.build_message_event(payload)
                    if adapter._loop is None:
                        raise RuntimeError("adapter loop is not running")
                    asyncio.run_coroutine_threadsafe(adapter.handle_message(event), adapter._loop)
                    self._headers(200)
                    self.wfile.write(json.dumps({"ok": True}).encode("utf-8"))
                except Exception as exc:
                    self._headers(400)
                    self.wfile.write(json.dumps({"ok": False, "error": str(exc)}).encode("utf-8"))

            def log_message(self, format: str, *args: Any) -> None:
                return None

        self._server = ThreadingHTTPServer((self.listen_host, self.listen_port), Handler)
        self._server_thread = threading.Thread(
            target=self._server.serve_forever,
            name="xenesis-bot-http",
            daemon=True,
        )
        self._server_thread.start()


def check_requirements() -> bool:
    if _is_truthy(os.getenv("XENIS_BOT_ENABLED")) or bool(os.getenv("XENIS_MCP_BRIDGE_URL")):
        return True
    return bool(_read_bridge_state())


def validate_config(config: PlatformConfig) -> bool:
    extra = _config_extra(config)
    return bool(_resolve_bridge_url(extra))


def is_connected(config: PlatformConfig) -> bool:
    return bool(getattr(config, "enabled", False)) and validate_config(config)


def env_enablement() -> Optional[Dict[str, Any]]:
    if not check_requirements():
        return None
    seed: Dict[str, Any] = {}
    bridge_url = _resolve_bridge_url({})
    bridge_token = _resolve_bridge_token({})
    if bridge_url:
        seed["bridge_url"] = bridge_url
    if bridge_token:
        seed["bridge_token"] = bridge_token
    if os.getenv("XENIS_BOT_INPUT_URL"):
        seed["input_url"] = os.getenv("XENIS_BOT_INPUT_URL")
    listen_host = _resolve_listen_host({})
    if listen_host and listen_host != DEFAULT_LISTEN_HOST:
        seed["listen_host"] = listen_host
    if os.getenv("XENIS_BOT_LISTEN_PORT"):
        seed["listen_port"] = os.getenv("XENIS_BOT_LISTEN_PORT")
    return seed


def register(ctx) -> None:
    _ensure_default_local_allowed_user()
    register_hook = getattr(ctx, "register_hook", None)
    if callable(register_hook):
        register_hook("post_approval_response", _handle_post_approval_response)
    ctx.register_platform(
        name="xenesis_desk_bot",
        label="Xenesis Bot",
        adapter_factory=lambda cfg: XenisBotAdapter(cfg),
        check_fn=check_requirements,
        validate_config=validate_config,
        is_connected=is_connected,
        required_env=["XENIS_BOT_ENABLED", "XENIS_MCP_BRIDGE_URL"],
        env_enablement_fn=env_enablement,
        allowed_users_env="XENIS_BOT_ALLOWED_USERS",
        allow_all_env="XENIS_BOT_ALLOW_ALL_USERS",
        max_message_length=XenisBotAdapter.MAX_MESSAGE_LENGTH,
        allow_update_command=True,
        pii_safe=True,
        emoji="🖥️",
        platform_hint=(
            "You are chatting through the local Xenesis Bot pane. Standard Markdown "
            "is rendered, and fenced xcon / xcon-sketch blocks are previewed live "
            "inside Xenesis Desk while the response streams. Prefer complete fenced XCON "
            "documents when asked for UI, diagrams, dashboards, or visual artifacts."
        ),
    )
