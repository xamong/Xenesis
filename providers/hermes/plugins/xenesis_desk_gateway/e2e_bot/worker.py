"""JSON-lines worker for the Xenesis Desk mobile E2E bot harness.

The browser and Node server stay dependency-free. This worker keeps the Python
plugin module loaded so mobile selection caches and action tokens behave like a
single long-running Hermes gateway session.
"""

from __future__ import annotations

import json
import os
import re
import sys
import traceback
import threading
import time
import types
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace
from typing import Any
from urllib import error as urllib_error
from urllib import request as urllib_request

from desk_relay import (
    compact_desk_stream_output as _compact_desk_stream_output,
    relay_desk_stream_text as _relay_desk_stream_text,
)


ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

try:
    from tools import approval  # type: ignore  # noqa: E402
except ModuleNotFoundError:  # pragma: no cover - local harness fallback
    _session = threading.local()

    class _FallbackApprovalEntry:
        def __init__(self, data: Any):
            self.data = data

    class _FallbackApproval:
        _lock = threading.RLock()
        _gateway_notify_cbs: dict[str, Any] = {}
        _gateway_queues: dict[str, list[Any]] = {}
        _ApprovalEntry = _FallbackApprovalEntry

        @staticmethod
        def set_current_session_key(session_key: str) -> str:
            previous = str(getattr(_session, "key", "") or "")
            _session.key = str(session_key or "")
            return previous

        @staticmethod
        def reset_current_session_key(token: Any) -> None:
            _session.key = str(token or "")

        @staticmethod
        def get_current_session_key(default: str = "") -> str:
            return str(getattr(_session, "key", "") or default)

    approval = _FallbackApproval()
    tools_module = types.ModuleType("tools")
    tools_module.approval = approval
    sys.modules.setdefault("tools", tools_module)
    sys.modules.setdefault("tools.approval", approval)
from plugins import xenesis_desk_gateway as plugin  # noqa: E402


DEFAULT_SESSION_KEY = "telegram:e2e-user:e2e-chat"
DEFAULT_XENESIS_GATEWAY_URL = "http://127.0.0.1:3338"
DEFAULT_XENESIS_GATEWAY_WORKFLOW = "xenis"
PROVIDER_AUTH_FALLBACK = (
    "Provider authentication failed. Check the configured credentials; "
    "raw provider details are in the gateway logs."
)
XD_COMMAND_PREFIXES = ("/xd", "$xd", "xd")
DESK_COMMAND_PREFIXES = ("/desk", "$desk", "desk")
REMOTE_DESK_COMMANDS = {"", "help", "agent", "agents", "attach", "detach", "terminals", "watch", "events", "send", "choose", "render", "image"}
DEFAULT_DESK_WATCH_POLL_INTERVAL_SECONDS = 2.0
_DESK_SESSIONS: dict[str, dict[str, Any]] = {}
_DESK_LOCK = threading.RLock()

for _stream_name in ("stdin", "stdout", "stderr"):
    _stream = getattr(sys, _stream_name, None)
    if hasattr(_stream, "reconfigure"):
        errors = "replace" if _stream_name == "stdin" else "backslashreplace"
        _stream.reconfigure(encoding="utf-8", errors=errors)


def _json_safe(value: Any) -> Any:
    try:
        json.dumps(value, ensure_ascii=False)
        return value
    except TypeError:
        return str(value)


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _safe_log_file_segment(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9_.-]+", "_", str(value or "")).strip("_") or "unknown"


def _e2e_log_home() -> Path:
    explicit_home = os.getenv("XENIS_HOME") or os.getenv("XENESIS_HOME")
    if explicit_home:
        return Path(explicit_home).expanduser()
    try:
        state_file = plugin._bridge_state_file()
        if state_file.name == "bridge.json" and state_file.parent.name == "mcp":
            return state_file.parent.parent
    except Exception:
        pass
    return Path.home() / ".xenis"


def _e2e_channel_send_log_dir() -> Path:
    explicit_dir = os.getenv("XENESIS_E2E_CHANNEL_SEND_LOG_DIR") or os.getenv("XENESIS_CHANNEL_SEND_LOG_DIR")
    if explicit_dir:
        return Path(explicit_dir).expanduser()
    return _e2e_log_home() / "logs" / "channel-sends"


def _write_e2e_channel_send_log(entry: dict[str, Any]) -> None:
    at = str(entry.get("at") or _utc_now_iso())
    day = at[:10] if re.match(r"^\d{4}-\d{2}-\d{2}", at) else time.strftime("%Y-%m-%d")
    channel = _safe_log_file_segment(str(entry.get("channel") or "e2e_bot"))
    payload = dict(entry)
    payload["at"] = at
    try:
        log_dir = _e2e_channel_send_log_dir()
        log_dir.mkdir(parents=True, exist_ok=True)
        with (log_dir / f"{channel}-{day}.jsonl").open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(payload, ensure_ascii=False) + "\n")
    except Exception:
        pass


def _request_log_metadata(request: dict[str, Any], *, platform: str, session_key: str) -> dict[str, str]:
    chat_id = str(request.get("chatId") or request.get("chat_id") or "e2e-chat")
    user_id = str(request.get("userId") or request.get("user_id") or "e2e-user")
    return {
        "platform": platform,
        "sessionKey": session_key,
        "chatId": chat_id,
        "chatName": str(request.get("chatName") or request.get("chat_name") or chat_id),
        "userId": user_id,
        "userName": str(request.get("userName") or request.get("user_name") or user_id),
    }


def _update_desk_session_log_metadata(session_key: str, request: dict[str, Any], *, platform: str) -> None:
    metadata = _request_log_metadata(request, platform=platform, session_key=session_key)
    with _DESK_LOCK:
        session = _desk_session(session_key)
        session["logMetadata"] = metadata


def _desk_session_log_metadata(session_key: str) -> dict[str, str]:
    with _DESK_LOCK:
        session = _desk_session(session_key)
        metadata = session.get("logMetadata")
        if isinstance(metadata, dict):
            return {
                "platform": str(metadata.get("platform") or "telegram"),
                "sessionKey": str(metadata.get("sessionKey") or session_key),
                "chatId": str(metadata.get("chatId") or "e2e-chat"),
                "chatName": str(metadata.get("chatName") or metadata.get("chatId") or "e2e-chat"),
                "userId": str(metadata.get("userId") or "e2e-user"),
                "userName": str(metadata.get("userName") or metadata.get("userId") or "e2e-user"),
            }
    return _request_log_metadata({}, platform="telegram", session_key=session_key)


def _log_e2e_channel_send(
    *,
    source: str,
    session_key: str,
    platform: str,
    text: str,
    mode: str,
    action_count: int = 0,
    request: dict[str, Any] | None = None,
    metadata: dict[str, str] | None = None,
    message_id: str = "",
    status: str = "success",
    error: str = "",
) -> None:
    final_text = str(text or "")
    if not final_text and status != "error":
        return
    log_metadata = metadata or _request_log_metadata(request or {}, platform=platform, session_key=session_key)
    entry: dict[str, Any] = {
        "channel": "e2e_bot",
        "source": source,
        "simulatedPlatform": platform,
        "conversationId": session_key,
        "messageId": str(message_id or (request or {}).get("messageId") or (request or {}).get("message_id") or ""),
        "status": status,
        "text": final_text,
        "textLength": len(final_text),
        "actionCount": int(action_count or 0),
        "mode": mode,
        "sessionKey": session_key,
        "chatId": log_metadata["chatId"],
        "chatName": log_metadata["chatName"],
        "userId": log_metadata["userId"],
        "userName": log_metadata["userName"],
    }
    if request is not None:
        entry["inbound"] = str(request.get("text") or "")
    if error:
        entry["error"] = error
    _write_e2e_channel_send_log(entry)


def _strip_command_prefix(text: str, prefixes: tuple[str, ...]) -> str | None:
    command = text.strip()
    lowered = command.lower()
    for prefix in prefixes:
        if prefix.startswith("/"):
            match = re.match(rf"^{re.escape(prefix)}(?:@[A-Za-z0-9_]+)?(?:\s+([\s\S]*))?$", command, re.IGNORECASE)
            if match:
                return str(match.group(1) or "").strip()
            continue
        if lowered == prefix:
            return ""
        if lowered.startswith(f"{prefix} "):
            return command[len(prefix):].strip()
    return None


def _request_raw_message(request: dict[str, Any], *, platform: str) -> dict[str, Any]:
    raw = dict(request)
    raw.setdefault("platform", platform)
    for camel, snake in (
        ("sessionId", "session_id"),
        ("chatId", "chat_id"),
        ("chatName", "chat_name"),
        ("userId", "user_id"),
        ("userName", "user_name"),
        ("messageId", "message_id"),
        ("xenesisDesk", "xenesis_desk"),
    ):
        if camel in request and snake not in raw:
            raw[snake] = request.get(camel)
    return raw


def _normalize_url(value: Any, default: str = "") -> str:
    text = str(value or default or "").strip()
    return text.rstrip("/")


def _gateway_token(request: dict[str, Any]) -> str:
    return str(
        request.get("gatewayToken")
        or os.getenv("XENESIS_GATEWAY_TOKEN")
        or ""
    ).strip()


def _gateway_url(request: dict[str, Any]) -> str:
    return _normalize_url(
        request.get("gatewayUrl")
        or os.getenv("XENESIS_GATEWAY_URL")
        or DEFAULT_XENESIS_GATEWAY_URL,
        DEFAULT_XENESIS_GATEWAY_URL,
    )


def _gateway_json_request(
    *,
    base_url: str,
    token: str,
    method: str,
    path: str,
    body: dict[str, Any] | None = None,
    timeout: float = 30.0,
) -> dict[str, Any]:
    data = None if body is None else json.dumps(body, ensure_ascii=False).encode("utf-8")
    headers = {"Accept": "application/json"}
    if data is not None:
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib_request.Request(
        f"{base_url}{path}",
        data=data,
        headers=headers,
        method=method,
    )
    try:
        with urllib_request.urlopen(req, timeout=timeout) as response:
            raw = response.read().decode("utf-8")
    except urllib_error.HTTPError as exc:
        raw_error = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Xenesis gateway returned HTTP {exc.code}: {raw_error}") from exc
    if not raw.strip():
        return {"ok": True}
    parsed = json.loads(raw)
    return parsed if isinstance(parsed, dict) else {"ok": True, "result": parsed}


def _first_word_and_rest(text: str) -> tuple[str, str]:
    value = str(text or "").strip()
    if not value:
        return "", ""
    parts = value.split(maxsplit=1)
    return parts[0].lower(), parts[1].strip() if len(parts) > 1 else ""


def _dict_or_empty(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _metric_parts(metrics: dict[str, Any], keys: tuple[str, ...]) -> str:
    parts: list[str] = []
    for key in keys:
        if key in metrics:
            parts.append(f"{key}={metrics.get(key)}")
    return ", ".join(parts)


def _format_gateway_status_outbound(result: dict[str, Any]) -> str:
    if not any(key in result for key in ("service", "tasks", "channels", "workflows", "orchestration")):
        return ""

    service = str(result.get("service") or "xenesis-gateway").strip() or "xenesis-gateway"
    ready_label = "ready" if result.get("ok") is not False else "not ready"
    lines = [f"{service}: {ready_label}"]

    if "activeRuns" in result:
        lines.append(f"Runs: active={result.get('activeRuns')}")

    tasks = _dict_or_empty(result.get("tasks"))
    task_summary = _metric_parts(tasks, ("total", "queued", "running", "completed", "failed", "cancelled"))
    if task_summary:
        lines.append(f"Tasks: {task_summary}")

    orchestration = _dict_or_empty(result.get("orchestration"))
    worker = _dict_or_empty(orchestration.get("worker"))
    scheduler = _dict_or_empty(orchestration.get("scheduler"))
    runtime_parts: list[str] = []
    if worker:
        runtime_parts.append(f"worker={'running' if worker.get('running') else 'stopped'}")
    if scheduler:
        runtime_parts.append(f"scheduler={'running' if scheduler.get('running') else 'stopped'}")
    if runtime_parts:
        lines.append(f"Runtime: {', '.join(runtime_parts)}")

    workflows = _dict_or_empty(result.get("workflows"))
    workflow_parts = _metric_parts(workflows, ("total", "default"))
    if workflow_parts:
        lines.append(f"Workflows: {workflow_parts}")

    channels = _dict_or_empty(result.get("channels"))
    channel_parts = _metric_parts(channels, ("total", "enabled", "ready", "blocked", "disabled"))
    channel_items = channels.get("items") if isinstance(channels.get("items"), list) else []
    ready_names = [
        str(item.get("name") or "").strip()
        for item in channel_items
        if isinstance(item, dict) and item.get("ready") and str(item.get("name") or "").strip()
    ]
    if channel_parts:
        suffix = f" ({', '.join(ready_names[:4])})" if ready_names else ""
        lines.append(f"Channels: {channel_parts}{suffix}")

    return "\n".join(lines)


def _format_gateway_outbound(result: dict[str, Any]) -> str:
    output = str(result.get("output") or "").strip()
    if output:
        return output
    errors = str(result.get("errors") or result.get("error") or "").strip()
    if errors:
        return errors
    summary = _format_gateway_status_outbound(result)
    if summary:
        return summary
    return json.dumps(result, ensure_ascii=False, indent=2)


def _desk_gateway_payload(
    *,
    prompt: str,
    request: dict[str, Any],
    platform: str,
    session_key: str,
    event: SimpleNamespace,
) -> dict[str, Any]:
    workflow = str(request.get("workflow") or DEFAULT_XENESIS_GATEWAY_WORKFLOW).strip() or DEFAULT_XENESIS_GATEWAY_WORKFLOW
    return {
        "prompt": prompt,
        "workflow": workflow,
        "ideContext": {
            "source": "xenesis-desk-e2e-bot",
            "platform": platform,
            "sessionKey": session_key,
            "chatId": event.chat_id,
            "chatName": getattr(event.source, "chat_name", ""),
            "userId": event.user_id,
            "userName": getattr(event.source, "user_name", ""),
            "simulator": request.get("simulator") if isinstance(request.get("simulator"), dict) else {},
        },
    }


def _run_desk_gateway_command(
    args: str,
    *,
    request: dict[str, Any],
    platform: str,
    session_key: str,
    event: SimpleNamespace,
) -> dict[str, Any]:
    command, rest = _first_word_and_rest(args)
    base_url = _gateway_url(request)
    token = _gateway_token(request)
    timeout = float(request.get("gatewayTimeoutMs") or 30000) / 1000.0

    if command in {"", "status"}:
        path = "/status"
        result = _gateway_json_request(base_url=base_url, token=token, method="GET", path=path, timeout=timeout)
        return {"path": path, "method": "GET", "url": base_url, "result": result}
    if command in {"health", "ready"}:
        path = "/health"
        result = _gateway_json_request(base_url=base_url, token=token, method="GET", path=path, timeout=timeout)
        return {"path": path, "method": "GET", "url": base_url, "result": result}
    if command in {"runs", "list-runs"}:
        path = "/runs"
        result = _gateway_json_request(base_url=base_url, token=token, method="GET", path=path, timeout=timeout)
        return {"path": path, "method": "GET", "url": base_url, "result": result}

    prompt = rest if command == "run" else str(args or "").strip()
    if not prompt:
        prompt = "status"
    path = "/run"
    body = _desk_gateway_payload(
        prompt=prompt,
        request=request,
        platform=platform,
        session_key=session_key,
        event=event,
    )
    result = _gateway_json_request(
        base_url=base_url,
        token=token,
        method="POST",
        path=path,
        body=body,
        timeout=timeout,
    )
    return {"path": path, "method": "POST", "url": base_url, "body": body, "result": result}


def _desk_session(session_key: str) -> dict[str, Any]:
    with _DESK_LOCK:
        session = _DESK_SESSIONS.get(session_key)
        if not isinstance(session, dict):
            session = {
                "termId": "",
                "seenEventIds": set(),
                "lastPending": None,
                "watching": False,
                "watchThread": None,
                "agentId": "",
                "agentWatching": False,
                "agentSeenEventIds": set(),
                "lastTerminals": [],
                "lastAgents": [],
                "pushes": [],
                "pollIntervalSeconds": DEFAULT_DESK_WATCH_POLL_INTERVAL_SECONDS,
            }
            _DESK_SESSIONS[session_key] = session
        return session


def _desk_has_attached_session(session_key: str) -> bool:
    with _DESK_LOCK:
        session = _DESK_SESSIONS.get(session_key)
        return bool(isinstance(session, dict) and str(session.get("termId") or "").strip())


def _desk_has_attached_agent_session(session_key: str) -> bool:
    with _DESK_LOCK:
        session = _DESK_SESSIONS.get(session_key)
        return bool(isinstance(session, dict) and str(session.get("agentId") or "").strip())


def _desk_stop_session_watch(session: dict[str, Any]) -> None:
    session["watching"] = False
    if not session.get("agentWatching"):
        session["watchThread"] = None


def _desk_stop_agent_watch(session: dict[str, Any]) -> None:
    session["agentWatching"] = False
    if not session.get("watching"):
        session["watchThread"] = None


def _bridge_http_error_payload(exc: urllib_error.HTTPError) -> dict[str, Any]:
    raw = ""
    try:
        raw = exc.read().decode("utf-8", errors="replace").strip()
    except Exception:
        raw = ""
    if raw:
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, dict):
                payload = dict(parsed)
                payload["ok"] = False
                payload.setdefault("error", raw)
                return payload
        except Exception:
            pass
    detail = raw or str(getattr(exc, "reason", "") or "").strip() or "Bad Request"
    return {
        "ok": False,
        "error": f"Xenesis Desk bridge HTTP {exc.code}: {detail}",
    }


def _desk_call_capability(path: str, args: dict[str, Any] | None = None, *, approved: bool = False) -> dict[str, Any]:
    payload = {
        "path": path,
        "args": args or {},
        "approved": approved,
        "source": "gateway",
    }
    try:
        result = plugin._call_bridge("/capabilities/call", payload)
        return result if isinstance(result, dict) else {"ok": True, "result": result}
    except urllib_error.HTTPError as exc:
        return _bridge_http_error_payload(exc)
    except Exception as exc:
        return {
            "ok": False,
            "error": str(exc) or exc.__class__.__name__,
        }


def _object_value(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _array_from(value: Any, *paths: list[str]) -> list[Any]:
    for path in paths:
        current = value
        for key in path:
            current = _object_value(current).get(key)
        if isinstance(current, list):
            return current
    return []


def _object_at(value: Any, path: list[str]) -> dict[str, Any]:
    current = value
    for key in path:
        current = _object_value(current).get(key)
    return _object_value(current)


def _string_value(value: Any) -> str:
    if value is None:
        return ""
    return str(value)


def _truncate_terminal_meta(value: str, max_length: int) -> str:
    normalized = re.sub(r"\s+", " ", str(value or "")).strip()
    if len(normalized) <= max_length:
        return normalized
    return f"{normalized[:max(0, max_length - 3)]}..."


def _is_failure(payload: dict[str, Any]) -> bool:
    if payload.get("ok") is False:
        return True
    result = payload.get("result")
    return isinstance(result, dict) and result.get("ok") is False


def _failure_text(payload: dict[str, Any], fallback: str) -> str:
    result = _object_value(payload.get("result"))
    return f"{fallback}: {_string_value(payload.get('error') or result.get('error') or 'unknown error')}"


def _desk_help_text() -> str:
    return "\n".join([
        "Remote Desk commands:",
        "/desk terminals",
        "/desk attach <termId|number|suffix>",
        "/desk status",
        "/desk watch",
        "/desk events",
        "/desk send <text>",
        "/desk choose <number>",
        "/desk detach",
        "/desk render <xcon/sketch markup>",
        "/desk image <xcon/sketch markup>",
        "/desk agents",
        "/desk agent attach <agentId|number>",
        "/desk agent status",
        "/desk agent watch",
        "/desk agent events",
        "/desk agent send <text>",
        "/desk agent detach",
    ])


def _normalize_terminal_input(input_text: str) -> str:
    value = str(input_text or "")
    if not value:
        return ""
    return value if value.endswith(("\r", "\n")) else f"{value}\r"


def _format_desk_terminals(payload: dict[str, Any]) -> str:
    if _is_failure(payload):
        return _failure_text(payload, "Failed to list terminals")
    sessions = [_object_value(session) for session in _array_from(payload, ["sessions"], ["result", "sessions"])]
    if not sessions:
        return "No Xenesis Desk terminals are currently visible."
    lines: list[str] = []
    for index, raw_session in enumerate(sessions, start=1):
        item = _object_value(raw_session)
        term_id = (
            _string_value(item.get("id"))
            or _string_value(item.get("termId"))
            or _string_value(item.get("sessionId"))
            or f"#{index}"
        )
        title = (
            _string_value(item.get("title"))
            or _string_value(item.get("name"))
            or _string_value(item.get("label"))
            or _string_value(item.get("displayTitle"))
            or _string_value(item.get("tabTitle"))
            or _string_value(item.get("paneTitle"))
            or _string_value(item.get("mcpTitle"))
        )
        cwd = _string_value(item.get("cwd"))
        shell_context = _object_value(item.get("shellContext"))
        last = _string_value(item.get("lastSentCommand")) or _string_value(shell_context.get("lastSentCommand"))
        display_title = title or _last_path_segment(cwd) or "terminal"
        lines.append(f"{index}. {_short_terminal_id(term_id)} · {_truncate_terminal_meta(display_title, 48)}")
        if item.get("active") is True:
            lines.append("   status: active")
        if cwd:
            lines.append(f"   cwd: {_truncate_terminal_meta(cwd, 120)}")
        if last:
            lines.append(f"   last: {_truncate_terminal_meta(last, 96)}")
    return "\n".join(["Terminals", "", *lines])


def _short_terminal_id(term_id: str) -> str:
    normalized = str(term_id or "").strip()
    return normalized[:8] if len(normalized) > 8 else normalized


def _last_path_segment(value: str) -> str:
    parts = [part.strip() for part in re.split(r"[\\/]+", str(value or "")) if part.strip()]
    return parts[-1] if parts else ""


def _terminal_id_from_item(item: dict[str, Any]) -> str:
    return (
        _string_value(item.get("id"))
        or _string_value(item.get("termId"))
        or _string_value(item.get("sessionId"))
    ).strip()


def _list_desk_terminals(session_key: str) -> dict[str, Any]:
    payload = _desk_call_capability("xd.terminals.list")
    if not _is_failure(payload):
        terminals = [_object_value(terminal) for terminal in _array_from(payload, ["sessions"], ["result", "sessions"])]
        with _DESK_LOCK:
            session = _desk_session(session_key)
            session["lastTerminals"] = terminals
    return payload


def _format_desk_terminal_list(payload: dict[str, Any], session_key: str) -> dict[str, Any] | str:
    text = _format_desk_terminals(payload)
    if _is_failure(payload):
        return text
    terminals = [_object_value(terminal) for terminal in _array_from(payload, ["sessions"], ["result", "sessions"])]
    with _DESK_LOCK:
        session = _desk_session(session_key)
        session["lastTerminals"] = terminals
    actions = [
        {"label": f"Attach {index}", "value": f"/desk attach {index}"}
        for index, item in enumerate(terminals, start=1)
        if _terminal_id_from_item(item)
    ]
    return {"text": text, "actions": actions} if actions else text


def _resolve_terminal_id(session_key: str, selector: str) -> str:
    normalized = str(selector or "").strip()
    if not normalized:
        return ""
    with _DESK_LOCK:
        session = _desk_session(session_key)
        terminals = [_object_value(terminal) for terminal in session.get("lastTerminals") or []]
    if not terminals:
        payload = _list_desk_terminals(session_key)
        if not _is_failure(payload):
            terminals = [_object_value(terminal) for terminal in _array_from(payload, ["sessions"], ["result", "sessions"])]
    try:
        index = int(normalized)
    except ValueError:
        index = 0
    if index > 0 and index <= len(terminals):
        return _terminal_id_from_item(terminals[index - 1])
    lowered = normalized.lower()
    for item in terminals:
        term_id = _terminal_id_from_item(item)
        if term_id and (term_id.lower() == lowered or term_id.lower().endswith(lowered)):
            return term_id
    return normalized


def _agent_id_from_item(item: dict[str, Any]) -> str:
    return (
        _string_value(item.get("agentId"))
        or _string_value(item.get("id"))
        or _string_value(item.get("sessionId"))
    ).strip()


def _agent_title_from_item(item: dict[str, Any]) -> str:
    return (
        _string_value(item.get("title"))
        or _string_value(item.get("name"))
        or _string_value(item.get("label"))
        or "Xenesis Agent"
    ).strip()


def _list_desk_agents(session_key: str) -> dict[str, Any]:
    payload = _desk_call_capability("xd.xenesis.agents.list")
    if not _is_failure(payload):
        agents = _array_from(payload, ["agents"], ["result", "agents"])
        with _DESK_LOCK:
            session = _desk_session(session_key)
            session["lastAgents"] = [_object_value(agent) for agent in agents]
    return payload


def _format_desk_agents(payload: dict[str, Any], session_key: str) -> dict[str, Any] | str:
    if _is_failure(payload):
        return _failure_text(payload, "Failed to list Xenesis Agents")
    agents = [_object_value(agent) for agent in _array_from(payload, ["agents"], ["result", "agents"])]
    if not agents:
        return "No Xenesis Agent panes are currently visible."
    with _DESK_LOCK:
        session = _desk_session(session_key)
        session["lastAgents"] = agents
        attached_agent_id = _string_value(session.get("agentId")).strip()
    lines: list[str] = []
    for index, item in enumerate(agents, start=1):
        agent_id = _agent_id_from_item(item) or f"#{index}"
        title = _agent_title_from_item(item)
        workspace = _string_value(item.get("workspace"))
        provider = _string_value(item.get("provider"))
        runtime_mode = _string_value(item.get("runtimeMode") or item.get("mode"))
        status = _string_value(item.get("status"))
        active = "attached" if attached_agent_id and agent_id == attached_agent_id else ""
        meta = [
            active,
            f"status: {_truncate_terminal_meta(status, 48)}" if status else "",
            f"provider: {_truncate_terminal_meta(provider, 48)}" if provider else "",
            f"mode: {_truncate_terminal_meta(runtime_mode, 48)}" if runtime_mode else "",
            f"workspace: {_truncate_terminal_meta(workspace, 120)}" if workspace else "",
        ]
        heading = f"{index}. {agent_id} - {title}"
        details = " | ".join(part for part in meta if part)
        lines.append(f"{heading}\n   {details}" if details else heading)
    actions = [
        {"label": f"Attach {index}", "value": f"/desk agent attach {index}"}
        for index, item in enumerate(agents[:5], start=1)
        if _agent_id_from_item(item)
    ]
    text = "\n".join(lines)
    return {"text": text, "actions": actions} if actions else text


def _resolve_desk_agent_id(session_key: str, selector: str) -> str:
    normalized = str(selector or "").strip()
    if not normalized:
        return ""
    with _DESK_LOCK:
        session = _desk_session(session_key)
        agents = [_object_value(agent) for agent in session.get("lastAgents") or []]
    if not agents:
        payload = _list_desk_agents(session_key)
        if not _is_failure(payload):
            agents = [_object_value(agent) for agent in _array_from(payload, ["agents"], ["result", "agents"])]
    try:
        index = int(normalized)
    except ValueError:
        index = 0
    if index > 0 and index <= len(agents):
        return _agent_id_from_item(agents[index - 1])
    lowered = normalized.lower()
    for item in agents:
        agent_id = _agent_id_from_item(item)
        if agent_id and (agent_id.lower() == lowered or agent_id.lower().endswith(lowered)):
            return agent_id
    return normalized


def _require_desk_agent_attached(session_key: str) -> dict[str, Any] | str:
    session = _desk_session(session_key)
    if not _string_value(session.get("agentId")).strip():
        return "No Xenesis Agent is attached. Use /desk agents, then /desk agent attach <agentId|number>."
    return session


def _format_desk_agent_status(session_key: str) -> str:
    session_or_error = _require_desk_agent_attached(session_key)
    if isinstance(session_or_error, str):
        return session_or_error
    agent_id = _string_value(session_or_error.get("agentId")).strip()
    payload = _desk_call_capability("xd.xenesis.agents.status", {"agentId": agent_id})
    if _is_failure(payload):
        return _failure_text(payload, "Failed to read Xenesis Agent status")
    status = _object_at(payload, ["status"]) or _object_at(payload, ["result", "status"]) or _object_value(payload.get("result")) or payload
    lines = [
        f"Agent: {agent_id}",
        f"Title: {_string_value(status.get('title') or status.get('name')) or 'Xenesis Agent'}",
        f"Status: {_string_value(status.get('status')) or 'unknown'}",
        f"Running: {_string_value(status.get('running')) or 'unknown'}",
        f"Provider: {_string_value(status.get('provider')) or 'unknown'}",
        f"Workspace: {_string_value(status.get('workspace')) or 'unknown'}",
        f"Watch: {'on' if session_or_error.get('agentWatching') else 'off'}",
    ]
    return "\n".join(lines)


def _require_desk_attached(session_key: str) -> dict[str, Any] | str:
    session = _desk_session(session_key)
    if not _string_value(session.get("termId")).strip():
        return "No Xenesis Desk terminal is attached. Use /desk terminals, then /desk attach <termId|number|suffix>."
    return session


def _format_desk_status(session_key: str) -> str:
    session = _require_desk_attached(session_key)
    if isinstance(session, str):
        return session
    term_id = _string_value(session.get("termId")).strip()
    payload = _desk_call_capability("xd.automation.terminals.status", {"termId": term_id})
    if _is_failure(payload):
        return _failure_text(payload, "Failed to read automation status")
    status = _object_at(payload, ["status"]) or _object_at(payload, ["result", "status"]) or _object_value(payload.get("result")) or payload
    lines = [
        f"Terminal: {term_id}",
        f"Automation: {_string_value(status.get('enabled')) or 'unknown'}",
        f"Mode: {_string_value(status.get('mode')) or 'unknown'}",
        f"Stage: {_string_value(status.get('stage')) or 'unknown'}",
    ]
    if status.get("blocked") is True:
        lines.append(f"Blocked: {_string_value(status.get('blockReason')) or 'yes'}")
    return "\n".join(lines)


def _pending_options_from_event(event: dict[str, Any]) -> list[dict[str, Any]]:
    raw_options = event.get("options")
    if not isinstance(raw_options, list):
        raw_options = []
    options: list[dict[str, Any]] = []
    for index, raw_option in enumerate(raw_options, start=1):
        option = _object_value(raw_option)
        try:
            option_index = int(option.get("index") or index)
        except (TypeError, ValueError):
            option_index = index
        input_text = _string_value(option.get("input") or option.get("value") or f"{option_index}\r")
        label = _string_value(option.get("label") or option.get("text") or input_text.strip() or f"Option {index}")
        options.append({
            "index": option_index,
            "input": _normalize_terminal_input(input_text),
            "label": label,
        })
    return options


def _pending_from_event(event: dict[str, Any]) -> dict[str, Any] | None:
    if _string_value(event.get("kind")) != "pending":
        return None
    event_id = _string_value(event.get("id"))
    if not event_id:
        return None
    return {
        "id": event_id,
        "suggestedInput": _string_value(event.get("suggestedInput")) or None,
        "options": _pending_options_from_event(event),
    }


def _format_desk_event(event: dict[str, Any]) -> str:
    kind = _string_value(event.get("kind"))
    if kind == "stream":
        text = _relay_desk_stream_text(event)
        return f"Output\n{text}" if text else ""
    if kind == "user_input":
        return ""
    if kind == "pending":
        reason = _string_value(event.get("reason")) or "Input requested."
        options = _pending_options_from_event(event)
        option_lines = [f"{option['index']}. {option['label']}" for option in options]
        return "\n".join(["Input requested", reason, *option_lines])
    if kind == "blocked":
        return f"Automation blocked\n{_string_value(event.get('reason')) or 'Blocked.'}"
    if kind == "manual_sent":
        return ""
    if kind == "auto_input":
        return f"Automatic input sent\n{_string_value(event.get('reason'))}".strip()
    if kind == "llm_error":
        return f"Automation LLM error\n{_string_value(event.get('reason')) or 'Unknown error.'}"
    return ""


def _desk_collect_events(session_key: str) -> dict[str, Any] | str | None:
    session_or_error = _require_desk_attached(session_key)
    if isinstance(session_or_error, str):
        return session_or_error
    session = session_or_error
    term_id = _string_value(session.get("termId")).strip()
    payload = _desk_call_capability("xd.automation.terminals.events", {"termId": term_id})
    if _is_failure(payload):
        return _failure_text(payload, "Failed to read automation events")
    events = _array_from(payload, ["events"], ["result", "events"])
    lines: list[str] = []
    stream_lines: list[str] = []
    actions: list[dict[str, str]] = []
    filter_state = {"tool": 0, "edit": 0}
    seen_ids = session.get("seenEventIds")
    if not isinstance(seen_ids, set):
        seen_ids = set()
        session["seenEventIds"] = seen_ids
    for raw_event in events:
        item = _object_value(raw_event)
        event_id = _string_value(item.get("id"))
        if event_id and event_id in seen_ids:
            continue
        if event_id:
            seen_ids.add(event_id)
        if _string_value(item.get("kind")) == "stream":
            stream_text = _relay_desk_stream_text(item, filter_state)
            if stream_text:
                stream_lines.append(stream_text)
        else:
            formatted = _format_desk_event(item)
            if formatted:
                lines.append(formatted)
        pending = _pending_from_event(item)
        if pending:
            session["lastPending"] = pending
            actions = [
                {
                    "label": re.sub(r"^\d+\.\s*", "", _string_value(option.get("label"))),
                    "value": f"/desk choose {option.get('index')}",
                }
                for option in _array_from(pending, ["options"])
            ]
    compact_stream_lines = _compact_desk_stream_output(stream_lines)
    if compact_stream_lines:
        lines.insert(0, "\n".join(["Output", *compact_stream_lines]))
    if not lines:
        return None
    text = "\n\n".join(lines)
    return {"text": text, "actions": actions} if actions else text


def _agent_event_is_deliverable(event: dict[str, Any]) -> bool:
    kind = _string_value(event.get("kind")).lower()
    if event.get("externalSafe") is not True:
        return False
    if event.get("final") is True:
        return True
    return kind in {"assistant_final", "final"}


def _agent_event_text(event: dict[str, Any]) -> str:
    return (
        _string_value(event.get("text"))
        or _string_value(event.get("summary"))
        or _string_value(event.get("content"))
        or _string_value(event.get("message"))
    ).strip()


def _desk_collect_agent_events(session_key: str) -> str | None:
    session_or_error = _require_desk_agent_attached(session_key)
    if isinstance(session_or_error, str):
        return session_or_error
    agent_id = _string_value(session_or_error.get("agentId")).strip()
    payload = _desk_call_capability("xd.xenesis.agents.events", {"agentId": agent_id})
    if _is_failure(payload):
        return _failure_text(payload, "Failed to read Xenesis Agent events")
    events = _array_from(payload, ["events"], ["result", "events"])
    seen_ids = session_or_error.get("agentSeenEventIds")
    if not isinstance(seen_ids, set):
        seen_ids = set()
        session_or_error["agentSeenEventIds"] = seen_ids
    lines: list[str] = []
    for raw_event in events:
        item = _object_value(raw_event)
        if not _agent_event_is_deliverable(item):
            continue
        text = _agent_event_text(item)
        if not text:
            continue
        event_id = _string_value(item.get("id")) or f"{_string_value(item.get('kind'))}:{text}"
        if event_id and event_id in seen_ids:
            continue
        if event_id:
            seen_ids.add(event_id)
        lines.append(text)
    if not lines:
        return None
    return "\n\n".join(lines)


def _desk_response_text(response: dict[str, Any] | str | None) -> str:
    if response is None:
        return ""
    if isinstance(response, dict):
        return _string_value(response.get("text"))
    return str(response)


def _desk_response_actions(response: dict[str, Any] | str | None) -> list[dict[str, str]]:
    if not isinstance(response, dict):
        return []
    actions = response.get("actions")
    return actions if isinstance(actions, list) else []


def _queue_desk_push(
    session_key: str,
    response: dict[str, Any] | str | None,
    *,
    source: str = "watch",
    mode: str = "desk-watch",
) -> None:
    text = _desk_response_text(response).strip()
    if not text:
        return
    actions = _desk_response_actions(response)
    message = {
        "id": f"{mode}-{int(time.time() * 1000)}",
        "mode": mode,
        "text": text,
        "actions": actions,
        "at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
    }
    with _DESK_LOCK:
        session = _desk_session(session_key)
        pushes = session.setdefault("pushes", [])
        if isinstance(pushes, list):
            pushes.append(message)
            if len(pushes) > 200:
                del pushes[:-200]
        metadata = _desk_session_log_metadata(session_key)
    _log_e2e_channel_send(
        source=source,
        session_key=session_key,
        platform=metadata.get("platform", "telegram"),
        text=text,
        mode=mode,
        action_count=len(actions),
        metadata=metadata,
        message_id=message["id"],
    )


def _desk_watch_loop(session_key: str) -> None:
    while True:
        with _DESK_LOCK:
            session = _DESK_SESSIONS.get(session_key)
            if not isinstance(session, dict) or not (session.get("watching") or session.get("agentWatching")):
                return
            interval = float(session.get("pollIntervalSeconds") or DEFAULT_DESK_WATCH_POLL_INTERVAL_SECONDS)
        time.sleep(max(0.25, min(interval, 30.0)))
        with _DESK_LOCK:
            session = _DESK_SESSIONS.get(session_key)
            if not isinstance(session, dict) or not (session.get("watching") or session.get("agentWatching")):
                return
        try:
            if session.get("watching"):
                response = _desk_collect_events(session_key)
                _queue_desk_push(session_key, response)
            if session.get("agentWatching"):
                response = _desk_collect_agent_events(session_key)
                _queue_desk_push(session_key, response, source="agent-watch", mode="desk-agent-watch")
        except Exception as exc:
            _queue_desk_push(session_key, f"Remote Desk watch failed: {exc}")


def _start_desk_watch(session_key: str, request: dict[str, Any]) -> None:
    session = _desk_session(session_key)
    try:
        interval_ms = float(request.get("watchPollIntervalMs") or request.get("pollIntervalMs") or 0)
    except (TypeError, ValueError):
        interval_ms = 0
    with _DESK_LOCK:
        if interval_ms > 0:
            session["pollIntervalSeconds"] = max(0.25, interval_ms / 1000.0)
        thread = session.get("watchThread")
        if isinstance(thread, threading.Thread) and thread.is_alive():
            return
        thread = threading.Thread(target=_desk_watch_loop, args=(session_key,), daemon=True)
        session["watchThread"] = thread
        thread.start()


def _start_desk_terminal_watch(session_key: str, request: dict[str, Any]) -> None:
    with _DESK_LOCK:
        session = _desk_session(session_key)
        session["watching"] = True
    _start_desk_watch(session_key, request)


def _start_desk_agent_watch(session_key: str, request: dict[str, Any]) -> None:
    with _DESK_LOCK:
        session = _desk_session(session_key)
        session["agentWatching"] = True
    _start_desk_watch(session_key, request)


def _handle_desk_attach(session_key: str, term_id: str) -> dict[str, Any] | str:
    selector = str(term_id or "").strip()
    if not selector:
        return "Usage: /desk attach <termId|number|suffix>"
    normalized = _resolve_terminal_id(session_key, selector)
    if not normalized:
        return f"No terminal matches {selector}."
    with _DESK_LOCK:
        session = _desk_session(session_key)
        _desk_stop_session_watch(session)
        session["termId"] = normalized
        session["seenEventIds"] = set()
        session["lastPending"] = None
    return {
        "text": f"Attached to terminal {normalized}.",
        "actions": [
            {"label": "Watch", "value": "/desk watch"},
            {"label": "Detach", "value": "/desk detach"},
        ],
    }


def _handle_desk_detach(session_key: str) -> str:
    with _DESK_LOCK:
        session = _DESK_SESSIONS.get(session_key)
        if isinstance(session, dict):
            _desk_stop_session_watch(session)
            session["termId"] = ""
            session["seenEventIds"] = set()
            session["lastPending"] = None
    return "Detached from Xenesis Desk terminal."


def _handle_desk_watch(session_key: str, request: dict[str, Any]) -> str:
    session_or_error = _require_desk_attached(session_key)
    if isinstance(session_or_error, str):
        return session_or_error
    term_id = _string_value(session_or_error.get("termId")).strip()
    payload = _desk_call_capability("xd.automation.terminals.setEnabled", {"termId": term_id, "enabled": True}, approved=True)
    if _is_failure(payload):
        return _failure_text(payload, "Failed to enable automation")
    _start_desk_terminal_watch(session_key, request)
    try:
        _queue_desk_push(session_key, _desk_collect_events(session_key))
    except Exception as exc:
        _queue_desk_push(session_key, f"Remote Desk watch failed: {exc}")
    return f"Automation enabled for {term_id}. New filtered output will be sent automatically. Use /desk detach to stop watching."


def _handle_desk_events(session_key: str) -> dict[str, Any] | str:
    response = _desk_collect_events(session_key)
    return response if response is not None else "No new automation events."


def _handle_desk_send(session_key: str, input_text: str) -> str:
    session_or_error = _require_desk_attached(session_key)
    if isinstance(session_or_error, str):
        return session_or_error
    term_id = _string_value(session_or_error.get("termId")).strip()
    normalized = _normalize_terminal_input(input_text)
    if not normalized:
        return "Usage: /desk send <text>"
    payload = _desk_call_capability("xd.automation.terminals.manualSend", {"termId": term_id, "input": normalized}, approved=True)
    if _is_failure(payload):
        return _failure_text(payload, "Failed to send terminal input")
    return f"Sent input to {term_id}."


def _handle_desk_choose(session_key: str, choice_text: str) -> str:
    session_or_error = _require_desk_attached(session_key)
    if isinstance(session_or_error, str):
        return session_or_error
    try:
        choice = int(str(choice_text or "").strip())
    except ValueError:
        return "Usage: /desk choose <number>"
    pending = _object_value(session_or_error.get("lastPending"))
    if not pending:
        return "No pending automation input request is available."
    options = _array_from(pending, ["options"])
    selected = next((_object_value(option) for option in options if int(_object_value(option).get("index") or 0) == choice), {})
    input_text = _string_value(selected.get("input")) or (_string_value(pending.get("suggestedInput")) if choice == 1 else "")
    if not input_text:
        return f"No pending option {choice} is available."
    term_id = _string_value(session_or_error.get("termId")).strip()
    payload = _desk_call_capability(
        "xd.automation.terminals.manualSend",
        {
            "termId": term_id,
            "input": _normalize_terminal_input(input_text),
            "pendingEventId": _string_value(pending.get("id")),
        },
        approved=True,
    )
    if _is_failure(payload):
        return _failure_text(payload, "Failed to send selected option")
    session_or_error["lastPending"] = None
    return f"Sent option {choice} to {term_id}."


def _handle_desk_render(xcon_input: str, *, theme: str = "light", title: str = "") -> dict[str, Any]:
    if not xcon_input.strip():
        return {"text": "Usage: /desk render <xcon/sketch markup>", "actions": []}
    args: dict[str, Any] = {"xcon": xcon_input}
    if theme:
        args["theme"] = theme
    if title:
        args["title"] = title
    payload = _desk_call_capability("xd.xcon.renderToPng", args, approved=True)
    if _is_failure(payload):
        return {"text": _failure_text(payload, "XCON render failed"), "actions": []}
    result = _object_value(payload.get("result")) or payload
    base64_data = _string_value(result.get("base64"))
    png_bytes = result.get("pngBytes") or 0
    width = result.get("width") or 0
    height = result.get("height") or 0
    if not base64_data:
        return {"text": "XCON render returned empty image.", "actions": []}
    return {
        "text": f"XCON rendered ({width}x{height}, {png_bytes} bytes)",
        "image": {
            "base64": base64_data,
            "mimeType": "image/png",
            "width": width,
            "height": height,
            "pngBytes": png_bytes,
        },
        "actions": [],
    }


def _handle_desk_agent_attach(session_key: str, selector: str) -> dict[str, Any] | str:
    agent_id = _resolve_desk_agent_id(session_key, selector)
    if not agent_id:
        return "Usage: /desk agent attach <agentId|number>"
    with _DESK_LOCK:
        session = _desk_session(session_key)
        _desk_stop_agent_watch(session)
        session["agentId"] = agent_id
        session["agentSeenEventIds"] = set()
    return {
        "text": f"Attached to Xenesis Agent {agent_id}.",
        "actions": [
            {"label": "Watch", "value": "/desk agent watch"},
            {"label": "Events", "value": "/desk agent events"},
            {"label": "Detach", "value": "/desk agent detach"},
        ],
    }


def _handle_desk_agent_detach(session_key: str) -> str:
    with _DESK_LOCK:
        session = _DESK_SESSIONS.get(session_key)
        if isinstance(session, dict):
            _desk_stop_agent_watch(session)
            session["agentId"] = ""
            session["agentSeenEventIds"] = set()
    return "Detached from Xenesis Agent."


def _handle_desk_agent_watch(session_key: str, request: dict[str, Any]) -> str:
    session_or_error = _require_desk_agent_attached(session_key)
    if isinstance(session_or_error, str):
        return session_or_error
    agent_id = _string_value(session_or_error.get("agentId")).strip()
    _start_desk_agent_watch(session_key, request)
    try:
        _queue_desk_push(
            session_key,
            _desk_collect_agent_events(session_key),
            source="agent-watch",
            mode="desk-agent-watch",
        )
    except Exception as exc:
        _queue_desk_push(session_key, f"Xenesis Agent watch failed: {exc}", source="agent-watch", mode="desk-agent-watch")
    return f"Watching Xenesis Agent {agent_id}. New final responses will be sent automatically. Use /desk agent detach to stop watching."


def _handle_desk_agent_events(session_key: str) -> str:
    response = _desk_collect_agent_events(session_key)
    return response if response is not None else "No new Xenesis Agent events."


def _handle_desk_agent_send(session_key: str, text: str) -> str:
    session_or_error = _require_desk_agent_attached(session_key)
    if isinstance(session_or_error, str):
        return session_or_error
    input_text = str(text or "").strip()
    if not input_text:
        return "Usage: /desk agent send <text>"
    agent_id = _string_value(session_or_error.get("agentId")).strip()
    metadata = _desk_session_log_metadata(session_key)
    payload = _desk_call_capability(
        "xd.xenesis.agents.submit",
        {
            "agentId": agent_id,
            "text": input_text,
            "conversationId": session_key,
            "senderId": metadata.get("userId", "e2e-user"),
            "senderName": metadata.get("userName", "e2e-user"),
        },
        approved=True,
    )
    if _is_failure(payload):
        return _failure_text(payload, "Failed to send Xenesis Agent message")
    return f"Sent message to Xenesis Agent {agent_id}."


def _handle_desk_agent_command(session_key: str, rest: str, request: dict[str, Any]) -> dict[str, Any] | str:
    subcommand, subrest = _first_word_and_rest(rest)
    if not subcommand or subcommand in {"help", "list", "agents"}:
        return _format_desk_agents(_list_desk_agents(session_key), session_key)
    if subcommand == "attach":
        return _handle_desk_agent_attach(session_key, subrest)
    if subcommand == "detach":
        return _handle_desk_agent_detach(session_key)
    if subcommand == "status":
        return _format_desk_agent_status(session_key)
    if subcommand == "watch":
        return _handle_desk_agent_watch(session_key, request)
    if subcommand in {"unwatch", "stop"}:
        with _DESK_LOCK:
            session = _desk_session(session_key)
            _desk_stop_agent_watch(session)
        return "Stopped watching Xenesis Agent responses."
    if subcommand == "events":
        return _handle_desk_agent_events(session_key)
    if subcommand == "send":
        return _handle_desk_agent_send(session_key, subrest)
    return f"Unknown /desk agent command: {subcommand}\n\n{_desk_help_text()}"


def _run_desk_channel_command(args: str, *, request: dict[str, Any], session_key: str) -> dict[str, Any]:
    command, rest = _first_word_and_rest(args)
    if not command or command == "help":
        response: dict[str, Any] | str = _desk_help_text()
    elif command == "agents":
        response = _format_desk_agents(_list_desk_agents(session_key), session_key)
    elif command == "agent":
        response = _handle_desk_agent_command(session_key, rest, request)
    elif command == "terminals":
        response = _format_desk_terminal_list(_list_desk_terminals(session_key), session_key)
    elif command == "attach":
        response = _handle_desk_attach(session_key, rest)
    elif command == "detach":
        response = _handle_desk_detach(session_key)
    elif command == "status":
        response = _format_desk_status(session_key)
    elif command == "watch":
        response = _handle_desk_watch(session_key, request)
    elif command == "events":
        response = _handle_desk_events(session_key)
    elif command == "send":
        response = _handle_desk_send(session_key, rest)
    elif command == "choose":
        response = _handle_desk_choose(session_key, rest)
    elif command in ("render", "image"):
        response = _handle_desk_render(rest)
    else:
        response = f"Unknown /desk command: {command}\n\n{_desk_help_text()}"
    result: dict[str, Any] = {
        "response": response,
        "outbound": _desk_response_text(response),
        "actions": _desk_response_actions(response),
    }
    if isinstance(response, dict) and response.get("image"):
        result["image"] = response["image"]
    return result


def _should_handle_desk_as_channel(args: str, session_key: str) -> bool:
    command, _rest = _first_word_and_rest(args)
    if command in REMOTE_DESK_COMMANDS:
        return True
    if command == "status" and _desk_has_attached_session(session_key):
        return True
    return False


def _poll_desk_messages(request_id: Any, request: dict[str, Any]) -> dict[str, Any]:
    session_key = str(request.get("sessionKey") or DEFAULT_SESSION_KEY)
    with _DESK_LOCK:
        session = _desk_session(session_key)
        pushes = session.get("pushes")
        messages = list(pushes) if isinstance(pushes, list) else []
        if isinstance(pushes, list):
            pushes.clear()
        attached = _string_value(session.get("termId"))
        watching = bool(session.get("watching"))
        attached_agent = _string_value(session.get("agentId"))
        agent_watching = bool(session.get("agentWatching"))
    return {
        "id": request_id,
        "ok": True,
        "method": "poll",
        "sessionKey": session_key,
        "attachedTermId": attached,
        "watching": watching,
        "attachedAgentId": attached_agent,
        "agentWatching": agent_watching,
        "messages": messages,
    }


def _health(request_id: Any) -> dict[str, Any]:
    bridge_url, bridge_token = plugin._read_bridge_config()
    cache = getattr(plugin, "_SELECTION_CACHE", {})
    return {
        "id": request_id,
        "ok": True,
        "method": "health",
        "bridgeUrl": bridge_url,
        "bridgeToken": "present" if bridge_token else "missing",
        "xenesisGatewayUrl": _gateway_url({}),
        "xenesisGatewayToken": "present" if _gateway_token({}) else "missing",
        "toolset": plugin.TOOLSET,
        "tools": len(getattr(plugin, "_TOOLS", [])),
        "actionTokenDigits": getattr(plugin, "ACTION_TOKEN_DIGITS", 0),
        "sessionCacheCount": len(cache) if isinstance(cache, dict) else 0,
        "defaultSessionKey": DEFAULT_SESSION_KEY,
    }


def _reset(request_id: Any) -> dict[str, Any]:
    cache = getattr(plugin, "_SELECTION_CACHE", None)
    if isinstance(cache, dict):
        cache.clear()
    with _DESK_LOCK:
        for session in _DESK_SESSIONS.values():
            if isinstance(session, dict):
                _desk_stop_session_watch(session)
        _DESK_SESSIONS.clear()
    return {
        "id": request_id,
        "ok": True,
        "method": "reset",
        "message": "Xenesis Desk E2E bot cache cleared.",
    }


def _send(request: dict[str, Any]) -> dict[str, Any]:
    request_id = request.get("id")
    text = str(request.get("text") or "")
    session_key = str(request.get("sessionKey") or DEFAULT_SESSION_KEY)
    platform = str(request.get("platform") or "telegram")
    raw_message = _request_raw_message(request, platform=platform)
    event = SimpleNamespace(
        text=text,
        platform=platform,
        user_id=str(request.get("userId") or "e2e-user"),
        chat_id=str(request.get("chatId") or "e2e-chat"),
        source=SimpleNamespace(
            platform=SimpleNamespace(value=platform),
            chat_id=str(request.get("chatId") or "e2e-chat"),
            chat_name=str(request.get("chatName") or request.get("chatId") or "e2e-chat"),
            user_id=str(request.get("userId") or "e2e-user"),
            user_name=str(request.get("userName") or request.get("userId") or "e2e-user"),
            message_id=str(request.get("messageId") or ""),
        ),
        raw_message=raw_message,
    )
    _update_desk_session_log_metadata(session_key, request, platform=platform)

    token = approval.set_current_session_key(session_key)
    try:
        rewrite = plugin.handle_pre_gateway_dispatch(event=event)
        effective_text = text
        if isinstance(rewrite, dict) and rewrite.get("action") == "rewrite":
            effective_text = str(rewrite.get("text") or text)

        desk_args = _strip_command_prefix(effective_text, DESK_COMMAND_PREFIXES)
        xd_args = _strip_command_prefix(effective_text, XD_COMMAND_PREFIXES)
        gateway = None
        desk = None
        if desk_args is not None:
            if _should_handle_desk_as_channel(desk_args, session_key):
                mode = "desk-channel-sim"
                desk = _run_desk_channel_command(
                    desk_args,
                    request=request,
                    session_key=session_key,
                )
                outbound = desk["outbound"]
            else:
                mode = "xenesis-gateway"
                gateway = _run_desk_gateway_command(
                    desk_args,
                    request=request,
                    platform=platform,
                    session_key=session_key,
                    event=event,
                )
                outbound = _format_gateway_outbound(gateway["result"])
        elif xd_args is not None:
            mode = "xd-command"
            outbound = plugin.handle_xd_command(xd_args)
        elif _desk_has_attached_session(session_key) and not effective_text.strip().startswith("/"):
            mode = "desk-channel-sim"
            desk = {
                "response": _handle_desk_send(session_key, effective_text),
                "actions": [],
            }
            desk["outbound"] = _desk_response_text(desk["response"])
            outbound = desk["outbound"]
        elif _desk_has_attached_agent_session(session_key) and not effective_text.strip().startswith("/"):
            mode = "desk-channel-sim"
            desk = {
                "response": _handle_desk_agent_send(session_key, effective_text),
                "actions": [],
            }
            desk["outbound"] = _desk_response_text(desk["response"])
            outbound = desk["outbound"]
        else:
            mode = "provider-fallback"
            outbound = PROVIDER_AUTH_FALLBACK

        actions = desk.get("actions", []) if isinstance(desk, dict) else []
        response_payload = {
            "id": request_id,
            "ok": True,
            "method": "send",
            "mode": mode,
            "sessionKey": session_key,
            "inbound": text,
            "rewrite": rewrite,
            "effectiveText": effective_text,
            "gateway": gateway,
            "desk": desk,
            "actions": desk.get("actions", []) if isinstance(desk, dict) else [],
            "event": {
                "platform": platform,
                "chatId": event.chat_id,
                "userId": event.user_id,
                "chatName": getattr(event.source, "chat_name", ""),
                "userName": getattr(event.source, "user_name", ""),
                "xenesis_desk": raw_message.get("xenesis_desk"),
            },
            "outbound": str(outbound or ""),
        }
        if isinstance(desk, dict) and desk.get("image"):
            response_payload["image"] = desk["image"]
        _log_e2e_channel_send(
            source="send",
            session_key=session_key,
            platform=platform,
            text=response_payload["outbound"],
            mode=mode,
            action_count=len(actions),
            request=request,
        )
        return response_payload
    except Exception as exc:  # pragma: no cover - defensive worker boundary
        _log_e2e_channel_send(
            source="send",
            session_key=session_key,
            platform=platform,
            text="",
            mode="send-error",
            request=request,
            status="error",
            error=str(exc),
        )
        return {
            "id": request_id,
            "ok": False,
            "method": "send",
            "sessionKey": session_key,
            "inbound": text,
            "error": str(exc),
            "traceback": traceback.format_exc(),
        }
    finally:
        approval.reset_current_session_key(token)


def _handle(request: dict[str, Any]) -> dict[str, Any]:
    method = str(request.get("method") or "send")
    request_id = request.get("id")
    if method == "health":
        return _health(request_id)
    if method == "reset":
        return _reset(request_id)
    if method == "poll":
        return _poll_desk_messages(request_id, request)
    if method == "send":
        return _send(request)
    return {
        "id": request_id,
        "ok": False,
        "method": method,
        "error": f"Unsupported method: {method}",
    }


def main() -> int:
    for line in sys.stdin:
        if not line.strip():
            continue
        try:
            request = json.loads(line)
            if not isinstance(request, dict):
                raise ValueError("request must be a JSON object")
            response = _handle(request)
        except Exception as exc:  # pragma: no cover - defensive worker boundary
            response = {
                "id": None,
                "ok": False,
                "method": "parse",
                "error": str(exc),
                "traceback": traceback.format_exc(),
            }
        sys.stdout.write(json.dumps(_json_safe(response), ensure_ascii=True) + "\n")
        sys.stdout.flush()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
