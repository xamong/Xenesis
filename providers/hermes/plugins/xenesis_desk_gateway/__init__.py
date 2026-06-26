"""Xenesis Desk gateway plugin.

Adds mobile/gateway-safe tools for controlling Xenesis Desk through its local MCP
bridge. Terminal execution requires a gateway approval before the command is
forwarded to Xenesis Desk.
"""

from __future__ import annotations

import base64
import json
import hashlib
import os
import re
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

from .bridge import (
    HTTPError,
    _bridge_state_file,
    _call_bridge_with_config,
    _read_bridge_config,
    bridge_doctor,
    bridge_diagnostics,
    check_xenesis_desk_bridge,
)
from .constants import (
    ACTION_CALLBACK_RE,
    ACTION_CLEAR_MODES,
    ACTION_CLEAR_USAGE,
    ACTION_COMMAND_CALLBACK_RE,
    ACTION_TOKEN_DIGITS,
    ACTION_TOKEN_TTL_SECONDS,
    APPROVAL_PATTERN_KEY,
    APPROVAL_TIMEOUT_SECONDS,
    BARE_SELECTOR_RE,
    BRIDGE_TIMEOUT_SECONDS,
    DEFAULT_BRIDGE_URL,
    DOCK_CLOSE_APPROVAL_PATTERN_KEY,
    DOCK_SELECTION_KINDS,
    EXTENSION_APPROVAL_PATTERN_KEY,
    GLOBAL_DOCK_SELECTION_KEY,
    GLOBAL_LAST_SELECTION_KEY,
    GLOBAL_SELECTION_KEY,
    GLOBAL_TERMINAL_SELECTION_KEY,
    MCP_TOOL_TIMEOUT_SECONDS,
    PANEL_PLACEMENTS,
    PLAYWRIGHT_APPROVAL_PATTERN_KEY,
    SELECTOR_RE,
    TOOLSET,
    WINDOWS_ABSOLUTE_PATH_RE,
    WORKFLOW_FAILURE_MARKERS,
    WSL_MOUNT_PATH_RE,
    XCON_APPROVAL_PATTERN_KEY,
    XCON_FENCE_LANGUAGES,
    XD_ARGS_HINT,
)
from .mcp_client import (
    _call_xenesis_desk_mcp_tool,
    _mcp_tool_payload_from_envelope,
    _path_text_key,
    _same_path_text,
    _xenesis_desk_mcp_command,
    _xenesis_desk_mcp_extra_args,
    _xenesis_desk_mcp_server_candidates,
    _xenesis_desk_mcp_server_path,
)
from .payloads import (
    _bridge_open_file_payload,
    _is_bridge_absolute_file_path,
    _is_windows_absolute_path,
    _is_wsl_mount_path,
    _normalize_placement,
    _payload,
    _render_options,
    _resolve_file_path_for_bridge,
)
from .schemas import (
    ACTION_CLEAR_SCHEMA,
    ACTION_HISTORY_SCHEMA,
    ACTIVE_CONTEXT_SCHEMA,
    CLOSE_CONTENT_SCHEMA,
    COMMAND_PALETTE_SCHEMA,
    CONTEXT_ACTIONS_SCHEMA,
    CREATE_XCON_MARKDOWN_FROM_CONTENT_SCHEMA,
    CREATE_XCON_MARKDOWN_SCHEMA,
    EXPORT_XCON_PDF_SCHEMA,
    FOCUS_CONTENT_SCHEMA,
    GET_XCON_PROMPT_SCHEMA,
    LIST_EXTENSION_COMMANDS_SCHEMA,
    LIST_OPEN_FILES_SCHEMA,
    LIST_PANELS_SCHEMA,
    MOBILE_DASHBOARD_SCHEMA,
    OPEN_FILE_SCHEMA,
    PLAYWRIGHT_RUN_SCHEMA,
    PLAYWRIGHT_SNAPSHOT_SCHEMA,
    RECENT_DIAGNOSTICS_SCHEMA,
    RUN_COMMAND_PALETTE_SCHEMA,
    RUN_EXTENSION_COMMAND_SCHEMA,
    STATE_SCHEMA,
    TERMINAL_LIST_SCHEMA,
    TERMINAL_PREVIEW_SCHEMA,
    TERMINAL_RUN_SCHEMA,
    TERMINAL_STOP_SCHEMA,
    TERMINAL_TAIL_SCHEMA,
    VALIDATE_XCON_MARKDOWN_SCHEMA,
)
from .text_utils import (
    _first_word_and_rest,
    _json_error,
    _json_result,
    _parse_json_result,
    _split_args,
    _strip_wrapping_quotes,
)
from .xcon_utils import (
    _build_xcon_markdown_document,
    _markdown_title_from_content,
    _normalize_markdown_file_name,
    _normalize_mode,
    _normalize_title,
    _quote_xcon,
    _slugify,
    _validate_xcon_markdown_content,
    _write_xcon_markdown_file,
    _xcon_approval_description,
    _xcon_bridge_path,
    _xcon_requested_file_path,
)
_SELECTION_CACHE: dict[str, dict[str, Any]] = {}
_SESSION_ARTIFACTS: dict[str, list[dict[str, Any]]] = {}
_ACTION_APPROVAL_BYPASS = False
ACTION_INBOX_OPEN_COMMAND_ID = "xenesis-desk.core-tools.openHermesActionInbox"
_XCON_ARTIFACT_TOOL_NAMES = {
    "xenesis_desk_mobile_create_xcon_markdown_from_content",
    "xenesis_desk_mobile_create_xcon_markdown",
    "xenesis_desk_mobile_export_xcon_pdf",
}
_XCON_DIRECT_ARTIFACT_TOOL_NAMES = _XCON_ARTIFACT_TOOL_NAMES | {
    "write_file",
    "xenesis_desk_mobile_open_file",
}
_TELEGRAM_PDF_OUT_DIR = "telegram-pdf-auto"
_BOT_INLINE_ARTIFACT_MAX_CHARS = 250_000
_BOT_INLINE_ARTIFACT_KINDS = {
    "markdown-xcon",
    "xcon",
    "xcon-sketch",
    "sketch",
}
SELECTABLE_REPLY_PREFIXES = {
    "terminals": "tail",
    "panels": "focus",
    "files": "focus",
    "context_actions": "context-actions",
    "menu_actions": "menu",
    "quick_actions": "quick",
    "workflows": "workflow",
    "recommendations": "recommend",
    "inbox": "inbox open",
    "commands": "command",
    "extensions": "exec",
    "packet_artifacts": "packet open",
    "packet_replay": "packet replay",
}
MENU_ACTIONS: tuple[dict[str, str], ...] = (
    {"label": "Terminals", "command": "terminals", "count_key": "terminals"},
    {"label": "Panels", "command": "panels", "count_key": "panels"},
    {"label": "Files", "command": "files", "count_key": "openFiles"},
    {"label": "Extensions", "command": "extensions", "count_key": ""},
    {"label": "Diagnostics", "command": "logs 20", "count_key": "diagnostics"},
    {"label": "State summary", "command": "state", "count_key": ""},
    {"label": "Help", "command": "help", "count_key": ""},
)
WORKFLOW_TEMPLATES: tuple[dict[str, Any], ...] = (
    {
        "name": "inspect",
        "description": "Inspect state, terminals, panels, files, and recent diagnostics.",
        "steps": ["state", "terminals", "panels", "files", "logs 20"],
    },
    {
        "name": "extensions",
        "description": "List extension commands and show the mobile menu.",
        "steps": ["extensions", "menu"],
    },
    {
        "name": "terminal-check",
        "description": "List terminal sessions and recent diagnostics.",
        "steps": ["terminals", "logs 20"],
    },
)
XCON_PROMPT_KINDS = {
    "sketch-ui",
    "markdown-xcon",
    "dashboard-workflow",
    "family-template",
    "review-repair",
    "chat-artifact",
    "chain",
    "workflow",
    "template-lab",
}

def _selection_session_key() -> str:
    try:
        from tools import approval

        return str(approval.get_current_session_key(default="default") or "default")
    except Exception:
        return "default"


def _selector_index(value: str) -> int | None:
    match = SELECTOR_RE.match(str(value or "").strip())
    return int(match.group(1)) if match else None


def _selector_from_reply(value: str) -> str:
    text = str(value or "").strip()
    if SELECTOR_RE.match(text):
        return text
    match = BARE_SELECTOR_RE.match(text)
    return f"#{match.group(1)}" if match else ""


def _cache_selection(kind: str, items: list[dict[str, Any]]) -> None:
    copied = [dict(item) for item in items]
    session_key = _selection_session_key()
    bucket = _SELECTION_CACHE.setdefault(session_key, {})
    bucket[kind] = copied
    bucket["last_kind"] = kind
    selection_bucket = _SELECTION_CACHE.setdefault(GLOBAL_SELECTION_KEY, {})
    selection_bucket[kind] = copied
    selection_bucket["last_kind"] = kind
    if kind == "terminals":
        terminal_bucket = _SELECTION_CACHE.setdefault(GLOBAL_TERMINAL_SELECTION_KEY, {})
        terminal_bucket[kind] = copied
        terminal_bucket["last_kind"] = kind
    if kind in DOCK_SELECTION_KINDS:
        global_bucket = _SELECTION_CACHE.setdefault(GLOBAL_DOCK_SELECTION_KEY, {})
        global_bucket[kind] = copied
        global_bucket["last_kind"] = kind
    if kind == "terminals" or kind in DOCK_SELECTION_KINDS:
        last_bucket = _SELECTION_CACHE.setdefault(GLOBAL_LAST_SELECTION_KEY, {})
        last_bucket["last_kind"] = kind


def _cached_selection(kind: str, selector: str) -> tuple[dict[str, Any], str]:
    index = _selector_index(selector)
    if index is None:
        return {}, ""
    bucket = _SELECTION_CACHE.get(_selection_session_key(), {})
    items = bucket.get(kind)
    if isinstance(items, list) and 1 <= index <= len(items):
        item = items[index - 1]
        return dict(item) if isinstance(item, dict) else {}, ""
    global_bucket = _SELECTION_CACHE.get(GLOBAL_SELECTION_KEY, {})
    global_items = global_bucket.get(kind) if isinstance(global_bucket, dict) else None
    if isinstance(global_items, list) and 1 <= index <= len(global_items):
        item = global_items[index - 1]
        return dict(item) if isinstance(item, dict) else {}, ""
    return {}, f"No cached Xenesis Desk {kind} selection for {selector}. Run /xd {kind} first."


def _last_selection_kind() -> str:
    bucket = _SELECTION_CACHE.get(_selection_session_key(), {})
    last_kind = str(bucket.get("last_kind") or "") if isinstance(bucket, dict) else ""
    if last_kind:
        return last_kind
    selection_bucket = _SELECTION_CACHE.get(GLOBAL_SELECTION_KEY, {})
    last_kind = str(selection_bucket.get("last_kind") or "") if isinstance(selection_bucket, dict) else ""
    if last_kind:
        return last_kind
    global_bucket = _SELECTION_CACHE.get(GLOBAL_LAST_SELECTION_KEY, {})
    return str(global_bucket.get("last_kind") or "") if isinstance(global_bucket, dict) else ""


def _cached_terminal_selection(selector: str) -> tuple[dict[str, Any], str]:
    index = _selector_index(selector)
    if index is None:
        return {}, ""
    for key in (_selection_session_key(), GLOBAL_TERMINAL_SELECTION_KEY):
        bucket = _SELECTION_CACHE.get(key, {})
        items = bucket.get("terminals") if isinstance(bucket, dict) else None
        if isinstance(items, list) and 1 <= index <= len(items):
            item = items[index - 1]
            return dict(item) if isinstance(item, dict) else {}, ""
    return {}, f"No cached Xenesis Desk terminal selection for {selector}. Run /xd terminals first."


def _dock_selection_from_bucket(bucket: dict[str, Any], selector: str) -> tuple[dict[str, Any], str]:
    index = _selector_index(selector)
    if index is None:
        return {}, ""

    last_kind = str(bucket.get("last_kind") or "")
    ordered_kinds = []
    if last_kind in DOCK_SELECTION_KINDS:
        ordered_kinds.append(last_kind)
    ordered_kinds.extend(kind for kind in ("files", "panels") if kind not in ordered_kinds)

    for kind in ordered_kinds:
        items = bucket.get(kind)
        if isinstance(items, list) and 1 <= index <= len(items):
            item = items[index - 1]
            return dict(item) if isinstance(item, dict) else {}, ""
    return {}, ""


def _cached_dock_selection(selector: str) -> tuple[dict[str, Any], str]:
    index = _selector_index(selector)
    if index is None:
        return {}, ""

    bucket = _SELECTION_CACHE.get(_selection_session_key(), {})
    if isinstance(bucket, dict):
        item, _ = _dock_selection_from_bucket(bucket, selector)
        if item:
            return item, ""

    global_bucket = _SELECTION_CACHE.get(GLOBAL_DOCK_SELECTION_KEY, {})
    if isinstance(global_bucket, dict):
        item, _ = _dock_selection_from_bucket(global_bucket, selector)
        if item:
            return item, ""

    return {}, f"No cached Xenesis Desk dock selection for {selector}. Run /xd panels or /xd files first."


def _context_action_token(action: dict[str, Any], index: int) -> str:
    seed = "\0".join([
        _selection_session_key(),
        str(index),
        str(action.get("id") or ""),
        str(action.get("command") or ""),
    ])
    token_space = 10 ** max(ACTION_TOKEN_DIGITS, 1)
    number = int(hashlib.sha256(seed.encode("utf-8")).hexdigest(), 16) % token_space
    return f"{number:0{ACTION_TOKEN_DIGITS}d}"


def _cache_context_action_token(action: dict[str, Any], index: int) -> str:
    session_key = _selection_session_key()
    bucket = _SELECTION_CACHE.setdefault(session_key, {})
    tokens = bucket.setdefault("action_tokens", {})
    if not isinstance(tokens, dict):
        tokens = {}
        bucket["action_tokens"] = tokens
    token = _context_action_token(action, index)
    if token in tokens:
        token_space = 10 ** max(ACTION_TOKEN_DIGITS, 1)
        for offset in range(1, min(token_space, 1000)):
            candidate = f"{(int(token) + offset) % token_space:0{ACTION_TOKEN_DIGITS}d}"
            existing = tokens.get(candidate)
            if not isinstance(existing, dict) or existing.get("status") in {"used", "expired"}:
                token = candidate
                break
    sequence = int(bucket.get("action_token_sequence") or 0) + 1
    bucket["action_token_sequence"] = sequence
    now = time.time()
    tokens[token] = {
        "token": token,
        "action": dict(action),
        "status": "pending",
        "sequence": sequence,
        "createdAt": now,
        "expiresAt": now + max(float(ACTION_TOKEN_TTL_SECONDS), 0.0),
        "startedAt": None,
        "usedAt": None,
        "result": "",
    }
    return token


def _context_action_record_from_token(token: str) -> tuple[dict[str, Any], str]:
    target = _strip_wrapping_quotes(token).strip()
    if not target:
        return {}, "Usage: /xd action <token>"

    bucket = _SELECTION_CACHE.get(_selection_session_key(), {})
    tokens = bucket.get("action_tokens") if isinstance(bucket, dict) else None
    if isinstance(tokens, dict):
        item = tokens.get(target)
        if isinstance(item, dict):
            if isinstance(item.get("action"), dict):
                return item, ""
            command = str(item.get("command") or "").strip()
            if command:
                now = time.time()
                record = {
                    "token": target,
                    "action": dict(item),
                    "status": "pending",
                    "sequence": 0,
                    "createdAt": now,
                    "expiresAt": now + max(float(ACTION_TOKEN_TTL_SECONDS), 0.0),
                    "startedAt": None,
                    "usedAt": None,
                    "result": "",
                }
                tokens[target] = record
                return record, ""
    return {}, f"No cached Xenesis Desk action button for {target}. Run /xd context-actions first."


def _refresh_context_action_record_status(record: dict[str, Any]) -> str:
    status = str(record.get("status") or "pending")
    if status == "pending":
        try:
            expires_at = float(record.get("expiresAt") or 0)
        except (TypeError, ValueError):
            expires_at = 0
        if time.time() >= expires_at:
            record["status"] = "expired"
            status = "expired"
    return status


def _context_action_from_token(token: str) -> tuple[dict[str, Any], str]:
    record, error = _context_action_record_from_token(token)
    if error:
        return {}, error
    status = _refresh_context_action_record_status(record)
    if status == "expired":
        return {}, f"Xenesis Desk action token expired: {token}. Run /xd context-actions first."
    if status == "running":
        return {}, f"Xenesis Desk action token is already running: {token}. Use /xd action-status {token}."
    if status == "used":
        return {}, f"Xenesis Desk action token already used: {token}. Use /xd action-status {token}."
    action = record.get("action") if isinstance(record.get("action"), dict) else {}
    command = str(action.get("command") or "").strip()
    if not command:
        return {}, f"Cached Xenesis Desk action button {token} has no command. Run /xd context-actions first."
    return dict(action), ""


def _format_action_timestamp(value: Any) -> str:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return ""
    if number <= 0:
        return ""
    return time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(number))


def _format_context_action_status(token: str) -> str:
    record, error = _context_action_record_from_token(token)
    if error:
        return error
    status = _refresh_context_action_record_status(record)
    action = record.get("action") if isinstance(record.get("action"), dict) else {}
    lines = [
        "Xenesis Desk action token:",
        f"Token: {record.get('token') or token}",
        f"Status: {status}",
        f"Command: {action.get('command') or ''}",
    ]
    created = _format_action_timestamp(record.get("createdAt"))
    expires = _format_action_timestamp(record.get("expiresAt"))
    used = _format_action_timestamp(record.get("usedAt"))
    if created:
        lines.append(f"Created: {created}")
    if expires:
        lines.append(f"Expires: {expires}")
    if used:
        lines.append(f"Used: {used}")
    result = str(record.get("result") or "")
    if result:
        lines.extend(["Result:", result])
    return "\n".join(lines)


def _normalize_action_history_limit(value: Any, default: int = 10, maximum: int = 50) -> int:
    try:
        number = int(value)
    except (TypeError, ValueError):
        return default
    return min(max(number, 1), maximum)


def _context_action_records(limit: int = 10) -> list[dict[str, Any]]:
    bucket = _SELECTION_CACHE.get(_selection_session_key(), {})
    tokens = bucket.get("action_tokens") if isinstance(bucket, dict) else None
    if not isinstance(tokens, dict):
        return []
    records = [record for record in tokens.values() if isinstance(record, dict)]
    for record in records:
        _refresh_context_action_record_status(record)
    records.sort(
        key=lambda item: (
            float(item.get("createdAt") or 0),
            int(item.get("sequence") or 0),
        ),
        reverse=True,
    )
    return records[:limit]


def _action_record_summary(record: dict[str, Any]) -> dict[str, Any]:
    action = record.get("action") if isinstance(record.get("action"), dict) else {}
    result = str(record.get("result") or "")
    return {
        "token": str(record.get("token") or ""),
        "status": str(record.get("status") or "pending"),
        "command": str(action.get("command") or ""),
        "label": str(action.get("label") or action.get("id") or ""),
        "kind": str(action.get("kind") or ""),
        "createdAt": record.get("createdAt"),
        "expiresAt": record.get("expiresAt"),
        "usedAt": record.get("usedAt"),
        "result": result,
        "resultPreview": result[:240],
    }


def _format_action_history(result: dict[str, Any]) -> str:
    if not result.get("success", True):
        return _format_error(result)
    actions = result.get("actions") if isinstance(result.get("actions"), list) else []
    if not actions:
        return "No Xenesis Desk action history."
    normalized = []
    for item in actions:
        if not isinstance(item, dict):
            continue
        token = str(item.get("token") or "").strip()
        if not token:
            continue
        normalized.append({**item, "_replyCommand": f"/xd action-status {token}"})
    if normalized:
        _cache_selection("action_history", normalized)
    lines = ["Xenesis Desk action history:"]
    for index, item in enumerate(normalized or actions, start=1):
        token = str(item.get("token") or "")
        status = str(item.get("status") or "")
        command = str(item.get("command") or "")
        lines.append(f"{index}. {token} [{status}] {command}")
        preview = str(item.get("resultPreview") or "")
        if preview:
            lines.append(f"   Result: {preview}")
    return "\n".join(lines)


def handle_action_history(args: dict[str, Any] | None = None, **_: Any) -> str:
    args = args or {}
    limit = _normalize_action_history_limit(args.get("limit"))
    actions = [_action_record_summary(record) for record in _context_action_records(limit)]
    return _json_result({
        "ok": True,
        "limit": limit,
        "actions": actions,
    })


def _normalize_action_clear_mode(value: Any) -> tuple[str, str]:
    mode = str(value or "expired").strip().lower()
    if not mode:
        mode = "expired"
    if mode not in ACTION_CLEAR_MODES:
        return "", f"Invalid Xenesis Desk action clear mode: {mode}. {ACTION_CLEAR_USAGE}"
    return mode, ""


def _clear_context_action_records(mode: str) -> dict[str, Any]:
    bucket = _SELECTION_CACHE.get(_selection_session_key(), {})
    tokens = bucket.get("action_tokens") if isinstance(bucket, dict) else None
    if not isinstance(tokens, dict):
        return {
            "ok": True,
            "mode": mode,
            "cleared": 0,
            "remaining": 0,
            "before": 0,
        }

    before = len(tokens)
    to_delete: list[str] = []
    for token, record in list(tokens.items()):
        if not isinstance(record, dict):
            if mode == "all":
                to_delete.append(str(token))
            continue
        status = _refresh_context_action_record_status(record)
        if mode == "all" or status == mode:
            to_delete.append(str(token))

    for token in to_delete:
        tokens.pop(token, None)

    return {
        "ok": True,
        "mode": mode,
        "cleared": len(to_delete),
        "remaining": len(tokens),
        "before": before,
    }


def _format_action_clear(result: dict[str, Any]) -> str:
    if not result.get("success", True):
        return _format_error(result)
    return "\n".join([
        f"Cleared Xenesis Desk action records: {int(result.get('cleared') or 0)}",
        f"Mode: {result.get('mode') or 'expired'}",
        f"Remaining: {int(result.get('remaining') or 0)}",
    ])


def handle_action_clear(args: dict[str, Any] | None = None, **_: Any) -> str:
    args = args or {}
    mode, error = _normalize_action_clear_mode(args.get("mode"))
    if error:
        return _json_error(error, usage=ACTION_CLEAR_USAGE)
    return _json_result(_clear_context_action_records(mode))


def _normalize_mobile_dashboard_limit(value: Any, default: int = 5, maximum: int = 20) -> int:
    try:
        number = int(value)
    except (TypeError, ValueError):
        return default
    if number < 1:
        return default
    return min(number, maximum)


def _action_record_counts(records: list[dict[str, Any]]) -> dict[str, int]:
    counts = {
        "total": len(records),
        "pending": 0,
        "used": 0,
        "expired": 0,
        "running": 0,
    }
    for record in records:
        status = _refresh_context_action_record_status(record)
        if status in counts:
            counts[status] += 1
    return counts


def _format_mobile_dashboard(result: dict[str, Any]) -> str:
    if not result.get("success", True):
        return _format_error(result)
    bridge = result.get("bridge") if isinstance(result.get("bridge"), dict) else {}
    counts = result.get("counts") if isinstance(result.get("counts"), dict) else {}
    actions = result.get("actions") if isinstance(result.get("actions"), list) else []
    commands = result.get("commands") if isinstance(result.get("commands"), list) else []
    lines = [
        "Xenesis Desk mobile dashboard:",
        f"Bridge: {'configured' if bridge.get('configured') else 'missing'}",
    ]
    bridge_url = str(bridge.get("url") or "")
    if bridge_url:
        lines.append(f"URL: {bridge_url}")
    lines.append(
        "Actions: "
        f"total {int(counts.get('total') or 0)}, "
        f"pending {int(counts.get('pending') or 0)}, "
        f"used {int(counts.get('used') or 0)}, "
        f"expired {int(counts.get('expired') or 0)}, "
        f"running {int(counts.get('running') or 0)}"
    )
    if actions:
        normalized_actions = []
        lines.append("Recent actions:")
        for index, item in enumerate(actions, start=1):
            token = str(item.get("token") or "")
            status = str(item.get("status") or "")
            command = str(item.get("command") or "")
            lines.append(f"{index}. {token} [{status}] {command}")
            if token:
                normalized_actions.append({**item, "_replyCommand": f"/xd action-status {token}"})
        if normalized_actions:
            _cache_selection("action_history", normalized_actions)
    else:
        lines.append("No recent Xenesis Desk actions.")
    if commands:
        lines.append("Next:")
        lines.extend(f"- {command}" for command in commands)
    contract = result.get("callbackContract") if isinstance(result.get("callbackContract"), dict) else {}
    examples = contract.get("examples") if isinstance(contract.get("examples"), dict) else {}
    if contract:
        lines.extend([
            f"Callbacks: {contract.get('hook') or ''} -> {contract.get('commandNamespace') or '/xd'} only",
            f"Command JSON: {examples.get('commandJson') or ''}",
            f"Action prefix: {examples.get('actionPrefix') or ''}",
        ])
    return "\n".join(lines)


def _mobile_callback_contract() -> dict[str, Any]:
    return {
        "hook": "pre_gateway_dispatch",
        "commandNamespace": "/xd",
        "actionCallbacks": [
            "xenesis_desk_action",
            "xd-action:<token>",
            "xenesis_desk_action:<token>",
        ],
        "commandCallbacks": [
            "xenesis_desk_command",
            "xd-command:/xd mobile",
            "xenesis_desk_command:/xd mobile",
        ],
        "examples": {
            "commandJson": '{"type":"xenesis_desk_command","command":"/xd mobile"}',
            "commandPrefix": "xd-command:/xd mobile",
            "actionJson": '{"type":"xenesis_desk_action","token":"<token>","command":"/xd action <token>"}',
            "actionPrefix": "xd-action:<token>",
        },
    }


def _mobile_dashboard_buttons() -> dict[str, Any]:
    entries = [
        ("Refresh", "/xd mobile", "primary"),
        ("Context Actions", "/xd context-actions", "primary"),
        ("Action History", "/xd action-history", "secondary"),
        ("Clear Expired", "/xd action-clear expired", "danger"),
        ("State", "/xd state", "secondary"),
    ]
    return {
        "title": "Xenesis Desk Mobile Dashboard",
        "layout": "vertical",
        "buttons": [
            {
                "label": label,
                "command": command,
                "fallbackCommand": command,
                "value": command,
                "style": style,
                "requiresApproval": False,
                "callbackData": {
                    "type": "xenesis_desk_command",
                    "command": command,
                },
            }
            for label, command, style in entries
        ],
    }


def handle_mobile_dashboard(args: dict[str, Any] | None = None, **_: Any) -> str:
    args = args or {}
    limit = _normalize_mobile_dashboard_limit(args.get("limit"))
    bridge_url, bridge_token = _read_bridge_config()
    records = _context_action_records(1_000_000)
    actions = [_action_record_summary(record) for record in records[:limit]]
    return _json_result({
        "ok": True,
        "limit": limit,
        "bridge": {
            "configured": bool(bridge_url),
            "url": bridge_url,
            "token": "present" if bridge_token else "missing",
        },
        "counts": _action_record_counts(records),
        "actions": actions,
        "commands": [
            "/xd context-actions",
            "/xd action-history",
            "/xd action-clear",
            "/xd state",
        ],
        "mobileActionButtons": _mobile_dashboard_buttons(),
        "callbackContract": _mobile_callback_contract(),
    })


def _run_context_action_token(token: str) -> str:
    global _ACTION_APPROVAL_BYPASS

    record, error = _context_action_record_from_token(token)
    if error:
        return error
    status = _refresh_context_action_record_status(record)
    if status == "expired":
        return f"Xenesis Desk action token expired: {token}. Run /xd context-actions first."
    if status == "running":
        return f"Xenesis Desk action token is already running: {token}. Use /xd action-status {token}."
    if status == "used":
        return f"Xenesis Desk action token already used: {token}. Use /xd action-status {token}."

    action = record.get("action") if isinstance(record.get("action"), dict) else {}
    command = str(action.get("command") or "").strip()
    if not command:
        record["status"] = "used"
        record["usedAt"] = time.time()
        record["result"] = f"Cached Xenesis Desk action button {token} has no command. Run /xd context-actions first."
        return str(record["result"])

    record["status"] = "running"
    record["startedAt"] = time.time()
    previous_bypass = _ACTION_APPROVAL_BYPASS
    _ACTION_APPROVAL_BYPASS = True
    try:
        result = handle_xd_command(command)
    finally:
        _ACTION_APPROVAL_BYPASS = previous_bypass
    record["status"] = "used"
    record["usedAt"] = time.time()
    record["result"] = result
    return result


def _xd_help() -> str:
    return "\n".join([
        "Xenesis Desk commands:",
        "/xd menu [#N]",
        "/xd actions [#N]",
        "/xd mobile [limit]",
        "/xd quick [#N|add|remove|clear|path|recommend]",
        "/xd workflow [#N|add|remove|clear|path|templates|install]",
        "/xd launch [limit|#N]",
        "/xd find <query> [limit]",
        "/xd cleanup [dry-run|apply] [keep=N]",
        "/xd stash [save|list|open|remove|restore|diff|export|import|apply|pack|unpack|apply-pack|inspect|promote|schedule|schedules|pause|resume|trigger|runs|repair|unschedule|prune|path]",
        "/xd recommend [#N]",
        "/xd packet <work-packet-markdown>",
        "/xd packet open #N",
        "/xd packet replay #N",
        "/xd status",
        "/xd doctor",
        "/xd selftest",
        "/xd readiness",
        "/xd watch [limit|reset]",
        "/xd timeline [limit]",
        "/xd digest [limit]",
        "/xd pin [add|open|remove|clear]",
        "/xd compatibility",
        "/xd upgrade-notes",
        "/xd repair",
        "/xd snapshot [limit]",
        "/xd brief [limit]",
        "/xd handoff [limit]",
        "/xd export [handoff|snapshot] [limit]",
        "/xd exports [limit|open #N|open <filename>]",
        "/xd support-bundle [limit]",
        "/xd inbox [limit|open #N|clear]",
        "/xd state",
        "/xd context",
        "/xd context-actions [#N]",
        "/xd action <token>",
        "/xd action-status <token>",
        "/xd action-history [limit]",
        "/xd action-clear [expired|used|pending|all]",
        "/xd terminals",
        "/xd panels",
        "/xd bridge-panels",
        "/xd files",
        "/xd logs [limit]",
        "/xd focus <content-id|pane-id|#N>",
        "/xd close <content-id|pane-id|#N>",
        "/xd tail <id|#N>",
        "/xd stop <id|#N>",
        "/xd run <command>",
        "/xd open <absolute-path>",
        "/xd prompt [kind] [brief]",
        "/xd xcon <prompt>",
        "/xd pw snapshot <url> [selector] [open]",
        "/xd pw run <json-payload>",
        "/xd commands [query]",
        "/xd command <command-id|#N> [placement]",
        "/xd extensions",
        "/xd exec <command-id|#N> [placement]",
    ])


def _format_error(result: dict[str, Any]) -> str:
    return str(result.get("error") or result.get("message") or "Xenesis Desk command failed.")


def _format_pending_action_error(result: dict[str, Any]) -> str:
    action_token = str(result.get("actionToken") or "").strip()
    action_command = str(result.get("actionCommand") or "").strip()
    if not action_token:
        return _format_error(result)
    lines = [_format_error(result)]
    lines.append(f"Pending action token: {action_token}")
    lines.append(f"Run: {action_command or f'/xd action {action_token}'}")
    return "\n".join(lines)


def _format_terminal_sessions(result: dict[str, Any]) -> str:
    if not result.get("success", True):
        return _format_error(result)
    sessions = result.get("sessions")
    if not isinstance(sessions, list) or not sessions:
        return "No Xenesis Desk terminal sessions."
    normalized = []
    for session in sessions:
        if not isinstance(session, dict):
            continue
        session_id = str(session.get("id") or "")
        if not session_id:
            continue
        cwd = _terminal_text(session.get("cwd"))
        title = _terminal_display_title(session) or _last_terminal_path_segment(cwd) or "terminal"
        normalized.append({
            "id": session_id,
            "title": title,
            "cwd": cwd,
            "active": session.get("active") is True,
        })
    _cache_selection("terminals", normalized)
    lines = ["Terminals", ""]
    for index, session in enumerate(normalized, start=1):
        session_id = session["id"]
        title = session["title"]
        cwd = session["cwd"]
        lines.append(f"{index}. {_short_terminal_id(session_id)} · {_truncate_terminal_meta(title, 48)}")
        if session.get("active") is True:
            lines.append("   status: active")
        if cwd:
            lines.append(f"   cwd: {_truncate_terminal_meta(cwd, 120)}")
        lines.append(f"   tail: /xd tail #{index}")
    return "\n".join(lines) if len(lines) > 2 else "No Xenesis Desk terminal sessions."


def _terminal_display_title(session: dict[str, Any]) -> str:
    for key in ("title", "name", "label", "displayTitle", "tabTitle", "paneTitle", "mcpTitle"):
        value = _terminal_text(session.get(key))
        if value:
            return value
    return ""


def _terminal_text(value: Any) -> str:
    return value.strip() if isinstance(value, str) else ""


def _short_terminal_id(session_id: str) -> str:
    normalized = str(session_id or "").strip()
    return normalized[:8] if len(normalized) > 8 else normalized


def _last_terminal_path_segment(value: str) -> str:
    parts = [part.strip() for part in re.split(r"[\\/]+", str(value or "")) if part.strip()]
    return parts[-1] if parts else ""


def _truncate_terminal_meta(value: str, limit: int) -> str:
    text = str(value or "").strip()
    return text if len(text) <= limit else f"{text[: max(0, limit - 1)]}..."


def _format_terminal_run(result: dict[str, Any]) -> str:
    if not result.get("success", True):
        return _format_pending_action_error(result)
    lines = [
        f"Started Xenesis Desk terminal: {result.get('id') or result.get('jobId') or ''}".strip(),
    ]
    if result.get("cwd"):
        lines.append(f"CWD: {result['cwd']}")
    command = result.get("mcpCommand") or result.get("command")
    if command:
        lines.append(f"Command: {command}")
    return "\n".join(line for line in lines if line)


def _list_count(value: Any) -> int:
    return len(value) if isinstance(value, list) else 0


def _format_state(result: dict[str, Any]) -> str:
    if not result.get("success", True):
        return _format_error(result)
    bridge = result.get("bridge") if isinstance(result.get("bridge"), dict) else {}
    lines = ["Xenesis Desk state:"]
    bridge_url = str(bridge.get("bridgeUrl") or bridge.get("url") or "").strip()
    if bridge_url:
        lines.append(f"Bridge: {bridge_url}")
    lines.extend([
        f"Terminals: {_list_count(result.get('terminals'))}",
        f"Panels: {_list_count(result.get('panels'))}",
        f"Open files: {_list_count(result.get('openFiles'))}",
        f"Diagnostics: {_list_count(result.get('diagnostics'))}",
    ])
    return "\n".join(lines)


def _format_active_context(result: dict[str, Any]) -> str:
    if not result.get("success", True):
        return _format_error(result)
    active_pane = result.get("activePane") if isinstance(result.get("activePane"), dict) else {}
    active_content = result.get("activeContent") if isinstance(result.get("activeContent"), dict) else {}
    active_open_file = result.get("activeOpenFile") if isinstance(result.get("activeOpenFile"), dict) else {}
    active_panel = result.get("activePanel") if isinstance(result.get("activePanel"), dict) else {}
    active_terminal = result.get("activeTerminal") if isinstance(result.get("activeTerminal"), dict) else {}
    counts = result.get("counts") if isinstance(result.get("counts"), dict) else {}

    lines = ["Xenesis Desk active context:"]
    if active_pane:
        pane_id = str(active_pane.get("id") or "")
        state = str(active_pane.get("state") or "").strip()
        lines.append(f"Pane: {pane_id}{f' ({state})' if state else ''}")
    if active_content:
        content_id = str(active_content.get("id") or "")
        title = str(active_content.get("title") or "").strip()
        content_type = str(active_content.get("contentType") or "").strip()
        title_text = f" - {title}" if title else ""
        type_text = f" [{content_type}]" if content_type else ""
        lines.append(f"Content: {content_id}{title_text}{type_text}")
    if active_open_file:
        file_path = str(active_open_file.get("filePath") or "").strip()
        if file_path:
            lines.append(f"File: {file_path}")
    if active_panel:
        panel_title = str(active_panel.get("title") or active_panel.get("contentId") or "").strip()
        if panel_title:
            lines.append(f"Panel: {panel_title}")
    if active_terminal:
        terminal_id = str(active_terminal.get("id") or "").strip()
        title = str(active_terminal.get("title") or "").strip()
        title_text = f" - {title}" if title else ""
        lines.append(f"Terminal: {terminal_id}{title_text}")
    if counts:
        lines.append(
            "Counts: "
            f"panes {counts.get('panes', 0)}, "
            f"contents {counts.get('contents', 0)}, "
            f"files {counts.get('openFiles', 0)}, "
            f"panels {counts.get('panels', 0)}, "
            f"terminals {counts.get('terminals', 0)}"
        )
    return "\n".join(lines)


def _normalize_context_actions(value: Any) -> list[dict[str, Any]]:
    actions = value if isinstance(value, list) else []
    normalized = []
    for item in actions:
        if not isinstance(item, dict):
            continue
        action_id = str(item.get("id") or "").strip()
        command = str(item.get("command") or "").strip()
        if not action_id or not command:
            continue
        normalized.append({
            "id": action_id,
            "label": str(item.get("label") or action_id),
            "command": command,
            "kind": str(item.get("kind") or ""),
            "requiresApproval": item.get("requiresApproval") is True,
            "target": item.get("target") if isinstance(item.get("target"), dict) else {},
            "button": item.get("button") if isinstance(item.get("button"), dict) else {},
        })
    return normalized


def _context_action_button(action: dict[str, Any], index: int) -> dict[str, Any]:
    raw_button = action.get("button") if isinstance(action.get("button"), dict) else {}
    requires_approval = action.get("requiresApproval") is True
    style = str(raw_button.get("style") or ("danger" if requires_approval else "primary")).strip()
    if style not in {"primary", "secondary", "danger"}:
        style = "danger" if requires_approval else "primary"
    token = _cache_context_action_token(action, index)
    command = f"/xd action {token}"
    return {
        "label": str(raw_button.get("label") or action.get("label") or action.get("id") or f"Action {index}"),
        "command": command,
        "fallbackCommand": f"/xd context-actions #{index}",
        "value": str(raw_button.get("value") or action.get("command") or ""),
        "style": style,
        "requiresApproval": requires_approval,
        "callbackData": {
            "type": "xenesis_desk_action",
            "token": token,
            "command": command,
        },
    }


def _mobile_action_buttons(actions: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "title": "Xenesis Desk Context Actions",
        "layout": "vertical",
        "buttons": [
            _context_action_button(action, index)
            for index, action in enumerate(actions, start=1)
        ],
    }


def _format_context_actions(result: dict[str, Any]) -> str:
    if not result.get("success", True):
        return _format_error(result)
    actions = _normalize_context_actions(result.get("actions"))
    if not actions:
        return "No Xenesis Desk context actions."
    _cache_selection("context_actions", actions)
    lines = []
    for index, action in enumerate(actions, start=1):
        kind = f" [{action['kind']}]" if action.get("kind") else ""
        approval = " (approval)" if action.get("requiresApproval") else ""
        lines.append(f"{index}. {action['label']}{kind}{approval} -> /xd context-actions #{index}")
        lines.append(f"   /xd {action['command']}")
    return "\n".join(lines)


def _format_mobile_menu(result: dict[str, Any]) -> str:
    if not result.get("success", True):
        return _format_error(result)
    counts = {
        "terminals": _list_count(result.get("terminals")),
        "panels": _list_count(result.get("panels")),
        "openFiles": _list_count(result.get("openFiles")),
        "diagnostics": _list_count(result.get("diagnostics")),
    }
    lines = [
        "Xenesis Desk mobile menu:",
        f"Terminals: {counts['terminals']}",
        f"Panels: {counts['panels']}",
        f"Open files: {counts['openFiles']}",
        f"Diagnostics: {counts['diagnostics']}",
        "",
        "Actions:",
    ]
    for index, action in enumerate(MENU_ACTIONS, start=1):
        count_key = action.get("count_key", "")
        count_suffix = f" ({counts[count_key]})" if count_key in counts else ""
        lines.append(f"{index}. {action['label']}{count_suffix} -> /xd menu #{index}")
    _cache_selection("menu_actions", [
        {
            "label": action["label"],
            "command": action["command"],
            "_replyCommand": f"/xd menu #{index}",
        }
        for index, action in enumerate(MENU_ACTIONS, start=1)
    ])
    lines.extend([
        "",
        "Manual commands:",
        "- /xd run <command>",
        "- /xd open <absolute-path>",
        "- /xd xcon <prompt>",
        "- /xd pw snapshot <url> [selector] [open]",
        "- /xd pw run <json-payload>",
    ])
    return "\n".join(lines)


def _menu_action_from_selector(value: str) -> tuple[str, str]:
    target = _strip_wrapping_quotes(value).strip()
    index = _selector_index(target)
    if index is None:
        return "", "Usage: /xd menu [#N]"
    if index < 1 or index > len(MENU_ACTIONS):
        return "", f"No Xenesis Desk menu action for {target}. Run /xd menu to see actions."
    return MENU_ACTIONS[index - 1]["command"], ""


def _quick_actions_store_path() -> Path:
    try:
        from hermes_constants import get_hermes_home

        home = get_hermes_home()
    except Exception:
        home = Path.home() / ".hermes"
    return home / "plugins" / TOOLSET / "quick_actions.json"


def _normalize_workspace_key(value: str) -> str:
    text = str(value or "").strip()
    if not text or text in {".", "auto", "cwd"}:
        text = os.getcwd()
    if WINDOWS_ABSOLUTE_PATH_RE.match(text) or WSL_MOUNT_PATH_RE.match(text):
        return text.replace("\\", "/")
    path = Path(text).expanduser()
    if not path.is_absolute():
        path = (Path.cwd() / path).resolve()
    return str(path).replace("\\", "/")


def _quick_actions_workspace_key() -> str:
    return _normalize_workspace_key(os.getenv("TERMINAL_CWD", ""))


def _load_quick_actions_store() -> dict[str, Any]:
    path = _quick_actions_store_path()
    if not path.exists():
        return {"version": 1, "workspaces": {}}
    try:
        parsed = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {"version": 1, "workspaces": {}}
    if not isinstance(parsed, dict):
        return {"version": 1, "workspaces": {}}
    workspaces = parsed.get("workspaces")
    if not isinstance(workspaces, dict):
        workspaces = {}
    return {"version": 1, "workspaces": workspaces}


def _save_quick_actions_store(store: dict[str, Any]) -> None:
    path = _quick_actions_store_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(store, ensure_ascii=False, indent=2), encoding="utf-8")


def _xd_pins_store_path() -> Path:
    return _quick_actions_store_path().parent / "pins.json"


def _load_xd_pins_store() -> dict[str, Any]:
    path = _xd_pins_store_path()
    if not path.exists():
        return {"version": 1, "pins": []}
    try:
        parsed = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {"version": 1, "pins": []}
    if not isinstance(parsed, dict):
        return {"version": 1, "pins": []}
    raw_pins = parsed.get("pins")
    if not isinstance(raw_pins, list):
        raw_pins = []
    pins: list[dict[str, Any]] = []
    for item in raw_pins:
        if not isinstance(item, dict):
            continue
        path_text = str(item.get("path") or "").strip()
        if not path_text:
            continue
        name = str(item.get("name") or "").strip() or _pin_default_name(path_text)
        pins.append({
            "name": name,
            "path": path_text,
            "addedAt": item.get("addedAt") if isinstance(item.get("addedAt"), (int, float)) else 0,
        })
    return {"version": 1, "pins": pins}


def _save_xd_pins_store(store: dict[str, Any]) -> None:
    path = _xd_pins_store_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(store, ensure_ascii=False, indent=2), encoding="utf-8")


def _pin_default_name(path_text: str) -> str:
    cleaned = str(path_text or "").strip().rstrip("\\/")
    if not cleaned:
        return "Pinned file"
    return re.split(r"[\\/]", cleaned)[-1] or cleaned


def _pin_normalize_path(path_text: str) -> str:
    text = _strip_wrapping_quotes(str(path_text or "").strip())
    if not text:
        return ""
    if _is_bridge_absolute_file_path(text):
        return text
    return str(Path(text).expanduser().resolve())


def _xd_pins(store: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    data = store if isinstance(store, dict) else _load_xd_pins_store()
    pins = data.get("pins")
    return pins if isinstance(pins, list) else []


def _format_xd_pins(result: dict[str, Any]) -> str:
    pins = result.get("pins") if isinstance(result.get("pins"), list) else []
    lines = [
        "Xenesis Desk pins:",
        f"Path: {result.get('path') or _xd_pins_store_path()}",
    ]
    if not pins:
        lines.append("No Xenesis Desk pins.")
        lines.append("Add: /xd pin add <path> [:: name]")
        return "\n".join(lines)

    normalized = []
    for index, item in enumerate(pins, start=1):
        if not isinstance(item, dict):
            continue
        name = str(item.get("name") or _pin_default_name(str(item.get("path") or "")))
        path_text = str(item.get("path") or "")
        lines.append(f"{index}. {name}")
        lines.append(f"   {path_text}")
        lines.append(f"   -> /xd pin open #{index}")
        normalized.append({"name": name, "path": path_text, "_replyCommand": f"/xd pin open #{index}"})
    if normalized:
        _cache_selection("pins", normalized)
    lines.append("Manage: /xd pin add <path> [:: name] | /xd pin remove #N | /xd pin clear")
    return "\n".join(lines)


def _run_xd_pins() -> dict[str, Any]:
    store = _load_xd_pins_store()
    return {
        "summary": "OK",
        "path": str(_xd_pins_store_path()),
        "pins": _xd_pins(store),
    }


def _parse_pin_add_text(rest: str) -> tuple[str, str]:
    text = str(rest or "").strip()
    if "::" in text:
        raw_path, raw_name = text.split("::", 1)
        return _pin_normalize_path(raw_path), str(raw_name or "").strip()
    path_text = _pin_normalize_path(text)
    return path_text, ""


def _run_xd_pin_add(rest: str) -> dict[str, Any]:
    path_text, name = _parse_pin_add_text(rest)
    if not path_text:
        return {
            "summary": "ERROR",
            "error": "Usage: /xd pin add <path> [:: name]",
        }
    store = _load_xd_pins_store()
    pins = _xd_pins(store)
    pin_name = name or _pin_default_name(path_text)
    now = time.time()
    updated = False
    for item in pins:
        if str(item.get("path") or "") == path_text:
            item["name"] = pin_name
            item["addedAt"] = now
            updated = True
            break
    if not updated:
        pins.append({"name": pin_name, "path": path_text, "addedAt": now})
    store["pins"] = pins
    _save_xd_pins_store(store)
    index = next((idx for idx, item in enumerate(pins, start=1) if item.get("path") == path_text), len(pins))
    return {
        "summary": "UPDATED" if updated else "OK",
        "index": index,
        "name": pin_name,
        "path": path_text,
    }


def _format_xd_pin_add(result: dict[str, Any]) -> str:
    if result.get("summary") == "ERROR":
        return str(result.get("error") or "Usage: /xd pin add <path> [:: name]")
    verb = "Updated" if str(result.get("summary") or "").upper() == "UPDATED" else "Added"
    return "\n".join([
        f"{verb} Xenesis Desk pin #{result.get('index') or '?'}: {result.get('name') or 'Pinned file'}",
        f"Path: {result.get('path') or ''}",
        f"Open: /xd pin open #{result.get('index') or '?'}",
    ])


def _xd_pin_from_selector(selector: str) -> tuple[dict[str, Any] | None, str]:
    text = _strip_wrapping_quotes(str(selector or "").strip())
    index = _selector_index(text) or _selector_index(_selector_from_reply(text))
    if index is None:
        return None, "Usage: /xd pin open #N"
    pins = _xd_pins()
    if index < 1 or index > len(pins):
        return None, f"No Xenesis Desk pin for {text}. Run /xd pin to see pins."
    return pins[index - 1], ""


def _run_xd_pin_open(selector: str) -> dict[str, Any]:
    pin, error = _xd_pin_from_selector(selector)
    if error:
        return {
            "summary": "ERROR",
            "opened": False,
            "error": error,
        }
    assert pin is not None
    opened = False
    open_error = ""
    try:
        payload = _call_bridge(
            "/open-file",
            _bridge_open_file_payload(str(pin.get("path") or ""), {}),
        )
        opened = bool(payload.get("opened", payload.get("ok", True)))
    except Exception as exc:
        open_error = str(exc) or exc.__class__.__name__
    return {
        "summary": "PARTIAL" if open_error else "OK",
        "name": pin.get("name") or _pin_default_name(str(pin.get("path") or "")),
        "path": pin.get("path") or "",
        "opened": opened,
        "openError": open_error,
    }


def _format_xd_pin_open(result: dict[str, Any]) -> str:
    if result.get("summary") == "ERROR":
        return str(result.get("error") or "Usage: /xd pin open #N")
    lines = [
        f"Xenesis Desk pin open: {str(result.get('summary') or 'UNKNOWN').upper()}",
        f"Name: {result.get('name') or 'Pinned file'}",
        f"Path: {result.get('path') or ''}",
        f"Opened: {'yes' if result.get('opened') else 'no'}",
    ]
    if result.get("openError"):
        lines.append(f"Open error: {result['openError']}")
    return "\n".join(lines)


def _run_xd_pin_remove(selector: str) -> dict[str, Any]:
    text = _strip_wrapping_quotes(str(selector or "").strip())
    index = _selector_index(text) or _selector_index(_selector_from_reply(text))
    if index is None:
        return {"summary": "ERROR", "error": "Usage: /xd pin remove #N"}
    store = _load_xd_pins_store()
    pins = _xd_pins(store)
    if index < 1 or index > len(pins):
        return {"summary": "ERROR", "error": f"No Xenesis Desk pin for {text}. Run /xd pin to see pins."}
    removed = pins.pop(index - 1)
    store["pins"] = pins
    _save_xd_pins_store(store)
    return {
        "summary": "OK",
        "name": removed.get("name") or _pin_default_name(str(removed.get("path") or "")),
        "path": removed.get("path") or "",
    }


def _format_xd_pin_remove(result: dict[str, Any]) -> str:
    if result.get("summary") == "ERROR":
        return str(result.get("error") or "Usage: /xd pin remove #N")
    return f"Removed Xenesis Desk pin: {result.get('name') or 'Pinned file'}\nPath: {result.get('path') or ''}"


def _run_xd_pin_clear() -> dict[str, Any]:
    store = _load_xd_pins_store()
    pins = _xd_pins(store)
    count = len(pins)
    store["pins"] = []
    _save_xd_pins_store(store)
    return {"summary": "OK", "count": count}


def _format_xd_pin_clear(result: dict[str, Any]) -> str:
    return f"Cleared {result.get('count') or 0} Xenesis Desk pin(s)."


def _handle_pin_command(rest: str) -> str:
    parts = _split_args(rest)
    if not parts:
        return _format_xd_pins(_run_xd_pins())
    subcommand = parts[0].lower()
    sub_rest = rest[len(parts[0]):].strip()
    if subcommand in {"add", "save"}:
        return _format_xd_pin_add(_run_xd_pin_add(sub_rest))
    if subcommand in {"open", "show"}:
        return _format_xd_pin_open(_run_xd_pin_open(" ".join(parts[1:])))
    if subcommand in {"remove", "rm", "delete"}:
        return _format_xd_pin_remove(_run_xd_pin_remove(" ".join(parts[1:])))
    if subcommand in {"clear", "reset"}:
        return _format_xd_pin_clear(_run_xd_pin_clear())
    return "Usage: /xd pin [add <path> [:: name]|open #N|remove #N|clear]"


def _quick_actions_for_workspace(store: dict[str, Any], workspace: str) -> list[dict[str, str]]:
    workspaces = store.setdefault("workspaces", {})
    if not isinstance(workspaces, dict):
        store["workspaces"] = {}
        workspaces = store["workspaces"]
    raw_actions = workspaces.get(workspace)
    if not isinstance(raw_actions, list):
        workspaces[workspace] = []
        return []

    actions = []
    for item in raw_actions:
        if not isinstance(item, dict):
            continue
        name = str(item.get("name") or "").strip()
        command = str(item.get("command") or "").strip()
        if name and command:
            actions.append({"name": name, "command": command})
    workspaces[workspace] = actions
    return actions


def _normalize_quick_command(value: str) -> str:
    command = str(value or "").strip()
    if command.lower().startswith("/xd "):
        command = command[4:].strip()
    elif command.lower() == "/xd":
        command = ""
    elif command.lower().startswith("xd "):
        command = command[3:].strip()
    return command


def _format_quick_actions() -> str:
    store = _load_quick_actions_store()
    workspace = _quick_actions_workspace_key()
    actions = _quick_actions_for_workspace(store, workspace)
    lines = [
        "Xenesis Desk quick actions:",
        f"Workspace: {workspace}",
    ]
    if not actions:
        lines.append("No Xenesis Desk quick actions for this workspace.")
    else:
        normalized = []
        for index, action in enumerate(actions, start=1):
            lines.append(f"{index}. {action['name']} -> /xd quick #{index}")
            lines.append(f"   /xd {action['command']}")
            normalized.append({**action, "_replyCommand": f"/xd quick #{index}"})
        _cache_selection("quick_actions", normalized)
    lines.extend([
        "Manage:",
        "- /xd quick add <name> :: <xd command>",
        "- /xd quick remove #N",
        "- /xd quick clear",
    ])
    return "\n".join(lines)


def _add_quick_action(rest: str) -> str:
    if "::" not in rest:
        return "Usage: /xd quick add <name> :: <xd command>"
    raw_name, raw_command = rest.split("::", 1)
    name = raw_name.strip()
    command = _normalize_quick_command(raw_command)
    if not name:
        return "Quick action name is required."
    if not command:
        return "Quick action command is required."

    store = _load_quick_actions_store()
    workspace = _quick_actions_workspace_key()
    actions = _quick_actions_for_workspace(store, workspace)
    actions.append({"name": name, "command": command})
    store["workspaces"][workspace] = actions
    _save_quick_actions_store(store)
    return f"Added quick action #{len(actions)}: {name} -> /xd {command}"


def _quick_action_from_selector(selector: str) -> tuple[dict[str, str], str]:
    index = _selector_index(selector)
    if index is None:
        return {}, "Usage: /xd quick #N"
    store = _load_quick_actions_store()
    workspace = _quick_actions_workspace_key()
    actions = _quick_actions_for_workspace(store, workspace)
    if index < 1 or index > len(actions):
        return {}, f"No Xenesis Desk quick action for {selector}. Run /xd quick to see actions."
    return actions[index - 1], ""


def _remove_quick_action(rest: str) -> str:
    target = _strip_wrapping_quotes(rest).strip()
    if not target:
        return "Usage: /xd quick remove #N"
    index = _selector_index(target)
    if index is None:
        return "Usage: /xd quick remove #N"

    store = _load_quick_actions_store()
    workspace = _quick_actions_workspace_key()
    actions = _quick_actions_for_workspace(store, workspace)
    if index < 1 or index > len(actions):
        return f"No Xenesis Desk quick action for {target}. Run /xd quick to see actions."
    removed = actions.pop(index - 1)
    store["workspaces"][workspace] = actions
    _save_quick_actions_store(store)
    return f"Removed quick action: {removed['name']}"


def _clear_quick_actions() -> str:
    store = _load_quick_actions_store()
    workspace = _quick_actions_workspace_key()
    actions = _quick_actions_for_workspace(store, workspace)
    count = len(actions)
    store["workspaces"][workspace] = []
    _save_quick_actions_store(store)
    return f"Cleared {count} Xenesis Desk quick action(s)."


def _quick_actions_path_info() -> str:
    return "\n".join([
        "Xenesis Desk quick actions storage:",
        f"Path: {_quick_actions_store_path()}",
        f"Workspace: {_quick_actions_workspace_key()}",
    ])


def _recommendations_from_state(result: dict[str, Any]) -> tuple[list[dict[str, str]], str]:
    if not result.get("success", True):
        return [], _format_error(result)
    counts = {
        "terminals": _list_count(result.get("terminals")),
        "panels": _list_count(result.get("panels")),
        "openFiles": _list_count(result.get("openFiles")),
        "diagnostics": _list_count(result.get("diagnostics")),
    }
    recommendations: list[dict[str, str]] = []
    if counts["terminals"]:
        recommendations.append({
            "label": f"Terminals ({counts['terminals']})",
            "command": "terminals",
        })
    if counts["panels"]:
        recommendations.append({
            "label": f"Panels ({counts['panels']})",
            "command": "panels",
        })
    if counts["openFiles"]:
        recommendations.append({
            "label": f"Files ({counts['openFiles']})",
            "command": "files",
        })
    if counts["diagnostics"]:
        recommendations.append({
            "label": f"Diagnostics ({counts['diagnostics']})",
            "command": "logs 20",
        })
    recommendations.extend([
        {"label": "Extensions", "command": "extensions"},
        {"label": "Menu", "command": "menu"},
    ])
    return recommendations, ""


def _format_recommendations(recommendations: list[dict[str, str]]) -> str:
    lines = ["Recommended Xenesis Desk actions:"]
    normalized = []
    for index, action in enumerate(recommendations, start=1):
        lines.append(f"{index}. {action['label']} -> /xd recommend #{index}")
        lines.append(f"   /xd {action['command']}")
        normalized.append({**action, "_replyCommand": f"/xd recommend #{index}"})
    if normalized:
        _cache_selection("recommendations", normalized)
    return "\n".join(lines)


def _recommendation_from_selector(
    recommendations: list[dict[str, str]],
    selector: str,
) -> tuple[dict[str, str], str]:
    index = _selector_index(selector)
    if index is None:
        return {}, "Usage: /xd recommend [#N]"
    if index < 1 or index > len(recommendations):
        return {}, f"No Xenesis Desk recommendation for {selector}. Run /xd recommend to see actions."
    return recommendations[index - 1], ""


def _handle_recommend_command(rest: str) -> str:
    recommendations, error = _recommendations_from_state(_parse_json_result(handle_state({})))
    if error:
        return error
    parts = _split_args(rest)
    if not parts:
        return _format_recommendations(recommendations)
    action, error = _recommendation_from_selector(recommendations, parts[0])
    if error:
        return error
    return handle_xd_command(action["command"])


def _handle_quick_command(rest: str) -> str:
    subcommand, sub_rest = _first_word_and_rest(rest)
    if not subcommand:
        return _format_quick_actions()
    if subcommand == "add":
        return _add_quick_action(sub_rest)
    if subcommand == "remove":
        return _remove_quick_action(sub_rest)
    if subcommand == "clear":
        return _clear_quick_actions()
    if subcommand == "path":
        return _quick_actions_path_info()
    if subcommand in {"recommend", "recommended", "suggest", "suggestions"}:
        return _handle_recommend_command(sub_rest)

    action, error = _quick_action_from_selector(subcommand)
    if error:
        return error
    return handle_xd_command(action["command"])


def _workflow_store_path() -> Path:
    return _quick_actions_store_path().parent / "workflows.json"


def _load_workflow_store() -> dict[str, Any]:
    path = _workflow_store_path()
    if not path.exists():
        return {"version": 1, "workspaces": {}}
    try:
        parsed = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {"version": 1, "workspaces": {}}
    if not isinstance(parsed, dict):
        return {"version": 1, "workspaces": {}}
    workspaces = parsed.get("workspaces")
    if not isinstance(workspaces, dict):
        workspaces = {}
    return {"version": 1, "workspaces": workspaces}


def _save_workflow_store(store: dict[str, Any]) -> None:
    path = _workflow_store_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(store, ensure_ascii=False, indent=2), encoding="utf-8")


def _workflows_for_workspace(store: dict[str, Any], workspace: str) -> list[dict[str, Any]]:
    workspaces = store.setdefault("workspaces", {})
    if not isinstance(workspaces, dict):
        store["workspaces"] = {}
        workspaces = store["workspaces"]
    raw_workflows = workspaces.get(workspace)
    if not isinstance(raw_workflows, list):
        workspaces[workspace] = []
        return []

    workflows = []
    for item in raw_workflows:
        if not isinstance(item, dict):
            continue
        name = str(item.get("name") or "").strip()
        raw_steps = item.get("steps")
        if not isinstance(raw_steps, list):
            continue
        steps = [_normalize_quick_command(str(step)) for step in raw_steps]
        steps = [step for step in steps if step]
        if name and steps:
            workflows.append({"name": name, "steps": steps})
    workspaces[workspace] = workflows
    return workflows


def _normalize_workflow_steps(value: str) -> list[str]:
    steps = [_normalize_quick_command(part) for part in str(value or "").split(";;")]
    return [step for step in steps if step]


def _format_workflows() -> str:
    store = _load_workflow_store()
    workspace = _quick_actions_workspace_key()
    workflows = _workflows_for_workspace(store, workspace)
    lines = [
        "Xenesis Desk workflows:",
        f"Workspace: {workspace}",
    ]
    if not workflows:
        lines.append("No Xenesis Desk workflows for this workspace.")
    else:
        normalized = []
        for index, workflow in enumerate(workflows, start=1):
            steps = workflow["steps"]
            lines.append(f"{index}. {workflow['name']} ({len(steps)} step(s)) -> /xd workflow #{index}")
            for step_index, step in enumerate(steps, start=1):
                lines.append(f"   {step_index}. /xd {step}")
            normalized.append({**workflow, "_replyCommand": f"/xd workflow #{index}"})
        _cache_selection("workflows", normalized)
    lines.extend([
        "Manage:",
        "- /xd workflow add <name> :: <xd command> ;; <xd command>",
        "- /xd workflow remove #N",
        "- /xd workflow clear",
        "- /xd workflow templates",
    ])
    return "\n".join(lines)


def _add_workflow(rest: str) -> str:
    if "::" not in rest:
        return "Usage: /xd workflow add <name> :: <xd command> ;; <xd command>"
    raw_name, raw_steps = rest.split("::", 1)
    name = raw_name.strip()
    steps = _normalize_workflow_steps(raw_steps)
    if not name:
        return "Workflow name is required."
    if not steps:
        return "Workflow steps are required."

    store = _load_workflow_store()
    workspace = _quick_actions_workspace_key()
    workflows = _workflows_for_workspace(store, workspace)
    workflows.append({"name": name, "steps": steps})
    store["workspaces"][workspace] = workflows
    _save_workflow_store(store)
    return f"Added workflow #{len(workflows)}: {name} ({len(steps)} step(s))"


def _workflow_from_selector(selector: str) -> tuple[dict[str, Any], str]:
    index = _selector_index(selector)
    if index is None:
        return {}, "Usage: /xd workflow #N [--continue]"
    store = _load_workflow_store()
    workspace = _quick_actions_workspace_key()
    workflows = _workflows_for_workspace(store, workspace)
    if index < 1 or index > len(workflows):
        return {}, f"No Xenesis Desk workflow for {selector}. Run /xd workflow to see workflows."
    return workflows[index - 1], ""


def _remove_workflow(rest: str) -> str:
    target = _strip_wrapping_quotes(rest).strip()
    if not target:
        return "Usage: /xd workflow remove #N"
    index = _selector_index(target)
    if index is None:
        return "Usage: /xd workflow remove #N"

    store = _load_workflow_store()
    workspace = _quick_actions_workspace_key()
    workflows = _workflows_for_workspace(store, workspace)
    if index < 1 or index > len(workflows):
        return f"No Xenesis Desk workflow for {target}. Run /xd workflow to see workflows."
    removed = workflows.pop(index - 1)
    store["workspaces"][workspace] = workflows
    _save_workflow_store(store)
    return f"Removed workflow: {removed['name']}"


def _clear_workflows() -> str:
    store = _load_workflow_store()
    workspace = _quick_actions_workspace_key()
    workflows = _workflows_for_workspace(store, workspace)
    count = len(workflows)
    store["workspaces"][workspace] = []
    _save_workflow_store(store)
    return f"Cleared {count} Xenesis Desk workflow(s)."


def _workflow_path_info() -> str:
    return "\n".join([
        "Xenesis Desk workflow storage:",
        f"Path: {_workflow_store_path()}",
        f"Workspace: {_quick_actions_workspace_key()}",
    ])


def _workflow_step_failed(output: str) -> bool:
    text = str(output or "").strip().lower()
    return any(marker in text for marker in WORKFLOW_FAILURE_MARKERS)


def _workflow_output_lines(output: str, limit: int = 4) -> list[str]:
    lines = [line.strip() for line in str(output or "").splitlines() if line.strip()]
    if not lines:
        return ["(no output)"]
    if len(lines) <= limit:
        return lines
    return [*lines[:limit], "..."]


def _run_workflow(workflow: dict[str, Any], *, continue_on_failure: bool) -> str:
    name = str(workflow.get("name") or "workflow")
    steps = [str(step) for step in workflow.get("steps", []) if str(step).strip()]
    total = len(steps)
    results: list[dict[str, Any]] = []
    stopped = False

    for step in steps:
        output = handle_xd_command(step)
        failed = _workflow_step_failed(output)
        results.append({
            "step": step,
            "output": output,
            "failed": failed,
        })
        if failed and not continue_on_failure:
            stopped = len(results) < total
            break

    failures = sum(1 for result in results if result["failed"])
    if failures == 0 and len(results) == total:
        headline = f"Workflow {name}: completed {len(results)}/{total} step(s)."
    elif stopped:
        headline = f"Workflow {name}: stopped after {len(results)}/{total} step(s)."
    else:
        headline = f"Workflow {name}: completed {len(results)}/{total} step(s) with {failures} failure(s)."

    lines = [headline]
    for index, result in enumerate(results, start=1):
        status = "FAIL" if result["failed"] else "PASS"
        lines.append(f"{index}. {status} /xd {result['step']}")
        for output_line in _workflow_output_lines(result["output"]):
            lines.append(f"   {output_line}")
    skipped = total - len(results)
    if skipped:
        lines.append(f"Skipped {skipped} remaining step(s).")
    return "\n".join(lines)


def _run_workflow_selector(selector: str, rest: str) -> str:
    workflow, error = _workflow_from_selector(selector)
    if error:
        return error
    parts = _split_args(rest)
    unknown = [part for part in parts if part != "--continue"]
    if unknown:
        return "Usage: /xd workflow #N [--continue]"
    return _run_workflow(workflow, continue_on_failure="--continue" in parts)


def _format_workflow_templates() -> str:
    lines = ["Xenesis Desk workflow templates:"]
    for template in WORKFLOW_TEMPLATES:
        steps = template["steps"]
        lines.append(f"- {template['name']} ({len(steps)} step(s)): {template['description']}")
        lines.append(f"  /xd workflow install {template['name']}")
        lines.append(f"  Steps: {' ;; '.join('/xd ' + step for step in steps)}")
    return "\n".join(lines)


def _install_workflow_template(name: str) -> str:
    target = str(name or "").strip()
    if not target:
        return "Usage: /xd workflow install <template-name>"
    template = next((item for item in WORKFLOW_TEMPLATES if item["name"] == target), None)
    if template is None:
        return f"No Xenesis Desk workflow template named {target}. Run /xd workflow templates."

    store = _load_workflow_store()
    workspace = _quick_actions_workspace_key()
    workflows = _workflows_for_workspace(store, workspace)
    workflows.append({
        "name": str(template["name"]),
        "steps": list(template["steps"]),
    })
    store["workspaces"][workspace] = workflows
    _save_workflow_store(store)
    return f"Installed workflow template #{len(workflows)}: {template['name']}"


def _handle_workflow_command(rest: str) -> str:
    subcommand, sub_rest = _first_word_and_rest(rest)
    if not subcommand:
        return _format_workflows()
    if subcommand == "add":
        return _add_workflow(sub_rest)
    if subcommand == "remove":
        return _remove_workflow(sub_rest)
    if subcommand == "clear":
        return _clear_workflows()
    if subcommand == "path":
        return _workflow_path_info()
    if subcommand in {"templates", "template"}:
        return _format_workflow_templates()
    if subcommand == "install":
        return _install_workflow_template(sub_rest)
    return _run_workflow_selector(subcommand, sub_rest)


def _launch_items(limit: int = 20) -> list[dict[str, str]]:
    display_limit = _normalize_limit(limit, default=20, maximum=50)
    workspace = _quick_actions_workspace_key()
    items: list[dict[str, str]] = []

    for index, pin in enumerate(_xd_pins(), start=1):
        if not isinstance(pin, dict):
            continue
        path_text = str(pin.get("path") or "")
        if not path_text:
            continue
        items.append({
            "kind": "pin",
            "label": str(pin.get("name") or _pin_default_name(path_text)),
            "detail": path_text,
            "command": f"pin open #{index}",
        })

    quick_store = _load_quick_actions_store()
    for index, action in enumerate(_quick_actions_for_workspace(quick_store, workspace), start=1):
        items.append({
            "kind": "quick",
            "label": str(action.get("name") or f"Quick action #{index}"),
            "detail": str(action.get("command") or ""),
            "command": f"quick #{index}",
        })

    workflow_store = _load_workflow_store()
    for index, workflow in enumerate(_workflows_for_workspace(workflow_store, workspace), start=1):
        steps = workflow.get("steps") if isinstance(workflow.get("steps"), list) else []
        items.append({
            "kind": "workflow",
            "label": str(workflow.get("name") or f"Workflow #{index}"),
            "detail": f"steps={len(steps)}",
            "command": f"workflow #{index}",
        })

    return items[:display_limit]


def _run_xd_launch(limit: int = 20) -> dict[str, Any]:
    display_limit = _normalize_limit(limit, default=20, maximum=50)
    items = _launch_items(display_limit)
    return {
        "summary": "OK" if items else "EMPTY",
        "workspace": _quick_actions_workspace_key(),
        "limit": display_limit,
        "items": items,
    }


def _format_xd_launch(result: dict[str, Any]) -> str:
    items = result.get("items") if isinstance(result.get("items"), list) else []
    lines = [
        "Xenesis Desk launcher:",
        f"Workspace: {result.get('workspace') or _quick_actions_workspace_key()}",
        f"Items: {len(items)}",
    ]
    if not items:
        lines.extend([
            "No Xenesis Desk launcher items for this workspace.",
            "Add:",
            "- /xd pin add <path> [:: name]",
            "- /xd quick add <name> :: <xd command>",
            "- /xd workflow add <name> :: <xd command> ;; <xd command>",
        ])
        return "\n".join(lines)

    normalized = []
    for index, item in enumerate(items, start=1):
        kind = str(item.get("kind") or "item")
        label = str(item.get("label") or f"Item #{index}")
        detail = str(item.get("detail") or "").strip()
        command = str(item.get("command") or "").strip()
        lines.append(f"{index}. [{kind}] {label}")
        if detail:
            lines.append(f"   {detail}")
        if command:
            lines.append(f"   /xd {command}")
        normalized.append({**item, "_replyCommand": f"/xd launch #{index}"})
    if normalized:
        _cache_selection("launch", normalized)
    lines.append("Run: /xd launch #N")
    return "\n".join(lines)


def _launch_item_from_selector(selector: str) -> tuple[dict[str, str], str]:
    text = _strip_wrapping_quotes(str(selector or "").strip())
    index = _selector_index(text) or _selector_index(_selector_from_reply(text))
    if index is None:
        return {}, "Usage: /xd launch #N"
    items = _launch_items(limit=max(index, 20))
    if index < 1 or index > len(items):
        return {}, f"No Xenesis Desk launcher item for {text}. Run /xd launch to see items."
    return items[index - 1], ""


def _execute_launch_command(command: str) -> str:
    return handle_xd_command(command)


def _run_xd_launch_selector(selector: str) -> str:
    item, error = _launch_item_from_selector(selector)
    if error:
        return error
    command = str(item.get("command") or "").strip()
    if not command:
        return f"Xenesis Desk launcher item has no command. Run /xd launch to refresh items."
    return _execute_launch_command(command)


FIND_USAGE = "Usage: /xd find <query> [limit] | /xd find #N"


def _find_terms(query: str) -> list[str]:
    parts = _split_args(str(query or "").strip())
    if not parts:
        parts = [str(query or "").strip()]
    return [part.casefold() for part in parts if part.strip()]


def _find_matches(query: str, *fields: Any) -> bool:
    terms = _find_terms(query)
    if not terms:
        return False
    blob = "\n".join(str(field or "") for field in fields).casefold()
    return all(term in blob for term in terms)


def _parse_find_query_and_limit(rest: str) -> tuple[str, int]:
    parts = _split_args(rest)
    if not parts:
        return "", 20
    query_parts = list(parts)
    limit = 20
    if len(query_parts) > 1 and BARE_SELECTOR_RE.match(str(query_parts[-1] or "")):
        limit = _normalize_limit(query_parts.pop(), default=20, maximum=50)
    return " ".join(query_parts).strip(), limit


def _find_items(query: str, limit: int = 20) -> list[dict[str, str]]:
    display_limit = _normalize_limit(limit, default=20, maximum=50)
    normalized_query = str(query or "").strip()
    if not normalized_query:
        return []

    workspace = _quick_actions_workspace_key()
    items: list[dict[str, str]] = []

    for index, pin in enumerate(_xd_pins(), start=1):
        if not isinstance(pin, dict):
            continue
        path_text = str(pin.get("path") or "")
        name = str(pin.get("name") or _pin_default_name(path_text))
        if _find_matches(normalized_query, "pin", name, path_text):
            items.append({
                "kind": "pin",
                "label": name,
                "detail": path_text,
                "command": f"pin open #{index}",
            })

    quick_store = _load_quick_actions_store()
    for index, action in enumerate(_quick_actions_for_workspace(quick_store, workspace), start=1):
        name = str(action.get("name") or f"Quick action #{index}")
        command = str(action.get("command") or "")
        if _find_matches(normalized_query, "quick", name, command):
            items.append({
                "kind": "quick",
                "label": name,
                "detail": command,
                "command": f"quick #{index}",
            })

    workflow_store = _load_workflow_store()
    for index, workflow in enumerate(_workflows_for_workspace(workflow_store, workspace), start=1):
        name = str(workflow.get("name") or f"Workflow #{index}")
        steps = workflow.get("steps") if isinstance(workflow.get("steps"), list) else []
        detail = f"steps={len(steps)}"
        if _find_matches(normalized_query, "workflow", name, detail, " ".join(str(step) for step in steps)):
            items.append({
                "kind": "workflow",
                "label": name,
                "detail": detail,
                "command": f"workflow #{index}",
            })

    exports_result = _run_xd_exports(limit=50)
    export_entries = exports_result.get("entries") if isinstance(exports_result.get("entries"), list) else []
    for entry in export_entries:
        if not isinstance(entry, dict):
            continue
        index = entry.get("index") or "?"
        kind = str(entry.get("kind") or "export")
        file_name = str(entry.get("fileName") or Path(str(entry.get("filePath") or "")).name)
        file_path = str(entry.get("filePath") or "")
        detail = file_name
        if _find_matches(normalized_query, "export", kind, file_name, file_path, entry.get("modified")):
            items.append({
                "kind": "export",
                "label": kind,
                "detail": detail,
                "command": f"exports open #{index}",
            })

    timeline_result = _run_xd_timeline(limit=50)
    timeline_entries = timeline_result.get("entries") if isinstance(timeline_result.get("entries"), list) else []
    for entry in timeline_entries:
        if not isinstance(entry, dict):
            continue
        title = str(entry.get("title") or "Xenesis Desk event")
        detail = str(entry.get("detail") or "").strip()
        command = _normalize_quick_command(str(entry.get("command") or ""))
        if _find_matches(
            normalized_query,
            "timeline",
            entry.get("source"),
            entry.get("kind"),
            title,
            detail,
            command,
            entry.get("filePath"),
            entry.get("when"),
        ):
            items.append({
                "kind": "timeline",
                "label": title,
                "detail": detail,
                "command": command,
            })

    return items[:display_limit]


def _run_xd_find(query: str, limit: int = 20) -> dict[str, Any]:
    display_limit = _normalize_limit(limit, default=20, maximum=50)
    search_query = str(query or "").strip()
    if not search_query:
        return {
            "summary": "ERROR",
            "query": "",
            "workspace": _quick_actions_workspace_key(),
            "limit": display_limit,
            "items": [],
            "error": FIND_USAGE,
        }
    items = _find_items(search_query, display_limit)
    return {
        "summary": "OK" if items else "EMPTY",
        "query": search_query,
        "workspace": _quick_actions_workspace_key(),
        "limit": display_limit,
        "items": items,
    }


def _format_xd_find(result: dict[str, Any]) -> str:
    if result.get("summary") == "ERROR":
        return str(result.get("error") or FIND_USAGE)
    query = str(result.get("query") or "").strip()
    items = result.get("items") if isinstance(result.get("items"), list) else []
    lines = [
        f"Xenesis Desk find: {query}",
        f"Workspace: {result.get('workspace') or _quick_actions_workspace_key()}",
        f"Matches: {len(items)}",
    ]
    if not items:
        lines.append("No Xenesis Desk find matches.")
        lines.append("Try: /xd launch | /xd exports | /xd timeline")
        return "\n".join(lines)

    normalized = []
    for index, item in enumerate(items, start=1):
        kind = str(item.get("kind") or "item")
        label = str(item.get("label") or f"Item #{index}")
        detail = str(item.get("detail") or "").strip()
        command = str(item.get("command") or "").strip()
        lines.append(f"{index}. [{kind}] {label}")
        if detail:
            lines.append(f"   {detail}")
        if command:
            lines.append(f"   /xd {command}")
        normalized.append({**item, "_replyCommand": f"/xd find #{index}"})
    if normalized:
        _cache_selection("find", normalized)
    lines.append("Run: /xd find #N")
    return "\n".join(lines)


def _find_item_from_selector(selector: str) -> tuple[dict[str, str], str]:
    text = _strip_wrapping_quotes(str(selector or "").strip())
    normalized = _selector_from_reply(text)
    if not normalized:
        return {}, FIND_USAGE
    item, error = _cached_selection("find", normalized)
    if error:
        return {}, f"No cached Xenesis Desk find selection for {normalized}. Run /xd find <query> first."
    return {key: str(value) for key, value in item.items()}, ""


def _execute_find_command(command: str) -> str:
    return handle_xd_command(command)


def _run_xd_find_selector(selector: str) -> str:
    item, error = _find_item_from_selector(selector)
    if error:
        return error
    command = str(item.get("command") or "").strip()
    if not command:
        return "Xenesis Desk find item has no command. Run /xd find <query> to refresh results."
    return _execute_find_command(command)


CLEANUP_USAGE = "Usage: /xd cleanup [dry-run|apply] [keep=N]"


def _parse_cleanup_args(rest: str) -> tuple[str, int, str]:
    mode = "dry-run"
    keep_exports = 5
    for raw_part in _split_args(rest):
        part = str(raw_part or "").strip()
        lowered = part.lower()
        if lowered in {"dry-run", "dryrun", "preview", "check"}:
            mode = "dry-run"
            continue
        if lowered in {"apply", "--apply", "run"}:
            mode = "apply"
            continue
        if lowered.startswith("keep="):
            keep_exports = _normalize_limit(lowered.split("=", 1)[1], default=5, maximum=50)
            continue
        if BARE_SELECTOR_RE.match(part):
            keep_exports = _normalize_limit(part, default=5, maximum=50)
            continue
        return "", keep_exports, CLEANUP_USAGE
    return mode, keep_exports, ""


def _cleanup_export_files() -> list[Path]:
    export_dir = _xd_export_dir()
    if not export_dir.exists():
        return []
    files = [item for item in export_dir.glob("xd-*.md") if item.is_file()]
    files.sort(key=lambda item: (item.stat().st_mtime, item.name), reverse=True)
    return files


def _windows_drive_to_wsl_path(path_text: str) -> str:
    match = re.match(r"^([A-Za-z]):[\\/](.*)$", str(path_text or "").strip())
    if not match:
        return ""
    drive = match.group(1).lower()
    tail = match.group(2).replace("\\", "/")
    return f"/mnt/{drive}/{tail}"


def _wsl_path_to_windows_drive(path_text: str) -> str:
    match = re.match(r"^/mnt/([A-Za-z])(?:/(.*))?$", str(path_text or "").strip())
    if not match:
        return ""
    drive = match.group(1).upper()
    tail = (match.group(2) or "").replace("\\", "/")
    return f"{drive}:/{tail}" if tail else f"{drive}:/"


def _cleanup_pin_path_exists(path_text: str) -> bool:
    raw = _strip_wrapping_quotes(str(path_text or "").strip())
    if not raw:
        return False
    candidates = [raw]
    if _is_windows_absolute_path(raw):
        wsl_path = _windows_drive_to_wsl_path(raw)
        if wsl_path:
            candidates.append(wsl_path)
    if _is_wsl_mount_path(raw):
        windows_path = _wsl_path_to_windows_drive(raw)
        if windows_path:
            candidates.append(windows_path)
    if raw.startswith("\\\\") and os.name != "nt":
        return True
    for candidate in dict.fromkeys(candidates):
        try:
            if Path(candidate).expanduser().exists():
                return True
        except Exception:
            continue
    return False


def _cleanup_export_candidates(keep_exports: int) -> list[dict[str, str]]:
    files = _cleanup_export_files()
    stale_files = files[_normalize_limit(keep_exports, default=5, maximum=50):]
    return [
        {
            "kind": "export",
            "label": file_path.name,
            "path": str(file_path),
            "detail": "old export",
        }
        for file_path in stale_files
    ]


def _cleanup_pin_candidates() -> list[dict[str, str]]:
    candidates: list[dict[str, str]] = []
    for index, pin in enumerate(_xd_pins(), start=1):
        if not isinstance(pin, dict):
            continue
        path_text = str(pin.get("path") or "").strip()
        if not path_text or _cleanup_pin_path_exists(path_text):
            continue
        candidates.append({
            "kind": "pin",
            "label": str(pin.get("name") or _pin_default_name(path_text)),
            "path": path_text,
            "detail": f"missing pin target #{index}",
        })
    return candidates


def _cleanup_watch_candidates() -> list[dict[str, str]]:
    path = _xd_watch_store_path()
    if not path.exists():
        return []
    reason = ""
    try:
        parsed = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        reason = "invalid watch state"
    else:
        snapshot = parsed.get("snapshot") if isinstance(parsed, dict) else None
        if not isinstance(snapshot, dict) or not snapshot:
            reason = "empty watch state"
    if not reason:
        return []
    return [{
        "kind": "watch",
        "label": reason,
        "path": str(path),
        "detail": reason,
    }]


def _run_xd_cleanup(mode: str = "dry-run", keep_exports: int = 5) -> dict[str, Any]:
    normalized_mode = "apply" if str(mode or "").lower() == "apply" else "dry-run"
    keep_count = _normalize_limit(keep_exports, default=5, maximum=50)
    candidates = {
        "exports": _cleanup_export_candidates(keep_count),
        "pins": _cleanup_pin_candidates(),
        "watch": _cleanup_watch_candidates(),
    }
    removed = {"exports": 0, "pins": 0, "watch": 0}
    errors: list[str] = []

    if normalized_mode == "apply":
        for item in candidates["exports"]:
            path_text = str(item.get("path") or "")
            try:
                Path(path_text).unlink(missing_ok=True)
                removed["exports"] += 1
            except Exception as exc:
                errors.append(f"export {path_text}: {str(exc) or exc.__class__.__name__}")

        if candidates["pins"]:
            missing_paths = {str(item.get("path") or "") for item in candidates["pins"]}
            try:
                store = _load_xd_pins_store()
                pins = _xd_pins(store)
                kept = [pin for pin in pins if str(pin.get("path") or "") not in missing_paths]
                removed["pins"] = len(pins) - len(kept)
                store["pins"] = kept
                _save_xd_pins_store(store)
            except Exception as exc:
                errors.append(f"pins: {str(exc) or exc.__class__.__name__}")

        if candidates["watch"]:
            path = _xd_watch_store_path()
            try:
                path.unlink(missing_ok=True)
                removed["watch"] = 1
            except Exception as exc:
                errors.append(f"watch {path}: {str(exc) or exc.__class__.__name__}")

    total = sum(len(items) for items in candidates.values())
    return {
        "summary": "APPLIED" if normalized_mode == "apply" else "DRY_RUN",
        "mode": normalized_mode,
        "keepExports": keep_count,
        "candidates": candidates,
        "candidateCount": total,
        "removed": removed,
        "errors": errors,
    }


def _format_cleanup_category(title: str, items: list[dict[str, str]]) -> list[str]:
    lines = [f"{title}: {len(items)} candidate(s)"]
    for item in items:
        label = str(item.get("label") or title)
        detail = str(item.get("detail") or "").strip()
        path_text = str(item.get("path") or "").strip()
        lines.append(f"- {label}" if not detail else f"- {label}: {detail}")
        if path_text:
            lines.append(f"  {path_text}")
    return lines


def _format_xd_cleanup(result: dict[str, Any]) -> str:
    summary = str(result.get("summary") or "UNKNOWN").upper()
    candidates = result.get("candidates") if isinstance(result.get("candidates"), dict) else {}
    exports = candidates.get("exports") if isinstance(candidates.get("exports"), list) else []
    pins = candidates.get("pins") if isinstance(candidates.get("pins"), list) else []
    watch = candidates.get("watch") if isinstance(candidates.get("watch"), list) else []
    total = int(result.get("candidateCount") or 0)
    lines = [
        f"Xenesis Desk cleanup: {summary}",
        f"Mode: {result.get('mode') or 'dry-run'}",
        f"Keep exports: {result.get('keepExports') or 5}",
        f"Candidates: {total}",
    ]
    if total == 0:
        lines.append("No cleanup candidates.")
        return "\n".join(lines)

    lines.extend(_format_cleanup_category("Exports", exports))
    lines.extend(_format_cleanup_category("Pins", pins))
    lines.extend(_format_cleanup_category("Watch", watch))
    errors = result.get("errors") if isinstance(result.get("errors"), list) else []
    if summary == "APPLIED":
        removed = result.get("removed") if isinstance(result.get("removed"), dict) else {}
        lines.append(
            "Removed: "
            f"exports={removed.get('exports', 0)} "
            f"pins={removed.get('pins', 0)} "
            f"watch={removed.get('watch', 0)} "
            f"errors={len(errors)}"
        )
    else:
        lines.append("Apply: /xd cleanup apply")
    if errors:
        lines.append("Errors:")
        lines.extend(f"- {error}" for error in errors if error)
    return "\n".join(lines)


def _handle_cleanup_command(rest: str) -> str:
    mode, keep_exports, error = _parse_cleanup_args(rest)
    if error:
        return error
    return _format_xd_cleanup(_run_xd_cleanup(mode=mode, keep_exports=keep_exports))


STASH_USAGE = "Usage: /xd stash [save|list|open|remove|restore|diff|export|import|apply|pack|unpack|apply-pack|inspect|promote|schedule|schedules|health|preset|template|pause|resume|trigger|runs|repair|retention|unschedule|prune|path]"
STASH_SAVE_USAGE = "Usage: /xd stash save <name> [:: note]"
STASH_RESTORE_USAGE = "Usage: /xd stash restore #N [dry-run|apply]"
STASH_DIFF_USAGE = "Usage: /xd stash diff #N"
STASH_EXPORT_USAGE = "Usage: /xd stash export #N"
STASH_IMPORT_USAGE = "Usage: /xd stash import <#N|file>"
STASH_APPLY_USAGE = "Usage: /xd stash apply <#N|file> [dry-run|apply]"
STASH_PACK_USAGE = "Usage: /xd stash pack [all|#N ...]"
STASH_UNPACK_USAGE = "Usage: /xd stash unpack <#N|file>"
STASH_APPLY_PACK_USAGE = "Usage: /xd stash apply-pack <#N|file> [dry-run|apply]"
STASH_INSPECT_USAGE = "Usage: /xd stash inspect <#N|file>"
STASH_PROMOTE_USAGE = "Usage: /xd stash promote #N"
STASH_SCHEDULE_USAGE = "Usage: /xd stash schedule #N <cron|interval> [deliver=local|origin|platform[:target]]"
STASH_CRON_ACTION_USAGE = "Usage: /xd stash [pause|resume|trigger] <#N|job-id|stash-name>"
STASH_RUNS_USAGE = "Usage: /xd stash runs <#N|job-id|stash-name> [limit=N]"
STASH_REPAIR_USAGE = "Usage: /xd stash repair [dry-run|apply]"
STASH_HEALTH_USAGE = "Usage: /xd stash health [digest|schedule <cron|interval> [deliver=...]]"
STASH_PRESET_USAGE = "Usage: /xd stash preset [list|add <name> <deliver>|remove <name>]"
STASH_TEMPLATE_USAGE = "Usage: /xd stash template [list|add <name> <cron|interval> [deliver=...]|remove <name>]"
STASH_RETENTION_USAGE = "Usage: /xd stash retention [dry-run|apply] [run-days=N] [failed-days=N]"
STASH_UNSCHEDULE_USAGE = "Usage: /xd stash unschedule <#N|job-id|stash-name> [dry-run|apply]"
STASH_PRUNE_USAGE = "Usage: /xd stash prune [dry-run|apply] [keep=N]"


def _stash_store_path() -> Path:
    return _quick_actions_store_path().parent / "stashes.json"


def _stash_schedule_store_path() -> Path:
    return _quick_actions_store_path().parent / "stash_schedules.json"


def _stash_ops_store_path() -> Path:
    return _quick_actions_store_path().parent / "stash_ops.json"


def _normalize_stash_item(item: Any) -> dict[str, Any]:
    if not isinstance(item, dict):
        return {}
    name = str(item.get("name") or "").strip()
    if not name:
        return {}
    pins = item.get("pins") if isinstance(item.get("pins"), list) else []
    quick_actions = item.get("quickActions") if isinstance(item.get("quickActions"), list) else []
    workflows = item.get("workflows") if isinstance(item.get("workflows"), list) else []
    exports = item.get("exports") if isinstance(item.get("exports"), list) else []
    return {
        "name": name,
        "note": str(item.get("note") or "").strip(),
        "workspace": str(item.get("workspace") or "").strip(),
        "createdAt": item.get("createdAt") if isinstance(item.get("createdAt"), (int, float)) else 0,
        "updatedAt": item.get("updatedAt") if isinstance(item.get("updatedAt"), (int, float)) else 0,
        "pins": [dict(pin) for pin in pins if isinstance(pin, dict)],
        "quickActions": [dict(action) for action in quick_actions if isinstance(action, dict)],
        "workflows": [dict(workflow) for workflow in workflows if isinstance(workflow, dict)],
        "exports": [dict(export) for export in exports if isinstance(export, dict)],
    }


def _load_stash_store() -> dict[str, Any]:
    path = _stash_store_path()
    if not path.exists():
        return {"version": 1, "stashes": []}
    try:
        parsed = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {"version": 1, "stashes": []}
    if not isinstance(parsed, dict):
        return {"version": 1, "stashes": []}
    raw_stashes = parsed.get("stashes")
    if not isinstance(raw_stashes, list):
        raw_stashes = []
    stashes = [
        stash
        for stash in (_normalize_stash_item(item) for item in raw_stashes)
        if stash
    ]
    return {"version": 1, "stashes": stashes}


def _save_stash_store(store: dict[str, Any]) -> None:
    path = _stash_store_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(store, ensure_ascii=False, indent=2), encoding="utf-8")


def _normalize_stash_schedule_item(item: Any) -> dict[str, Any]:
    if not isinstance(item, dict):
        return {}
    schedule_id = str(item.get("id") or "").strip()
    cron_job_id = str(item.get("cronJobId") or "").strip()
    stash_name = str(item.get("stashName") or "").strip()
    command = str(item.get("command") or "").strip()
    if not schedule_id or not cron_job_id or not stash_name or not command:
        return {}
    try:
        stash_index = int(item.get("stashIndex") or 0)
    except (TypeError, ValueError):
        stash_index = 0
    return {
        "id": schedule_id,
        "stashName": stash_name,
        "stashIndex": stash_index,
        "workspace": str(item.get("workspace") or "").strip(),
        "scheduleInput": str(item.get("scheduleInput") or "").strip(),
        "scheduleDisplay": str(item.get("scheduleDisplay") or "").strip(),
        "cronJobId": cron_job_id,
        "script": str(item.get("script") or "").strip(),
        "command": command,
        "deliver": str(item.get("deliver") or "local").strip() or "local",
        "createdAt": item.get("createdAt") if isinstance(item.get("createdAt"), (int, float)) else 0,
        "updatedAt": item.get("updatedAt") if isinstance(item.get("updatedAt"), (int, float)) else 0,
        "nextRunAt": str(item.get("nextRunAt") or "").strip(),
        "lastRunAt": str(item.get("lastRunAt") or "").strip(),
        "lastStatus": str(item.get("lastStatus") or "").strip(),
        "lastError": str(item.get("lastError") or "").strip(),
        "state": str(item.get("state") or "").strip(),
        "enabled": bool(item.get("enabled", True)),
    }


def _load_stash_schedule_store() -> dict[str, Any]:
    path = _stash_schedule_store_path()
    if not path.exists():
        return {"version": 1, "schedules": []}
    try:
        parsed = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {"version": 1, "schedules": []}
    if not isinstance(parsed, dict):
        return {"version": 1, "schedules": []}
    raw_schedules = parsed.get("schedules")
    if not isinstance(raw_schedules, list):
        raw_schedules = []
    schedules = [
        schedule
        for schedule in (_normalize_stash_schedule_item(item) for item in raw_schedules)
        if schedule
    ]
    return {"version": 1, "schedules": schedules}


def _save_stash_schedule_store(store: dict[str, Any]) -> None:
    path = _stash_schedule_store_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    schedules = store.get("schedules") if isinstance(store.get("schedules"), list) else []
    path.write_text(
        json.dumps({"version": 1, "schedules": schedules}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def _normalize_named_map(raw: Any) -> dict[str, dict[str, Any]]:
    if not isinstance(raw, dict):
        return {}
    normalized: dict[str, dict[str, Any]] = {}
    for key, value in raw.items():
        name = str(key or "").strip()
        if not name or not isinstance(value, dict):
            continue
        normalized[name] = dict(value)
    return normalized


def _load_stash_ops_store() -> dict[str, Any]:
    path = _stash_ops_store_path()
    if not path.exists():
        return {"version": 1, "deliveryPresets": {}, "scheduleTemplates": {}, "healthDigests": []}
    try:
        parsed = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {"version": 1, "deliveryPresets": {}, "scheduleTemplates": {}, "healthDigests": []}
    if not isinstance(parsed, dict):
        return {"version": 1, "deliveryPresets": {}, "scheduleTemplates": {}, "healthDigests": []}
    digests = parsed.get("healthDigests") if isinstance(parsed.get("healthDigests"), list) else []
    return {
        "version": 1,
        "deliveryPresets": _normalize_named_map(parsed.get("deliveryPresets")),
        "scheduleTemplates": _normalize_named_map(parsed.get("scheduleTemplates")),
        "healthDigests": [dict(item) for item in digests if isinstance(item, dict)],
    }


def _save_stash_ops_store(store: dict[str, Any]) -> None:
    path = _stash_ops_store_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "version": 1,
        "deliveryPresets": _normalize_named_map(store.get("deliveryPresets")),
        "scheduleTemplates": _normalize_named_map(store.get("scheduleTemplates")),
        "healthDigests": store.get("healthDigests") if isinstance(store.get("healthDigests"), list) else [],
    }
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def _normalize_stash_ops_name(value: str) -> str:
    return re.sub(r"[^a-z0-9_.-]+", "-", str(value or "").strip().lower()).strip("-")


def _resolve_stash_delivery(value: str) -> str:
    text = str(value or "local").strip() or "local"
    presets = _load_stash_ops_store().get("deliveryPresets")
    if not isinstance(presets, dict):
        return text
    preset = presets.get(_normalize_stash_ops_name(text))
    if isinstance(preset, dict) and str(preset.get("deliver") or "").strip():
        return str(preset.get("deliver") or "").strip()
    return text


def _current_hermes_home_path() -> Path:
    try:
        from hermes_constants import get_hermes_home

        return get_hermes_home()
    except Exception:
        return Path.home() / ".hermes"


def _cron_jobs_for_current_home():
    from cron import jobs as cron_jobs

    home = _current_hermes_home_path().resolve()
    cron_jobs.HERMES_DIR = home
    cron_jobs.CRON_DIR = home / "cron"
    cron_jobs.JOBS_FILE = cron_jobs.CRON_DIR / "jobs.json"
    cron_jobs.OUTPUT_DIR = cron_jobs.CRON_DIR / "output"
    return cron_jobs


def _stashes(store: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    data = store if isinstance(store, dict) else _load_stash_store()
    stashes = data.get("stashes")
    return stashes if isinstance(stashes, list) else []


def _stash_counts(stash: dict[str, Any]) -> dict[str, int]:
    return {
        "pins": len(stash.get("pins") if isinstance(stash.get("pins"), list) else []),
        "quick": len(stash.get("quickActions") if isinstance(stash.get("quickActions"), list) else []),
        "workflows": len(stash.get("workflows") if isinstance(stash.get("workflows"), list) else []),
        "exports": len(stash.get("exports") if isinstance(stash.get("exports"), list) else []),
    }


def _stash_counts_text(stash: dict[str, Any]) -> str:
    counts = _stash_counts(stash)
    return (
        f"pins={counts['pins']} quick={counts['quick']} "
        f"workflows={counts['workflows']} exports={counts['exports']}"
    )


def _parse_stash_save_text(rest: str) -> tuple[str, str]:
    text = str(rest or "").strip()
    if "::" in text:
        raw_name, raw_note = text.split("::", 1)
        return _strip_wrapping_quotes(raw_name).strip(), raw_note.strip()
    return _strip_wrapping_quotes(text).strip(), ""


def _stash_export_snapshot(limit: int = 5) -> list[dict[str, Any]]:
    result = _run_xd_exports(limit=limit)
    entries = result.get("entries") if isinstance(result.get("entries"), list) else []
    exports: list[dict[str, Any]] = []
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        file_name = str(entry.get("fileName") or Path(str(entry.get("filePath") or "")).name)
        file_path = str(entry.get("filePath") or "")
        if not file_name and not file_path:
            continue
        exports.append({
            "kind": str(entry.get("kind") or "export"),
            "fileName": file_name,
            "filePath": file_path,
            "modified": str(entry.get("modified") or ""),
        })
    return exports


def _build_stash_snapshot(name: str, note: str, *, created_at: float | None = None) -> dict[str, Any]:
    workspace = _quick_actions_workspace_key()
    quick_store = _load_quick_actions_store()
    workflow_store = _load_workflow_store()
    now = time.time()
    return {
        "name": name,
        "note": note,
        "workspace": workspace,
        "createdAt": created_at if isinstance(created_at, (int, float)) and created_at > 0 else now,
        "updatedAt": now,
        "pins": [
            {
                "name": str(pin.get("name") or _pin_default_name(str(pin.get("path") or ""))),
                "path": str(pin.get("path") or ""),
            }
            for pin in _xd_pins()
            if isinstance(pin, dict) and str(pin.get("path") or "").strip()
        ],
        "quickActions": [
            {
                "name": str(action.get("name") or ""),
                "command": str(action.get("command") or ""),
            }
            for action in _quick_actions_for_workspace(quick_store, workspace)
            if str(action.get("name") or "").strip() and str(action.get("command") or "").strip()
        ],
        "workflows": [
            {
                "name": str(workflow.get("name") or ""),
                "steps": [str(step) for step in workflow.get("steps", []) if str(step).strip()],
            }
            for workflow in _workflows_for_workspace(workflow_store, workspace)
            if str(workflow.get("name") or "").strip()
        ],
        "exports": _stash_export_snapshot(limit=5),
    }


def _run_xd_stash_save(rest: str) -> dict[str, Any]:
    name, note = _parse_stash_save_text(rest)
    if not name:
        return {"summary": "ERROR", "error": STASH_SAVE_USAGE}
    store = _load_stash_store()
    stashes = _stashes(store)
    existing_index = next(
        (index for index, item in enumerate(stashes) if str(item.get("name") or "").casefold() == name.casefold()),
        -1,
    )
    created_at = stashes[existing_index].get("createdAt") if existing_index >= 0 else None
    stash = _build_stash_snapshot(name, note, created_at=created_at)
    if existing_index >= 0:
        stashes[existing_index] = stash
        summary = "UPDATED"
        index = existing_index + 1
    else:
        stashes.append(stash)
        summary = "OK"
        index = len(stashes)
    store["stashes"] = stashes
    _save_stash_store(store)
    return {
        "summary": summary,
        "index": index,
        "stash": stash,
        "path": str(_stash_store_path()),
    }


def _format_xd_stash_save(result: dict[str, Any]) -> str:
    if result.get("summary") == "ERROR":
        return str(result.get("error") or STASH_SAVE_USAGE)
    stash = result.get("stash") if isinstance(result.get("stash"), dict) else {}
    verb = "Updated" if str(result.get("summary") or "").upper() == "UPDATED" else "Saved"
    index = result.get("index") or "?"
    return "\n".join([
        f"{verb} Xenesis Desk stash #{index}: {stash.get('name') or 'stash'}",
        f"Workspace: {stash.get('workspace') or _quick_actions_workspace_key()}",
        f"Counts: {_stash_counts_text(stash)}",
        f"Open: /xd stash open #{index}",
    ])


def _format_xd_stashes() -> str:
    store = _load_stash_store()
    stashes = _stashes(store)
    lines = [
        "Xenesis Desk stashes:",
        f"Path: {_stash_store_path()}",
    ]
    if not stashes:
        lines.append("No Xenesis Desk stashes.")
        lines.append("Save: /xd stash save <name> [:: note]")
        return "\n".join(lines)
    normalized = []
    for index, stash in enumerate(stashes, start=1):
        name = str(stash.get("name") or f"Stash #{index}")
        lines.append(f"{index}. {name}")
        workspace = str(stash.get("workspace") or "").strip()
        if workspace:
            lines.append(f"   Workspace: {workspace}")
        note = str(stash.get("note") or "").strip()
        if note:
            lines.append(f"   Note: {note}")
        lines.append(f"   Counts: {_stash_counts_text(stash)}")
        lines.append(f"   -> /xd stash open #{index}")
        normalized.append({**stash, "_replyCommand": f"/xd stash open #{index}"})
    if normalized:
        _cache_selection("stashes", normalized)
    lines.append("Manage: /xd stash save <name> [:: note] | /xd stash remove #N")
    return "\n".join(lines)


def _stash_from_selector(selector: str) -> tuple[dict[str, Any], int, str]:
    text = _strip_wrapping_quotes(str(selector or "").strip())
    index = _selector_index(text) or _selector_index(_selector_from_reply(text))
    stashes = _stashes()
    if index is not None:
        if index < 1 or index > len(stashes):
            return {}, 0, f"No Xenesis Desk stash for {text}. Run /xd stash to see stashes."
        return stashes[index - 1], index, ""
    if not text:
        return {}, 0, "Usage: /xd stash open #N"
    for item_index, stash in enumerate(stashes, start=1):
        if str(stash.get("name") or "").casefold() == text.casefold():
            return stash, item_index, ""
    return {}, 0, f"No Xenesis Desk stash for {text}. Run /xd stash to see stashes."


def _format_xd_stash_open(stash: dict[str, Any], index: int) -> str:
    name = str(stash.get("name") or f"stash #{index}")
    lines = [
        f"Xenesis Desk stash open: {name}",
        f"Workspace: {stash.get('workspace') or ''}",
    ]
    note = str(stash.get("note") or "").strip()
    if note:
        lines.append(f"Note: {note}")

    pins = stash.get("pins") if isinstance(stash.get("pins"), list) else []
    lines.append(f"Pins: {len(pins)}")
    for item_index, pin in enumerate(pins, start=1):
        if not isinstance(pin, dict):
            continue
        label = str(pin.get("name") or _pin_default_name(str(pin.get("path") or "")))
        path_text = str(pin.get("path") or "").strip()
        lines.append(f"{item_index}. {label}")
        if path_text:
            lines.append(f"   {path_text}")
            lines.append(f"   /xd open {path_text}")

    quick_actions = stash.get("quickActions") if isinstance(stash.get("quickActions"), list) else []
    lines.append(f"Quick actions: {len(quick_actions)}")
    for item_index, action in enumerate(quick_actions, start=1):
        if not isinstance(action, dict):
            continue
        label = str(action.get("name") or f"Quick action #{item_index}")
        command = _normalize_quick_command(str(action.get("command") or ""))
        lines.append(f"{item_index}. {label}")
        if command:
            lines.append(f"   /xd {command}")

    workflows = stash.get("workflows") if isinstance(stash.get("workflows"), list) else []
    lines.append(f"Workflows: {len(workflows)}")
    for item_index, workflow in enumerate(workflows, start=1):
        if not isinstance(workflow, dict):
            continue
        steps = workflow.get("steps") if isinstance(workflow.get("steps"), list) else []
        label = str(workflow.get("name") or f"Workflow #{item_index}")
        lines.append(f"{item_index}. {label} ({len(steps)} step(s))")
        for step_index, step in enumerate(steps, start=1):
            command = _normalize_quick_command(str(step))
            if command:
                lines.append(f"   {step_index}. /xd {command}")

    exports = stash.get("exports") if isinstance(stash.get("exports"), list) else []
    lines.append(f"Exports: {len(exports)}")
    for item_index, export in enumerate(exports, start=1):
        if not isinstance(export, dict):
            continue
        kind = str(export.get("kind") or "export")
        file_name = str(export.get("fileName") or Path(str(export.get("filePath") or "")).name)
        lines.append(f"{item_index}. {kind}: {file_name}")
        if file_name:
            lines.append(f"   /xd exports open {file_name}")
    return "\n".join(lines)


def _parse_stash_restore_args(rest: str) -> tuple[str, str, str]:
    parts = _split_args(rest)
    if not parts:
        return "", "dry-run", STASH_RESTORE_USAGE
    selector = parts[0]
    mode = "dry-run"
    for part in parts[1:]:
        lowered = str(part or "").strip().lower()
        if lowered in {"dry-run", "dryrun", "preview", "check"}:
            mode = "dry-run"
        elif lowered in {"apply", "--apply", "run"}:
            mode = "apply"
        else:
            return selector, mode, STASH_RESTORE_USAGE
    return selector, mode, ""


def _restore_workflow_key(steps: list[str]) -> str:
    return "\n".join(_normalize_quick_command(step) for step in steps if _normalize_quick_command(step))


def _stash_restore_plan(stash: dict[str, Any]) -> dict[str, Any]:
    workspace = _quick_actions_workspace_key()
    pin_store = _load_xd_pins_store()
    existing_pins = _xd_pins(pin_store)
    quick_store = _load_quick_actions_store()
    existing_quick = _quick_actions_for_workspace(quick_store, workspace)
    workflow_store = _load_workflow_store()
    existing_workflows = _workflows_for_workspace(workflow_store, workspace)

    existing_pin_paths = {str(pin.get("path") or "") for pin in existing_pins if isinstance(pin, dict)}
    existing_quick_names = {str(action.get("name") or "").casefold() for action in existing_quick if isinstance(action, dict)}
    existing_quick_commands = {_normalize_quick_command(str(action.get("command") or "")) for action in existing_quick if isinstance(action, dict)}
    existing_workflow_names = {str(workflow.get("name") or "").casefold() for workflow in existing_workflows if isinstance(workflow, dict)}
    existing_workflow_steps = {
        _restore_workflow_key([str(step) for step in workflow.get("steps", [])])
        for workflow in existing_workflows
        if isinstance(workflow, dict)
    }

    add_pins: list[dict[str, Any]] = []
    skip_pins: list[dict[str, Any]] = []
    for pin in stash.get("pins", []) if isinstance(stash.get("pins"), list) else []:
        if not isinstance(pin, dict):
            continue
        path_text = str(pin.get("path") or "").strip()
        if not path_text:
            continue
        normalized_pin = {
            "name": str(pin.get("name") or _pin_default_name(path_text)),
            "path": path_text,
        }
        if path_text in existing_pin_paths:
            skip_pins.append(normalized_pin)
        else:
            add_pins.append(normalized_pin)

    add_quick: list[dict[str, str]] = []
    skip_quick: list[dict[str, str]] = []
    for action in stash.get("quickActions", []) if isinstance(stash.get("quickActions"), list) else []:
        if not isinstance(action, dict):
            continue
        name = str(action.get("name") or "").strip()
        command = _normalize_quick_command(str(action.get("command") or ""))
        if not name or not command:
            continue
        normalized_action = {"name": name, "command": command}
        if name.casefold() in existing_quick_names or command in existing_quick_commands:
            skip_quick.append(normalized_action)
        else:
            add_quick.append(normalized_action)

    add_workflows: list[dict[str, Any]] = []
    skip_workflows: list[dict[str, Any]] = []
    for workflow in stash.get("workflows", []) if isinstance(stash.get("workflows"), list) else []:
        if not isinstance(workflow, dict):
            continue
        name = str(workflow.get("name") or "").strip()
        steps = [
            _normalize_quick_command(str(step))
            for step in (workflow.get("steps") if isinstance(workflow.get("steps"), list) else [])
        ]
        steps = [step for step in steps if step]
        if not name or not steps:
            continue
        normalized_workflow = {"name": name, "steps": steps}
        steps_key = _restore_workflow_key(steps)
        if name.casefold() in existing_workflow_names or steps_key in existing_workflow_steps:
            skip_workflows.append(normalized_workflow)
        else:
            add_workflows.append(normalized_workflow)

    exports = stash.get("exports") if isinstance(stash.get("exports"), list) else []
    return {
        "workspace": workspace,
        "add": {
            "pins": add_pins,
            "quickActions": add_quick,
            "workflows": add_workflows,
        },
        "skip": {
            "pins": skip_pins,
            "quickActions": skip_quick,
            "workflows": skip_workflows,
        },
        "exports": [dict(item) for item in exports if isinstance(item, dict)],
    }


def _count_restore_bucket(bucket: dict[str, Any]) -> dict[str, int]:
    return {
        "pins": len(bucket.get("pins") if isinstance(bucket.get("pins"), list) else []),
        "quick": len(bucket.get("quickActions") if isinstance(bucket.get("quickActions"), list) else []),
        "workflows": len(bucket.get("workflows") if isinstance(bucket.get("workflows"), list) else []),
    }


def _restore_counts_text(bucket: dict[str, Any]) -> str:
    counts = _count_restore_bucket(bucket)
    return f"pins={counts['pins']} quick={counts['quick']} workflows={counts['workflows']}"


def _restore_count_values_text(counts: dict[str, Any]) -> str:
    return (
        f"pins={int(counts.get('pins', 0))} "
        f"quick={int(counts.get('quick', 0))} "
        f"workflows={int(counts.get('workflows', 0))}"
    )


def _apply_stash_restore(plan: dict[str, Any]) -> tuple[dict[str, int], list[str]]:
    added = {"pins": 0, "quick": 0, "workflows": 0}
    errors: list[str] = []
    workspace = _quick_actions_workspace_key()
    add = plan.get("add") if isinstance(plan.get("add"), dict) else {}

    pins_to_add = add.get("pins") if isinstance(add.get("pins"), list) else []
    if pins_to_add:
        try:
            store = _load_xd_pins_store()
            pins = _xd_pins(store)
            now = time.time()
            for pin in pins_to_add:
                if not isinstance(pin, dict):
                    continue
                path_text = str(pin.get("path") or "").strip()
                if not path_text:
                    continue
                pins.append({
                    "name": str(pin.get("name") or _pin_default_name(path_text)),
                    "path": path_text,
                    "addedAt": now,
                })
                added["pins"] += 1
            store["pins"] = pins
            _save_xd_pins_store(store)
        except Exception as exc:
            errors.append(f"pins: {str(exc) or exc.__class__.__name__}")

    quick_to_add = add.get("quickActions") if isinstance(add.get("quickActions"), list) else []
    if quick_to_add:
        try:
            store = _load_quick_actions_store()
            actions = _quick_actions_for_workspace(store, workspace)
            for action in quick_to_add:
                if not isinstance(action, dict):
                    continue
                name = str(action.get("name") or "").strip()
                command = _normalize_quick_command(str(action.get("command") or ""))
                if not name or not command:
                    continue
                actions.append({"name": name, "command": command})
                added["quick"] += 1
            store["workspaces"][workspace] = actions
            _save_quick_actions_store(store)
        except Exception as exc:
            errors.append(f"quick: {str(exc) or exc.__class__.__name__}")

    workflows_to_add = add.get("workflows") if isinstance(add.get("workflows"), list) else []
    if workflows_to_add:
        try:
            store = _load_workflow_store()
            workflows = _workflows_for_workspace(store, workspace)
            for workflow in workflows_to_add:
                if not isinstance(workflow, dict):
                    continue
                name = str(workflow.get("name") or "").strip()
                steps = [
                    _normalize_quick_command(str(step))
                    for step in (workflow.get("steps") if isinstance(workflow.get("steps"), list) else [])
                ]
                steps = [step for step in steps if step]
                if not name or not steps:
                    continue
                workflows.append({"name": name, "steps": steps})
                added["workflows"] += 1
            store["workspaces"][workspace] = workflows
            _save_workflow_store(store)
        except Exception as exc:
            errors.append(f"workflows: {str(exc) or exc.__class__.__name__}")

    return added, errors


def _run_xd_stash_restore(rest: str) -> dict[str, Any]:
    selector, mode, error = _parse_stash_restore_args(rest)
    if error:
        return {"summary": "ERROR", "error": error}
    stash, index, error = _stash_from_selector(selector)
    if error:
        return {"summary": "ERROR", "error": error}
    plan = _stash_restore_plan(stash)
    added = {"pins": 0, "quick": 0, "workflows": 0}
    errors: list[str] = []
    if mode == "apply":
        added, errors = _apply_stash_restore(plan)
    return {
        "summary": "APPLIED" if mode == "apply" else "DRY_RUN",
        "mode": mode,
        "index": index,
        "stash": stash,
        "plan": plan,
        "added": added,
        "errors": errors,
    }


def _run_xd_stash_diff(rest: str) -> dict[str, Any]:
    parts = _split_args(rest)
    if len(parts) != 1:
        return {"summary": "ERROR", "error": STASH_DIFF_USAGE}
    stash, index, error = _stash_from_selector(parts[0])
    if error:
        return {"summary": "ERROR", "error": error}
    return {
        "summary": "OK",
        "index": index,
        "stash": stash,
        "plan": _stash_restore_plan(stash),
    }


def _stash_export_markdown(stash: dict[str, Any], index: int) -> tuple[str, dict[str, Any]]:
    normalized_stash = _normalize_stash_item(stash)
    counts = _stash_counts(normalized_stash)
    payload = {
        "schema": "xenesis-stash-export",
        "version": 1,
        "exportedAt": _format_action_timestamp(time.time()),
        "sourceIndex": index,
        "counts": counts,
        "stash": normalized_stash,
    }
    header = [
        "# Xenesis Desk Stash Export",
        "",
        f"Exported: {payload['exportedAt']}",
        f"Stash: {normalized_stash.get('name') or 'stash'}",
        f"Workspace: {normalized_stash.get('workspace') or ''}",
        f"Counts: {_stash_counts_text(normalized_stash)}",
        "",
        "```json",
        json.dumps(payload, ensure_ascii=False, indent=2),
        "```",
        "",
    ]
    return "\n".join(header), payload


def _run_xd_stash_export(rest: str, open_in_xd: bool = True) -> dict[str, Any]:
    parts = _split_args(rest)
    if len(parts) != 1:
        return {"summary": "ERROR", "error": STASH_EXPORT_USAGE}
    stash, index, error = _stash_from_selector(parts[0])
    if error:
        return {"summary": "ERROR", "error": error}

    content, payload = _stash_export_markdown(stash, index)
    export_dir = _xd_export_dir()
    export_dir.mkdir(parents=True, exist_ok=True)
    file_path = export_dir / _xd_export_filename("stash")
    file_path.write_text(content, encoding="utf-8")

    opened = False
    open_error = ""
    if open_in_xd:
        try:
            bridge_payload = _call_bridge(
                "/open-file",
                _bridge_open_file_payload(str(file_path), {}),
            )
            opened = bool(bridge_payload.get("opened", bridge_payload.get("ok", True)))
        except Exception as exc:
            open_error = str(exc) or exc.__class__.__name__

    return {
        "summary": "PARTIAL" if open_error else "OK",
        "kind": "stash",
        "index": index,
        "stash": payload.get("stash") if isinstance(payload.get("stash"), dict) else {},
        "counts": payload.get("counts") if isinstance(payload.get("counts"), dict) else {},
        "filePath": str(file_path),
        "opened": opened,
        "openError": open_error,
    }


def _stash_schedule_export_item(schedule: dict[str, Any]) -> dict[str, Any]:
    return {
        "stashName": str(schedule.get("stashName") or "").strip(),
        "workspace": str(schedule.get("workspace") or "").strip(),
        "scheduleInput": str(schedule.get("scheduleInput") or "").strip(),
        "scheduleDisplay": str(schedule.get("scheduleDisplay") or "").strip(),
        "deliver": str(schedule.get("deliver") or "local").strip() or "local",
        "command": str(schedule.get("command") or "").strip(),
    }


def _stash_schedules_for_stash_name(stash_name: str) -> list[dict[str, Any]]:
    target = str(stash_name or "").strip().casefold()
    if not target:
        return []
    schedules = _load_stash_schedule_store().get("schedules")
    if not isinstance(schedules, list):
        return []
    return [
        _stash_schedule_export_item(schedule)
        for schedule in schedules
        if isinstance(schedule, dict) and str(schedule.get("stashName") or "").strip().casefold() == target
    ]


def _stash_pack_counts(entries: list[dict[str, Any]]) -> dict[str, int]:
    counts = {"stashes": 0, "pins": 0, "quick": 0, "workflows": 0, "exports": 0, "schedules": 0}
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        stash = entry.get("stash") if isinstance(entry.get("stash"), dict) else {}
        item_counts = _stash_counts(stash)
        counts["stashes"] += 1
        counts["pins"] += item_counts["pins"]
        counts["quick"] += item_counts["quick"]
        counts["workflows"] += item_counts["workflows"]
        counts["exports"] += item_counts["exports"]
        counts["schedules"] += len(entry.get("schedules") if isinstance(entry.get("schedules"), list) else [])
    return counts


def _stash_pack_counts_text(counts: dict[str, Any]) -> str:
    return (
        f"pins={counts.get('pins', 0)} quick={counts.get('quick', 0)} "
        f"workflows={counts.get('workflows', 0)} exports={counts.get('exports', 0)}"
    )


def _resolve_stash_pack_entries(rest: str) -> tuple[list[dict[str, Any]], str]:
    parts = _split_args(rest)
    stashes = _stashes()

    if not parts or (len(parts) == 1 and parts[0].lower() in {"all", "*"}):
        if not stashes:
            return [], "No Xenesis Desk stashes to pack. Run /xd stash save <name> [:: note]."
        return [
            {
                "sourceIndex": index,
                "stash": _normalize_stash_item(stash),
                "schedules": _stash_schedules_for_stash_name(str(stash.get("name") or "")),
            }
            for index, stash in enumerate(stashes, start=1)
            if _normalize_stash_item(stash)
        ], ""

    entries: list[dict[str, Any]] = []
    seen: set[int] = set()
    for selector in parts:
        if str(selector or "").strip().lower() in {"all", "*"}:
            for index, stash in enumerate(stashes, start=1):
                normalized = _normalize_stash_item(stash)
                if normalized and index not in seen:
                    entries.append({
                        "sourceIndex": index,
                        "stash": normalized,
                        "schedules": _stash_schedules_for_stash_name(str(normalized.get("name") or "")),
                    })
                    seen.add(index)
            continue
        stash, index, error = _stash_from_selector(selector)
        if error:
            return [], error
        normalized = _normalize_stash_item(stash)
        if normalized and index not in seen:
            entries.append({
                "sourceIndex": index,
                "stash": normalized,
                "schedules": _stash_schedules_for_stash_name(str(normalized.get("name") or "")),
            })
            seen.add(index)
    if not entries:
        return [], STASH_PACK_USAGE
    return entries, ""


def _stash_pack_markdown(entries: list[dict[str, Any]]) -> tuple[str, dict[str, Any]]:
    counts = _stash_pack_counts(entries)
    payload = {
        "schema": "xenesis-stash-pack",
        "version": 1,
        "exportedAt": _format_action_timestamp(time.time()),
        "counts": counts,
        "stashes": entries,
    }
    header = [
        "# Xenesis Desk Stash Pack",
        "",
        f"Exported: {payload['exportedAt']}",
        f"Stashes: {counts['stashes']}",
        f"Counts: {_stash_pack_counts_text(counts)}",
        "",
        "```json",
        json.dumps(payload, ensure_ascii=False, indent=2),
        "```",
        "",
    ]
    return "\n".join(header), payload


def _run_xd_stash_pack(rest: str, open_in_xd: bool = True) -> dict[str, Any]:
    entries, error = _resolve_stash_pack_entries(rest)
    if error:
        return {"summary": "ERROR", "error": error}
    content, payload = _stash_pack_markdown(entries)
    export_dir = _xd_export_dir()
    export_dir.mkdir(parents=True, exist_ok=True)
    file_path = export_dir / _xd_export_filename("stash-pack")
    file_path.write_text(content, encoding="utf-8")

    opened = False
    open_error = ""
    if open_in_xd:
        try:
            bridge_payload = _call_bridge(
                "/open-file",
                _bridge_open_file_payload(str(file_path), {}),
            )
            opened = bool(bridge_payload.get("opened", bridge_payload.get("ok", True)))
        except Exception as exc:
            open_error = str(exc) or exc.__class__.__name__

    return {
        "summary": "PARTIAL" if open_error else "OK",
        "kind": "stash-pack",
        "counts": payload.get("counts") if isinstance(payload.get("counts"), dict) else {},
        "filePath": str(file_path),
        "opened": opened,
        "openError": open_error,
    }


def _stash_export_payload_from_markdown(content: str) -> tuple[dict[str, Any], str]:
    text = str(content or "").strip()
    payload_text = ""
    if text.startswith("{"):
        payload_text = text
    else:
        match = re.search(r"```json\s*(\{.*?\})\s*```", text, flags=re.IGNORECASE | re.DOTALL)
        if match:
            payload_text = match.group(1)
    if not payload_text:
        return {}, "File is not a valid Xenesis Desk stash export."
    try:
        payload = json.loads(payload_text)
    except Exception as exc:
        return {}, f"File is not a valid Xenesis Desk stash export: {str(exc) or exc.__class__.__name__}"
    if not isinstance(payload, dict) or payload.get("schema") != "xenesis-stash-export":
        return {}, "File is not a valid Xenesis Desk stash export."
    if payload.get("version") != 1:
        return {}, f"Unsupported Xenesis Desk stash export version: {payload.get('version') or 'unknown'}"
    stash = _normalize_stash_item(payload.get("stash"))
    if not stash:
        return {}, "File is not a valid Xenesis Desk stash export."
    return stash, ""


def _stash_pack_payload_from_markdown(content: str) -> tuple[list[dict[str, Any]], int, str]:
    text = str(content or "").strip()
    payload_text = ""
    if text.startswith("{"):
        payload_text = text
    else:
        match = re.search(r"```json\s*(\{.*?\})\s*```", text, flags=re.IGNORECASE | re.DOTALL)
        if match:
            payload_text = match.group(1)
    if not payload_text:
        return [], 0, "File is not a valid Xenesis Desk stash pack."
    try:
        payload = json.loads(payload_text)
    except Exception as exc:
        return [], 0, f"File is not a valid Xenesis Desk stash pack: {str(exc) or exc.__class__.__name__}"
    if not isinstance(payload, dict) or payload.get("schema") != "xenesis-stash-pack":
        return [], 0, "File is not a valid Xenesis Desk stash pack."
    if payload.get("version") != 1:
        return [], 0, f"Unsupported Xenesis Desk stash pack version: {payload.get('version') or 'unknown'}"

    raw_entries = payload.get("stashes")
    if not isinstance(raw_entries, list):
        return [], 0, "Xenesis Desk stash pack contains no valid stashes."

    entries: list[dict[str, Any]] = []
    skipped = 0
    for raw_entry in raw_entries:
        source_index = 0
        stash: dict[str, Any] = {}
        schedules: list[dict[str, Any]] = []
        if isinstance(raw_entry, dict):
            raw_source_index = raw_entry.get("sourceIndex")
            if isinstance(raw_source_index, int) and raw_source_index > 0:
                source_index = raw_source_index
            stash = _normalize_stash_item(raw_entry.get("stash"))
            raw_schedules = raw_entry.get("schedules") if isinstance(raw_entry.get("schedules"), list) else []
            schedules = [
                _stash_schedule_export_item(schedule)
                for schedule in raw_schedules
                if isinstance(schedule, dict) and str(schedule.get("scheduleInput") or "").strip()
            ]
        if stash:
            entries.append({"sourceIndex": source_index, "stash": stash, "schedules": schedules})
        else:
            skipped += 1
    if not entries:
        return [], skipped, "Xenesis Desk stash pack contains no valid stashes."
    return entries, skipped, ""


def _run_xd_stash_import(rest: str) -> dict[str, Any]:
    parts = _split_args(rest)
    if len(parts) != 1:
        return {"summary": "ERROR", "error": STASH_IMPORT_USAGE}
    file_path, error = _resolve_xd_export_reference(parts[0])
    if error:
        return {"summary": "ERROR", "error": error}
    try:
        content = file_path.read_text(encoding="utf-8")
    except Exception as exc:
        return {"summary": "ERROR", "error": f"Could not read Xenesis Desk stash export: {str(exc) or exc.__class__.__name__}"}
    stash, error = _stash_export_payload_from_markdown(content)
    if error:
        return {"summary": "ERROR", "error": error}

    now = time.time()
    if not isinstance(stash.get("createdAt"), (int, float)) or stash.get("createdAt", 0) <= 0:
        stash["createdAt"] = now
    stash["updatedAt"] = now

    store = _load_stash_store()
    stashes = _stashes(store)
    existing_index = next(
        (index for index, item in enumerate(stashes) if str(item.get("name") or "").casefold() == str(stash.get("name") or "").casefold()),
        -1,
    )
    if existing_index >= 0:
        stashes[existing_index] = stash
        summary = "UPDATED"
        index = existing_index + 1
    else:
        stashes.append(stash)
        summary = "OK"
        index = len(stashes)
    store["stashes"] = stashes
    _save_stash_store(store)
    return {
        "summary": summary,
        "index": index,
        "stash": stash,
        "sourcePath": str(file_path),
    }


def _run_xd_stash_unpack(rest: str) -> dict[str, Any]:
    parts = _split_args(rest)
    if len(parts) != 1:
        return {"summary": "ERROR", "error": STASH_UNPACK_USAGE}
    file_path, error = _resolve_xd_export_reference(parts[0])
    if error:
        return {"summary": "ERROR", "error": error}
    try:
        content = file_path.read_text(encoding="utf-8")
    except Exception as exc:
        return {"summary": "ERROR", "error": f"Could not read Xenesis Desk stash pack: {str(exc) or exc.__class__.__name__}"}
    entries, skipped, error = _stash_pack_payload_from_markdown(content)
    if error:
        return {"summary": "ERROR", "error": error}

    now = time.time()
    store = _load_stash_store()
    stashes = _stashes(store)
    imported = 0
    updated = 0
    scheduled = 0
    items: list[dict[str, Any]] = []

    for entry in entries:
        stash = _normalize_stash_item(entry.get("stash") if isinstance(entry, dict) else {})
        if not stash:
            skipped += 1
            continue
        if not isinstance(stash.get("createdAt"), (int, float)) or stash.get("createdAt", 0) <= 0:
            stash["createdAt"] = now
        stash["updatedAt"] = now

        name = str(stash.get("name") or "").strip()
        existing_index = next(
            (index for index, item in enumerate(stashes) if str(item.get("name") or "").casefold() == name.casefold()),
            -1,
        )
        if existing_index >= 0:
            stashes[existing_index] = stash
            index = existing_index + 1
            updated += 1
            action = "updated"
        else:
            stashes.append(stash)
            index = len(stashes)
            imported += 1
            action = "imported"
        items.append({
            "index": index,
            "name": name,
            "action": action,
            "sourceIndex": entry.get("sourceIndex") if isinstance(entry, dict) else 0,
            "stash": stash,
        })
        store["stashes"] = stashes
        _save_stash_store(store)
        existing_schedule_keys = {
            (
                str(schedule.get("stashName") or "").strip().casefold(),
                str(schedule.get("scheduleInput") or "").strip(),
                str(schedule.get("deliver") or "local").strip(),
            )
            for schedule in (_load_stash_schedule_store().get("schedules") or [])
            if isinstance(schedule, dict)
        }
        for schedule in entry.get("schedules") if isinstance(entry.get("schedules"), list) else []:
            if not isinstance(schedule, dict):
                continue
            schedule_input = str(schedule.get("scheduleInput") or "").strip()
            deliver = str(schedule.get("deliver") or "local").strip() or "local"
            if not schedule_input:
                continue
            key = (name.casefold(), schedule_input, deliver)
            if key in existing_schedule_keys:
                continue
            schedule_result = _run_xd_stash_schedule(f"#{index} {schedule_input} deliver={deliver}")
            if schedule_result.get("summary") != "ERROR":
                scheduled += 1
                existing_schedule_keys.add(key)

    if not items:
        return {"summary": "ERROR", "error": "Xenesis Desk stash pack contains no valid stashes."}
    store["stashes"] = stashes
    _save_stash_store(store)
    return {
        "summary": "OK",
        "sourcePath": str(file_path),
        "imported": imported,
        "updated": updated,
        "skipped": skipped,
        "scheduled": scheduled,
        "items": items,
    }


def _parse_stash_apply_args(rest: str) -> tuple[str, str, str]:
    parts = _split_args(rest)
    if not parts:
        return "", "dry-run", STASH_APPLY_USAGE
    selector = parts[0]
    mode = "dry-run"
    for part in parts[1:]:
        lowered = str(part or "").strip().lower()
        if lowered in {"dry-run", "dryrun", "preview", "check"}:
            mode = "dry-run"
        elif lowered in {"apply", "--apply", "run"}:
            mode = "apply"
        else:
            return selector, mode, STASH_APPLY_USAGE
    return selector, mode, ""


def _parse_stash_apply_pack_args(rest: str) -> tuple[str, str, str]:
    parts = _split_args(rest)
    if not parts:
        return "", "dry-run", STASH_APPLY_PACK_USAGE
    selector = parts[0]
    mode = "dry-run"
    for part in parts[1:]:
        lowered = str(part or "").strip().lower()
        if lowered in {"dry-run", "dryrun", "preview", "check"}:
            mode = "dry-run"
        elif lowered in {"apply", "--apply", "run"}:
            mode = "apply"
        else:
            return selector, mode, STASH_APPLY_PACK_USAGE
    return selector, mode, ""


def _parse_stash_prune_args(rest: str) -> tuple[str, int, str]:
    mode = "dry-run"
    keep_exports = 5
    for raw_part in _split_args(rest):
        part = str(raw_part or "").strip()
        lowered = part.lower()
        if lowered in {"dry-run", "dryrun", "preview", "check"}:
            mode = "dry-run"
            continue
        if lowered in {"apply", "--apply", "run"}:
            mode = "apply"
            continue
        if lowered.startswith("keep="):
            keep_exports = _normalize_limit(lowered.split("=", 1)[1], default=5, maximum=50)
            continue
        if BARE_SELECTOR_RE.match(part):
            keep_exports = _normalize_limit(part, default=5, maximum=50)
            continue
        return "", keep_exports, STASH_PRUNE_USAGE
    return mode, keep_exports, ""


def _empty_restore_counts() -> dict[str, int]:
    return {"pins": 0, "quick": 0, "workflows": 0}


def _add_restore_counts(total: dict[str, int], counts: dict[str, int]) -> None:
    total["pins"] = int(total.get("pins", 0)) + int(counts.get("pins", 0))
    total["quick"] = int(total.get("quick", 0)) + int(counts.get("quick", 0))
    total["workflows"] = int(total.get("workflows", 0)) + int(counts.get("workflows", 0))


def _run_xd_stash_apply(rest: str) -> dict[str, Any]:
    selector, mode, error = _parse_stash_apply_args(rest)
    if error:
        return {"summary": "ERROR", "error": error}
    import_result = _run_xd_stash_import(selector)
    if import_result.get("summary") == "ERROR":
        return {"summary": "ERROR", "error": import_result.get("error") or STASH_APPLY_USAGE}
    stash = import_result.get("stash") if isinstance(import_result.get("stash"), dict) else {}
    plan = _stash_restore_plan(stash)
    added = {"pins": 0, "quick": 0, "workflows": 0}
    errors: list[str] = []
    if mode == "apply":
        added, errors = _apply_stash_restore(plan)
    return {
        "summary": "APPLIED" if mode == "apply" else "DRY_RUN",
        "mode": mode,
        "reference": selector,
        "importSummary": str(import_result.get("summary") or "OK").upper(),
        "index": import_result.get("index") or "?",
        "stash": stash,
        "sourcePath": import_result.get("sourcePath") or "",
        "plan": plan,
        "added": added,
        "errors": errors,
    }


def _run_xd_stash_apply_pack(rest: str) -> dict[str, Any]:
    selector, mode, error = _parse_stash_apply_pack_args(rest)
    if error:
        return {"summary": "ERROR", "error": error}
    unpack_result = _run_xd_stash_unpack(selector)
    if unpack_result.get("summary") == "ERROR":
        return {"summary": "ERROR", "error": unpack_result.get("error") or STASH_APPLY_PACK_USAGE}

    unpack_items = unpack_result.get("items") if isinstance(unpack_result.get("items"), list) else []
    total_add = _empty_restore_counts()
    total_skip = _empty_restore_counts()
    total_added = _empty_restore_counts()
    errors: list[str] = []
    items: list[dict[str, Any]] = []
    exports_count = 0
    workspace = _quick_actions_workspace_key()

    for item in unpack_items:
        if not isinstance(item, dict):
            continue
        stash = _normalize_stash_item(item.get("stash"))
        if not stash:
            continue
        plan = _stash_restore_plan(stash)
        workspace = str(plan.get("workspace") or workspace)
        add = plan.get("add") if isinstance(plan.get("add"), dict) else {}
        skip = plan.get("skip") if isinstance(plan.get("skip"), dict) else {}
        add_counts = _count_restore_bucket(add)
        skip_counts = _count_restore_bucket(skip)
        _add_restore_counts(total_add, add_counts)
        _add_restore_counts(total_skip, skip_counts)
        exports = plan.get("exports") if isinstance(plan.get("exports"), list) else []
        exports_count += len(exports)

        item_added = _empty_restore_counts()
        item_errors: list[str] = []
        if mode == "apply":
            item_added, item_errors = _apply_stash_restore(plan)
            _add_restore_counts(total_added, item_added)
            errors.extend(f"{stash.get('name') or 'stash'}: {error}" for error in item_errors if error)

        items.append({
            "index": item.get("index") or "?",
            "name": str(stash.get("name") or item.get("name") or "stash"),
            "plan": plan,
            "added": item_added,
            "errors": item_errors,
        })

    if not items:
        return {"summary": "ERROR", "error": "Xenesis Desk stash pack contains no valid stashes."}
    return {
        "summary": "APPLIED" if mode == "apply" else "DRY_RUN",
        "mode": mode,
        "reference": selector,
        "sourcePath": unpack_result.get("sourcePath") or "",
        "imported": unpack_result.get("imported", 0),
        "updated": unpack_result.get("updated", 0),
        "skipped": unpack_result.get("skipped", 0),
        "workspace": workspace,
        "willAdd": total_add,
        "alreadyPresent": total_skip,
        "exports": exports_count,
        "added": total_added,
        "errors": errors,
        "items": items,
    }


def _stash_sort_timestamp(stash: dict[str, Any], fallback: int) -> tuple[float, float, int]:
    updated = stash.get("updatedAt") if isinstance(stash.get("updatedAt"), (int, float)) else 0
    created = stash.get("createdAt") if isinstance(stash.get("createdAt"), (int, float)) else 0
    return float(updated), float(created), fallback


def _stash_duplicate_candidates(stashes: list[dict[str, Any]]) -> list[dict[str, Any]]:
    groups: dict[str, list[tuple[int, dict[str, Any]]]] = {}
    for index, stash in enumerate(stashes, start=1):
        if not isinstance(stash, dict):
            continue
        key = str(stash.get("name") or "").strip().casefold()
        if not key:
            continue
        groups.setdefault(key, []).append((index, stash))

    candidates: list[dict[str, Any]] = []
    for items in groups.values():
        if len(items) < 2:
            continue
        keep_index, _keep_stash = max(items, key=lambda pair: _stash_sort_timestamp(pair[1], pair[0]))
        for index, stash in items:
            if index == keep_index:
                continue
            name = str(stash.get("name") or f"stash #{index}")
            candidates.append({
                "kind": "stash",
                "index": index,
                "keepIndex": keep_index,
                "label": name,
                "path": str(_stash_store_path()),
                "detail": f"duplicate of #{keep_index}",
            })
    candidates.sort(key=lambda item: int(item.get("index") or 0))
    return candidates


def _stash_prune_export_files() -> list[Path]:
    export_dir = _xd_export_dir()
    if not export_dir.exists():
        return []
    files = [
        item
        for item in export_dir.glob("xd-*.md")
        if item.is_file() and _xd_export_kind_from_name(item) in {"stash", "stash-pack"}
    ]
    files.sort(key=lambda item: (item.stat().st_mtime, item.name), reverse=True)
    return files


def _stash_prune_export_candidates(keep_exports: int) -> list[dict[str, str]]:
    keep_count = _normalize_limit(keep_exports, default=5, maximum=50)
    files = _stash_prune_export_files()
    stale_files = files[keep_count:]
    return [
        {
            "kind": "export",
            "label": file_path.name,
            "path": str(file_path),
            "detail": f"old {_xd_export_kind_from_name(file_path)} export",
        }
        for file_path in stale_files
    ]


def _run_xd_stash_prune(mode: str = "dry-run", keep_exports: int = 5) -> dict[str, Any]:
    normalized_mode = "apply" if str(mode or "").lower() == "apply" else "dry-run"
    keep_count = _normalize_limit(keep_exports, default=5, maximum=50)
    store = _load_stash_store()
    stashes = _stashes(store)
    candidates = {
        "stashes": _stash_duplicate_candidates(stashes),
        "exports": _stash_prune_export_candidates(keep_count),
    }
    removed = {"stashes": 0, "exports": 0}
    errors: list[str] = []

    if normalized_mode == "apply":
        if candidates["stashes"]:
            drop_indices = {int(item.get("index") or 0) - 1 for item in candidates["stashes"]}
            drop_indices = {index for index in drop_indices if index >= 0}
            try:
                kept = [stash for index, stash in enumerate(stashes) if index not in drop_indices]
                store["stashes"] = kept
                _save_stash_store(store)
                removed["stashes"] = len(stashes) - len(kept)
            except Exception as exc:
                errors.append(f"stashes: {str(exc) or exc.__class__.__name__}")

        for item in candidates["exports"]:
            path_text = str(item.get("path") or "")
            try:
                Path(path_text).unlink(missing_ok=True)
                removed["exports"] += 1
            except Exception as exc:
                errors.append(f"export {path_text}: {str(exc) or exc.__class__.__name__}")

    total = sum(len(items) for items in candidates.values())
    return {
        "summary": "APPLIED" if normalized_mode == "apply" else "DRY_RUN",
        "mode": normalized_mode,
        "keepExports": keep_count,
        "candidates": candidates,
        "candidateCount": total,
        "removed": removed,
        "errors": errors,
    }


def _duplicate_group_count(values: list[str]) -> int:
    counts: dict[str, int] = {}
    for value in values:
        key = str(value or "").strip().casefold()
        if not key:
            continue
        counts[key] = counts.get(key, 0) + 1
    return sum(1 for count in counts.values() if count > 1)


def _stash_missing_pin_count(stash: dict[str, Any]) -> int:
    missing = 0
    pins = stash.get("pins") if isinstance(stash.get("pins"), list) else []
    for pin in pins:
        if not isinstance(pin, dict):
            continue
        path_text = str(pin.get("path") or "").strip()
        if path_text and not _cleanup_pin_path_exists(path_text):
            missing += 1
    return missing


def _stash_inspect_diagnostics(stash: dict[str, Any], *, index: int = 0) -> dict[str, int]:
    quick_actions = stash.get("quickActions") if isinstance(stash.get("quickActions"), list) else []
    workflows = stash.get("workflows") if isinstance(stash.get("workflows"), list) else []
    name = str(stash.get("name") or "").strip()
    name_duplicates = 0
    if index > 0 and name:
        for item_index, item in enumerate(_stashes(), start=1):
            if item_index == index or not isinstance(item, dict):
                continue
            if str(item.get("name") or "").strip().casefold() == name.casefold():
                name_duplicates += 1
    return {
        "missingPins": _stash_missing_pin_count(stash),
        "duplicateQuickNames": _duplicate_group_count([
            str(action.get("name") or "")
            for action in quick_actions
            if isinstance(action, dict)
        ]),
        "duplicateQuickCommands": _duplicate_group_count([
            _normalize_quick_command(str(action.get("command") or ""))
            for action in quick_actions
            if isinstance(action, dict)
        ]),
        "duplicateWorkflowNames": _duplicate_group_count([
            str(workflow.get("name") or "")
            for workflow in workflows
            if isinstance(workflow, dict)
        ]),
        "nameDuplicates": name_duplicates,
    }


def _stash_inspect_issue_count(diagnostics: dict[str, Any]) -> int:
    keys = [
        "missingPins",
        "duplicateQuickNames",
        "duplicateQuickCommands",
        "duplicateWorkflowNames",
        "nameDuplicates",
        "duplicateStashNames",
        "skippedEntries",
    ]
    return sum(int(diagnostics.get(key) or 0) for key in keys)


def _stash_inspect_find_local(reference: str) -> tuple[dict[str, Any], int, str]:
    text = _strip_wrapping_quotes(str(reference or "").strip())
    if not text:
        return {}, 0, STASH_INSPECT_USAGE
    index = _selector_index(text) or _selector_index(_selector_from_reply(text))
    stashes = _stashes()
    if index is not None:
        if index < 1 or index > len(stashes):
            return {}, 0, f"No Xenesis Desk stash for {text}. Run /xd stash to see stashes."
        return stashes[index - 1], index, ""
    for item_index, stash in enumerate(stashes, start=1):
        if str(stash.get("name") or "").casefold() == text.casefold():
            return stash, item_index, ""
    return {}, 0, ""


def _stash_pack_diagnostics(entries: list[dict[str, Any]], skipped: int) -> dict[str, int]:
    diagnostics = {
        "missingPins": 0,
        "duplicateQuickNames": 0,
        "duplicateQuickCommands": 0,
        "duplicateWorkflowNames": 0,
        "duplicateStashNames": _duplicate_group_count([
            str(
                (
                    entry.get("stash")
                    if isinstance(entry, dict) and isinstance(entry.get("stash"), dict)
                    else {}
                ).get("name") or ""
            )
            for entry in entries
            if isinstance(entry, dict)
        ]),
        "skippedEntries": skipped,
    }
    for entry in entries:
        stash = entry.get("stash") if isinstance(entry, dict) and isinstance(entry.get("stash"), dict) else {}
        item_diagnostics = _stash_inspect_diagnostics(stash)
        diagnostics["missingPins"] += item_diagnostics.get("missingPins", 0)
        diagnostics["duplicateQuickNames"] += item_diagnostics.get("duplicateQuickNames", 0)
        diagnostics["duplicateQuickCommands"] += item_diagnostics.get("duplicateQuickCommands", 0)
        diagnostics["duplicateWorkflowNames"] += item_diagnostics.get("duplicateWorkflowNames", 0)
    return diagnostics


def _run_xd_stash_inspect(rest: str) -> dict[str, Any]:
    parts = _split_args(rest)
    if len(parts) != 1:
        return {"summary": "ERROR", "error": STASH_INSPECT_USAGE}
    reference = parts[0]
    stash, index, error = _stash_inspect_find_local(reference)
    if error:
        return {"summary": "ERROR", "error": error}
    if stash:
        diagnostics = _stash_inspect_diagnostics(stash, index=index)
        return {
            "summary": "OK",
            "sourceType": "stash",
            "schema": "local-stash",
            "version": 1,
            "index": index,
            "stash": stash,
            "counts": _stash_counts(stash),
            "diagnostics": diagnostics,
            "issues": _stash_inspect_issue_count(diagnostics),
        }

    file_path, error = _resolve_xd_export_reference(reference)
    if error:
        return {"summary": "ERROR", "error": error}
    try:
        content = file_path.read_text(encoding="utf-8")
    except Exception as exc:
        return {"summary": "ERROR", "error": f"Could not read Xenesis Desk stash inspect target: {str(exc) or exc.__class__.__name__}"}

    export_stash, export_error = _stash_export_payload_from_markdown(content)
    if not export_error:
        diagnostics = _stash_inspect_diagnostics(export_stash)
        return {
            "summary": "OK",
            "sourceType": "stash-export",
            "schema": "xenesis-stash-export",
            "version": 1,
            "sourcePath": str(file_path),
            "stash": export_stash,
            "counts": _stash_counts(export_stash),
            "diagnostics": diagnostics,
            "issues": _stash_inspect_issue_count(diagnostics),
        }

    entries, skipped, pack_error = _stash_pack_payload_from_markdown(content)
    if not pack_error:
        diagnostics = _stash_pack_diagnostics(entries, skipped)
        counts = _stash_pack_counts(entries)
        return {
            "summary": "OK",
            "sourceType": "stash-pack",
            "schema": "xenesis-stash-pack",
            "version": 1,
            "sourcePath": str(file_path),
            "entries": entries,
            "counts": counts,
            "diagnostics": diagnostics,
            "issues": _stash_inspect_issue_count(diagnostics),
        }

    return {"summary": "ERROR", "error": "File is not a valid Xenesis Desk stash export or pack."}


def _upsert_quick_action(name: str, command: str) -> tuple[str, int]:
    store = _load_quick_actions_store()
    workspace = _quick_actions_workspace_key()
    actions = _quick_actions_for_workspace(store, workspace)
    normalized_command = _normalize_quick_command(command)
    existing_index = next(
        (index for index, action in enumerate(actions) if str(action.get("name") or "").casefold() == name.casefold()),
        -1,
    )
    if existing_index >= 0:
        actions[existing_index] = {"name": name, "command": normalized_command}
        action = "updated"
        index = existing_index + 1
    else:
        actions.append({"name": name, "command": normalized_command})
        action = "added"
        index = len(actions)
    store["workspaces"][workspace] = actions
    _save_quick_actions_store(store)
    return action, index


def _upsert_workflow(name: str, steps: list[str]) -> tuple[str, int]:
    store = _load_workflow_store()
    workspace = _quick_actions_workspace_key()
    workflows = _workflows_for_workspace(store, workspace)
    normalized_steps = [_normalize_quick_command(step) for step in steps]
    normalized_steps = [step for step in normalized_steps if step]
    existing_index = next(
        (index for index, workflow in enumerate(workflows) if str(workflow.get("name") or "").casefold() == name.casefold()),
        -1,
    )
    if existing_index >= 0:
        workflows[existing_index] = {"name": name, "steps": normalized_steps}
        action = "updated"
        index = existing_index + 1
    else:
        workflows.append({"name": name, "steps": normalized_steps})
        action = "added"
        index = len(workflows)
    store["workspaces"][workspace] = workflows
    _save_workflow_store(store)
    return action, index


def _run_xd_stash_promote(rest: str) -> dict[str, Any]:
    parts = _split_args(rest)
    if len(parts) != 1:
        return {"summary": "ERROR", "error": STASH_PROMOTE_USAGE}
    stash, index, error = _stash_from_selector(parts[0])
    if error:
        return {"summary": "ERROR", "error": error}
    name = str(stash.get("name") or f"stash #{index}").strip()
    preset_name = f"restore {name}".strip()
    quick_command = f"stash restore #{index} apply"
    workflow_steps = [
        f"stash inspect #{index}",
        f"stash diff #{index}",
        f"stash restore #{index} apply",
    ]
    quick_action, quick_index = _upsert_quick_action(preset_name, quick_command)
    workflow_action, workflow_index = _upsert_workflow(preset_name, workflow_steps)
    return {
        "summary": "OK",
        "stash": stash,
        "index": index,
        "workspace": _quick_actions_workspace_key(),
        "presetName": preset_name,
        "quickAction": quick_action,
        "quickIndex": quick_index,
        "quickCommand": quick_command,
        "workflowAction": workflow_action,
        "workflowIndex": workflow_index,
        "workflowSteps": workflow_steps,
    }


def _quote_xd_command_arg(value: str) -> str:
    text = str(value or "").strip()
    return '"' + text.replace("\\", "\\\\").replace('"', '\\"') + '"'


def _normalize_stash_schedule_text(value: str) -> str:
    text = str(value or "").strip()
    interval_match = re.match(r"^(every|interval)\s*=\s*(.+)$", text, flags=re.IGNORECASE)
    if interval_match:
        return f"every {interval_match.group(2).strip()}".strip()
    interval_prefix = re.match(r"^interval\s+(.+)$", text, flags=re.IGNORECASE)
    if interval_prefix:
        return f"every {interval_prefix.group(1).strip()}".strip()
    cron_match = re.match(r"^cron\s*=\s*(.+)$", text, flags=re.IGNORECASE)
    if cron_match:
        return cron_match.group(1).strip()
    return text


def _extract_stash_schedule_delivery(value: str) -> tuple[str, str, bool]:
    text = str(value or "").strip()
    match = re.search(r"\s+(?:deliver|delivery)=([^\s]+)\s*$", text, flags=re.IGNORECASE)
    if not match:
        return text, "local", False
    deliver = match.group(1).strip()
    schedule = text[:match.start()].strip()
    return schedule, deliver or "local", True


def _parse_stash_schedule_args(rest: str) -> tuple[str, str, str, bool, str]:
    text = str(rest or "").strip()
    if not text:
        return "", "", "local", False, STASH_SCHEDULE_USAGE
    parts = text.split(maxsplit=1)
    if len(parts) != 2 or not parts[1].strip():
        return parts[0].strip(), "", "local", False, STASH_SCHEDULE_USAGE
    raw_schedule, deliver, deliver_explicit = _extract_stash_schedule_delivery(parts[1])
    schedule = _normalize_stash_schedule_text(raw_schedule)
    if not schedule:
        return parts[0].strip(), "", deliver, deliver_explicit, STASH_SCHEDULE_USAGE
    return parts[0].strip(), schedule, deliver, deliver_explicit, ""


def _resolve_stash_schedule_template(schedule_text: str, deliver: str, deliver_explicit: bool) -> tuple[str, str, str]:
    text = str(schedule_text or "").strip()
    match = re.match(r"^template=(.+)$", text, flags=re.IGNORECASE)
    if not match:
        return text, _resolve_stash_delivery(deliver), ""
    template_name = _normalize_stash_ops_name(match.group(1))
    templates = _load_stash_ops_store().get("scheduleTemplates")
    template = templates.get(template_name) if isinstance(templates, dict) else None
    if not isinstance(template, dict):
        return text, deliver, f"Xenesis Desk stash schedule template not found: {match.group(1).strip()}"
    resolved_schedule = str(template.get("scheduleInput") or "").strip()
    if not resolved_schedule:
        return text, deliver, f"Xenesis Desk stash schedule template is invalid: {template_name}"
    resolved_deliver = deliver if deliver_explicit else str(template.get("deliver") or "local")
    return resolved_schedule, _resolve_stash_delivery(resolved_deliver), ""


def _write_stash_schedule_script(schedule_id: str, workspace: str, command: str) -> tuple[str, Path]:
    script_name = f"xd_stash_schedule_{schedule_id}.py"
    scripts_dir = _current_hermes_home_path() / "scripts"
    scripts_dir.mkdir(parents=True, exist_ok=True)
    script_path = scripts_dir / script_name
    body = "\n".join([
        "# Generated by the Xenesis Desk Hermes plugin.",
        "from __future__ import annotations",
        "",
        "import os",
        "",
        "from plugins import xenesis_desk_gateway as plugin",
        "",
        f"os.environ[\"TERMINAL_CWD\"] = {json.dumps(workspace, ensure_ascii=False)}",
        f"print(plugin.handle_xd_command({command!r}))",
        "",
    ])
    script_path.write_text(body, encoding="utf-8")
    try:
        os.chmod(script_path, 0o700)
    except (OSError, NotImplementedError):
        pass
    return script_name, script_path


def _cron_job_map_for_current_home() -> dict[str, dict[str, Any]]:
    try:
        cron_jobs = _cron_jobs_for_current_home()
        jobs = cron_jobs.list_jobs(include_disabled=True)
    except Exception:
        return {}
    return {
        str(job.get("id") or ""): job
        for job in jobs
        if isinstance(job, dict) and str(job.get("id") or "")
    }


def _schedule_fields_from_job(job: dict[str, Any]) -> dict[str, Any]:
    return {
        "scheduleDisplay": str(job.get("schedule_display") or ""),
        "nextRunAt": str(job.get("next_run_at") or ""),
        "lastRunAt": str(job.get("last_run_at") or ""),
        "lastStatus": str(job.get("last_status") or ""),
        "lastError": str(job.get("last_error") or ""),
        "state": str(job.get("state") or ("scheduled" if job.get("enabled", True) else "disabled")),
        "enabled": bool(job.get("enabled", True)),
        "deliver": str(job.get("deliver") or "local"),
    }


def _enrich_stash_schedule(schedule: dict[str, Any], job_map: dict[str, dict[str, Any]] | None = None) -> dict[str, Any]:
    enriched = dict(schedule)
    jobs = job_map if isinstance(job_map, dict) else _cron_job_map_for_current_home()
    cron_id = str(enriched.get("cronJobId") or "").strip()
    job = jobs.get(cron_id)
    issues: list[str] = []
    if job:
        for key, value in _schedule_fields_from_job(job).items():
            if value or key in {"enabled"}:
                enriched[key] = value
        enriched["cronJob"] = job
    else:
        enriched["state"] = "missing"
        enriched["enabled"] = False
        issues.append("cron job missing")

    script = str(enriched.get("script") or "").strip()
    script_path = _stash_schedule_script_path(script)
    if script_path is None:
        issues.append("script path unsafe")
    elif not script_path.exists():
        issues.append("script missing")
    else:
        enriched["scriptPath"] = str(script_path)
    enriched["issues"] = issues
    enriched.setdefault("deliver", "local")
    return enriched


def _save_stash_schedule_updates(updates: dict[str, dict[str, Any]]) -> None:
    if not updates:
        return
    store = _load_stash_schedule_store()
    schedules = store.get("schedules") if isinstance(store.get("schedules"), list) else []
    now = time.time()
    for schedule in schedules:
        if not isinstance(schedule, dict):
            continue
        schedule_id = str(schedule.get("id") or "")
        update = updates.get(schedule_id)
        if not update:
            continue
        schedule.update(update)
        schedule["updatedAt"] = now
    store["schedules"] = schedules
    _save_stash_schedule_store(store)


def _run_xd_stash_schedule(rest: str) -> dict[str, Any]:
    selector, schedule_text, deliver, deliver_explicit, error = _parse_stash_schedule_args(rest)
    if error:
        return {"summary": "ERROR", "error": error}
    schedule_text, deliver, template_error = _resolve_stash_schedule_template(schedule_text, deliver, deliver_explicit)
    if template_error:
        return {"summary": "ERROR", "error": template_error}
    stash, index, error = _stash_from_selector(selector)
    if error:
        return {"summary": "ERROR", "error": error}

    try:
        cron_jobs = _cron_jobs_for_current_home()
        cron_jobs.parse_schedule(schedule_text)
    except Exception as exc:
        return {"summary": "ERROR", "error": f"Invalid Xenesis Desk stash schedule: {exc}"}

    schedule_id = uuid.uuid4().hex[:12]
    name = str(stash.get("name") or f"stash #{index}").strip()
    workspace = _quick_actions_workspace_key()
    command = f"stash restore {_quote_xd_command_arg(name)} apply"
    script_name, script_path = _write_stash_schedule_script(schedule_id, workspace, command)
    try:
        job = cron_jobs.create_job(
            prompt=f"Xenesis Desk stash restore: {name}",
            schedule=schedule_text,
            name=f"Xenesis Desk stash: {name}",
            deliver=deliver,
            origin={"platform": "xenesis_desk_gateway", "command": "stash schedule"},
            script=script_name,
            no_agent=True,
        )
    except Exception as exc:
        try:
            script_path.unlink()
        except OSError:
            pass
        return {"summary": "ERROR", "error": f"Invalid Xenesis Desk stash schedule: {exc}"}

    now = time.time()
    entry = {
        "id": schedule_id,
        "stashName": name,
        "stashIndex": index,
        "workspace": workspace,
        "scheduleInput": schedule_text,
        "scheduleDisplay": str(job.get("schedule_display") or schedule_text),
        "cronJobId": str(job.get("id") or ""),
        "script": script_name,
        "command": command,
        "deliver": str(job.get("deliver") or deliver or "local"),
        "createdAt": now,
        "updatedAt": now,
        "nextRunAt": str(job.get("next_run_at") or ""),
        "lastRunAt": "",
        "lastStatus": "",
        "lastError": "",
        "state": str(job.get("state") or "scheduled"),
        "enabled": bool(job.get("enabled", True)),
    }
    store = _load_stash_schedule_store()
    schedules = store.get("schedules") if isinstance(store.get("schedules"), list) else []
    schedules.append(entry)
    store["schedules"] = schedules
    _save_stash_schedule_store(store)
    return {
        "summary": "OK",
        "stash": stash,
        "index": index,
        "workspace": workspace,
        "schedule": entry,
        "job": job,
    }


def _run_xd_stash_schedules() -> dict[str, Any]:
    store = _load_stash_schedule_store()
    schedules = store.get("schedules") if isinstance(store.get("schedules"), list) else []
    job_map = _cron_job_map_for_current_home()
    enriched = [_enrich_stash_schedule(schedule, job_map) for schedule in schedules if isinstance(schedule, dict)]
    return {
        "summary": "OK",
        "schedules": enriched,
        "path": str(_stash_schedule_store_path()),
    }


def _parse_stash_unschedule_args(rest: str) -> tuple[str, str, str]:
    parts = _split_args(rest)
    if not parts:
        return "", "dry-run", STASH_UNSCHEDULE_USAGE
    selector = parts[0]
    mode = "dry-run"
    if len(parts) > 2:
        return selector, mode, STASH_UNSCHEDULE_USAGE
    if len(parts) == 2:
        lowered = str(parts[1] or "").strip().lower()
        if lowered in {"dry-run", "dryrun", "preview", "check"}:
            mode = "dry-run"
        elif lowered in {"apply", "--apply", "run"}:
            mode = "apply"
        else:
            return selector, mode, STASH_UNSCHEDULE_USAGE
    return selector, mode, ""


def _stash_schedule_candidates(selector: str) -> list[dict[str, Any]]:
    target = _strip_wrapping_quotes(selector).strip()
    if not target:
        return []
    store = _load_stash_schedule_store()
    schedules = store.get("schedules") if isinstance(store.get("schedules"), list) else []
    selected: list[dict[str, Any]] = []

    for index, schedule in enumerate(schedules, start=1):
        if not isinstance(schedule, dict):
            continue
        if str(schedule.get("cronJobId") or "") == target or str(schedule.get("id") or "") == target:
            return [{"index": index, "schedule": schedule}]

    schedule_index = _selector_index(target)
    if schedule_index is None:
        bare_match = BARE_SELECTOR_RE.match(target)
        if bare_match:
            schedule_index = int(bare_match.group(1))
    if schedule_index is not None:
        if 1 <= schedule_index <= len(schedules):
            return [{"index": schedule_index, "schedule": schedules[schedule_index - 1]}]
        return []

    target_folded = target.casefold()
    for index, schedule in enumerate(schedules, start=1):
        if not isinstance(schedule, dict):
            continue
        if str(schedule.get("stashName") or "").casefold() == target_folded:
            selected.append({"index": index, "schedule": schedule})
    return selected


def _stash_schedule_script_path(script_name: str) -> Path | None:
    text = str(script_name or "").strip()
    if not text or "/" in text or "\\" in text:
        return None
    if not text.startswith("xd_stash_schedule_") or not text.endswith(".py"):
        return None
    raw = Path(text)
    if raw.is_absolute() or raw.drive:
        return None
    scripts_dir = (_current_hermes_home_path() / "scripts").resolve()
    path = (scripts_dir / text).resolve()
    try:
        path.relative_to(scripts_dir)
    except ValueError:
        return None
    return path


def _stash_unschedule_counts(candidates: list[dict[str, Any]]) -> dict[str, int]:
    cron_ids: set[str] = set()
    scripts: set[str] = set()
    for candidate in candidates:
        schedule = candidate.get("schedule") if isinstance(candidate, dict) else {}
        if not isinstance(schedule, dict):
            continue
        cron_id = str(schedule.get("cronJobId") or "").strip()
        if cron_id:
            cron_ids.add(cron_id)
        script = str(schedule.get("script") or "").strip()
        if script and _stash_schedule_script_path(script) is not None:
            scripts.add(script)
    return {
        "schedules": len(candidates),
        "cronJobs": len(cron_ids),
        "scripts": len(scripts),
    }


def _run_xd_stash_unschedule(rest: str) -> dict[str, Any]:
    selector, mode, error = _parse_stash_unschedule_args(rest)
    if error:
        return {"summary": "ERROR", "error": error}
    candidates = _stash_schedule_candidates(selector)
    if not candidates:
        return {
            "summary": "ERROR",
            "error": f"No Xenesis Desk stash schedule for {selector}. Run /xd stash schedules to see schedules.",
        }
    planned = _stash_unschedule_counts(candidates)
    if mode != "apply":
        return {
            "summary": "DRY-RUN",
            "mode": mode,
            "selector": selector,
            "candidates": candidates,
            "candidateCount": len(candidates),
            "planned": planned,
            "errors": [],
        }

    candidate_ids = {
        str(candidate.get("schedule", {}).get("id") or "")
        for candidate in candidates
        if isinstance(candidate.get("schedule"), dict)
    }
    cron_ids = {
        str(candidate.get("schedule", {}).get("cronJobId") or "").strip()
        for candidate in candidates
        if isinstance(candidate.get("schedule"), dict) and str(candidate.get("schedule", {}).get("cronJobId") or "").strip()
    }
    scripts = {
        str(candidate.get("schedule", {}).get("script") or "").strip()
        for candidate in candidates
        if isinstance(candidate.get("schedule"), dict) and str(candidate.get("schedule", {}).get("script") or "").strip()
    }

    errors: list[str] = []
    removed = {"schedules": 0, "cronJobs": 0, "scripts": 0}
    cron_jobs = _cron_jobs_for_current_home()
    for cron_id in sorted(cron_ids):
        try:
            if cron_jobs.remove_job(cron_id):
                removed["cronJobs"] += 1
        except Exception as exc:
            errors.append(f"cron job {cron_id}: {exc}")

    for script in sorted(scripts):
        path = _stash_schedule_script_path(script)
        if path is None:
            errors.append(f"script {script}: unsafe script path")
            continue
        try:
            if path.exists():
                path.unlink()
                removed["scripts"] += 1
        except OSError as exc:
            errors.append(f"script {script}: {exc}")

    store = _load_stash_schedule_store()
    schedules = store.get("schedules") if isinstance(store.get("schedules"), list) else []
    kept = [
        schedule
        for schedule in schedules
        if not (isinstance(schedule, dict) and str(schedule.get("id") or "") in candidate_ids)
    ]
    removed["schedules"] = len(schedules) - len(kept)
    store["schedules"] = kept
    _save_stash_schedule_store(store)

    return {
        "summary": "APPLIED",
        "mode": mode,
        "selector": selector,
        "candidates": candidates,
        "candidateCount": len(candidates),
        "planned": planned,
        "removed": removed,
        "errors": errors,
    }


def _run_xd_stash_cron_action(action: str, rest: str) -> dict[str, Any]:
    parts = _split_args(rest)
    if len(parts) != 1:
        return {"summary": "ERROR", "error": STASH_CRON_ACTION_USAGE}
    selector = parts[0]
    candidates = _stash_schedule_candidates(selector)
    if not candidates:
        return {
            "summary": "ERROR",
            "error": f"No Xenesis Desk stash schedule for {selector}. Run /xd stash schedules to see schedules.",
        }

    cron_jobs = _cron_jobs_for_current_home()
    updated: dict[str, dict[str, Any]] = {}
    items: list[dict[str, Any]] = []
    errors: list[str] = []
    for candidate in candidates:
        schedule = candidate.get("schedule") if isinstance(candidate, dict) else {}
        if not isinstance(schedule, dict):
            continue
        cron_id = str(schedule.get("cronJobId") or "").strip()
        if not cron_id:
            errors.append(f"{schedule.get('stashName') or 'stash'}: missing cron job id")
            continue
        try:
            if action == "pause":
                job = cron_jobs.pause_job(cron_id, reason="Xenesis Desk stash pause")
            elif action == "resume":
                job = cron_jobs.resume_job(cron_id)
            else:
                job = cron_jobs.trigger_job(cron_id)
        except Exception as exc:
            job = None
            errors.append(f"{cron_id}: {exc}")
        if not job:
            errors.append(f"{cron_id}: cron job not found")
            continue
        schedule_id = str(schedule.get("id") or "")
        fields = _schedule_fields_from_job(job)
        if schedule_id:
            updated[schedule_id] = fields
        items.append({"index": candidate.get("index"), "schedule": {**schedule, **fields}, "job": job})

    _save_stash_schedule_updates(updated)
    summaries = {"pause": "PAUSED", "resume": "RESUMED", "trigger": "TRIGGERED"}
    return {
        "summary": summaries.get(action, action.upper()),
        "action": action,
        "selector": selector,
        "items": items,
        "updated": len(items),
        "errors": errors,
    }


def _parse_stash_repair_args(rest: str) -> tuple[str, str]:
    parts = _split_args(rest)
    if not parts:
        return "dry-run", ""
    if len(parts) != 1:
        return "dry-run", STASH_REPAIR_USAGE
    lowered = str(parts[0] or "").strip().lower()
    if lowered in {"dry-run", "dryrun", "preview", "check"}:
        return "dry-run", ""
    if lowered in {"apply", "--apply", "run"}:
        return "apply", ""
    return "dry-run", STASH_REPAIR_USAGE


def _stash_schedule_repair_plan() -> dict[str, Any]:
    store = _load_stash_schedule_store()
    schedules = store.get("schedules") if isinstance(store.get("schedules"), list) else []
    job_map = _cron_job_map_for_current_home()
    tracked_cron_ids = {
        str(schedule.get("cronJobId") or "")
        for schedule in schedules
        if isinstance(schedule, dict) and str(schedule.get("cronJobId") or "")
    }
    missing_cron: list[dict[str, Any]] = []
    missing_scripts: list[dict[str, Any]] = []
    for index, schedule in enumerate(schedules, start=1):
        if not isinstance(schedule, dict):
            continue
        cron_id = str(schedule.get("cronJobId") or "").strip()
        if not cron_id or cron_id not in job_map:
            missing_cron.append({"index": index, "schedule": schedule})
        script_path = _stash_schedule_script_path(str(schedule.get("script") or ""))
        if script_path is None or not script_path.exists():
            missing_scripts.append({"index": index, "schedule": schedule})

    orphan_jobs = []
    for job in job_map.values():
        script = str(job.get("script") or "")
        origin = job.get("origin") if isinstance(job.get("origin"), dict) else {}
        plugin_owned = (
            str(job.get("id") or "") not in tracked_cron_ids
            and (
                script.startswith("xd_stash_schedule_")
                or str(job.get("name") or "").startswith("Xenesis Desk stash:")
                or origin.get("command") == "stash schedule"
            )
        )
        if plugin_owned:
            orphan_jobs.append(job)

    return {
        "schedules": schedules,
        "missingCronJobs": missing_cron,
        "missingScripts": missing_scripts,
        "orphanCronJobs": orphan_jobs,
    }


def _run_xd_stash_repair(rest: str) -> dict[str, Any]:
    mode, error = _parse_stash_repair_args(rest)
    if error:
        return {"summary": "ERROR", "error": error}
    plan = _stash_schedule_repair_plan()
    if mode != "apply":
        return {"summary": "DRY-RUN", "mode": mode, "plan": plan, "recreated": {}, "removed": {}, "errors": []}

    missing_script_ids = {
        str(item.get("schedule", {}).get("id") or "")
        for item in plan.get("missingScripts", [])
        if isinstance(item.get("schedule"), dict)
    }
    missing_cron_ids = {
        str(item.get("schedule", {}).get("id") or "")
        for item in plan.get("missingCronJobs", [])
        if isinstance(item.get("schedule"), dict)
    }
    store = _load_stash_schedule_store()
    schedules = store.get("schedules") if isinstance(store.get("schedules"), list) else []
    cron_jobs = _cron_jobs_for_current_home()
    recreated = {"cronJobs": 0, "scripts": 0}
    removed = {"orphanCronJobs": 0}
    errors: list[str] = []
    now = time.time()

    for schedule in schedules:
        if not isinstance(schedule, dict):
            continue
        schedule_id = str(schedule.get("id") or "")
        if schedule_id in missing_script_ids:
            try:
                script_name, _script_path = _write_stash_schedule_script(
                    schedule_id,
                    str(schedule.get("workspace") or _quick_actions_workspace_key()),
                    str(schedule.get("command") or ""),
                )
                schedule["script"] = script_name
                recreated["scripts"] += 1
            except Exception as exc:
                errors.append(f"{schedule.get('stashName') or schedule_id}: script repair failed: {exc}")
        if schedule_id in missing_cron_ids:
            schedule_text = str(schedule.get("scheduleInput") or "").strip()
            if not schedule_text:
                errors.append(f"{schedule.get('stashName') or schedule_id}: missing schedule input")
                continue
            script = str(schedule.get("script") or "").strip()
            try:
                job = cron_jobs.create_job(
                    prompt=f"Xenesis Desk stash restore: {schedule.get('stashName') or 'stash'}",
                    schedule=schedule_text,
                    name=f"Xenesis Desk stash: {schedule.get('stashName') or 'stash'}",
                    deliver=str(schedule.get("deliver") or "local"),
                    origin={"platform": "xenesis_desk_gateway", "command": "stash schedule"},
                    script=script,
                    no_agent=True,
                )
            except Exception as exc:
                errors.append(f"{schedule.get('stashName') or schedule_id}: cron repair failed: {exc}")
                continue
            schedule["cronJobId"] = str(job.get("id") or "")
            schedule.update(_schedule_fields_from_job(job))
            recreated["cronJobs"] += 1
        if schedule_id in missing_script_ids or schedule_id in missing_cron_ids:
            schedule["updatedAt"] = now

    for job in plan.get("orphanCronJobs", []):
        if not isinstance(job, dict):
            continue
        cron_id = str(job.get("id") or "")
        if not cron_id:
            continue
        try:
            if cron_jobs.remove_job(cron_id):
                removed["orphanCronJobs"] += 1
        except Exception as exc:
            errors.append(f"orphan cron job {cron_id}: {exc}")

    store["schedules"] = schedules
    _save_stash_schedule_store(store)
    repaired_plan = _stash_schedule_repair_plan()
    return {
        "summary": "APPLIED",
        "mode": mode,
        "plan": plan,
        "postPlan": repaired_plan,
        "recreated": recreated,
        "removed": removed,
        "errors": errors,
    }


def _parse_stash_runs_args(rest: str) -> tuple[str, int, str]:
    parts = _split_args(rest)
    if not parts:
        return "", 5, STASH_RUNS_USAGE
    selector = parts[0]
    limit = 5
    for part in parts[1:]:
        text = str(part or "").strip()
        match = re.match(r"^(?:limit|n)=([0-9]+)$", text, flags=re.IGNORECASE)
        if not match:
            return selector, limit, STASH_RUNS_USAGE
        limit = min(max(int(match.group(1)), 1), 20)
    return selector, limit, ""


def _stash_cron_output_dir(job_id: str) -> Path | None:
    text = str(job_id or "").strip()
    if not text or text in {".", ".."} or "/" in text or "\\" in text:
        return None
    raw = Path(text)
    if raw.is_absolute() or raw.drive:
        return None
    output_root = (_current_hermes_home_path() / "cron" / "output").resolve()
    path = (output_root / text).resolve()
    try:
        path.relative_to(output_root)
    except ValueError:
        return None
    return path


def _cron_output_summary(path: Path) -> dict[str, str]:
    try:
        content = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        content = ""
    status = ""
    match = re.search(r"^\*\*Status:\*\*\s*(.+?)\s*$", content, flags=re.MULTILINE)
    if match:
        status = match.group(1).strip()
    preview_lines = [
        line.strip()
        for line in content.splitlines()
        if line.strip() and not line.startswith("#") and not line.startswith("**")
    ]
    preview = " ".join(preview_lines)[:240]
    return {"file": path.name, "path": str(path), "status": status, "preview": preview}


def _run_xd_stash_runs(rest: str) -> dict[str, Any]:
    selector, limit, error = _parse_stash_runs_args(rest)
    if error:
        return {"summary": "ERROR", "error": error}
    candidates = _stash_schedule_candidates(selector)
    if not candidates:
        return {
            "summary": "ERROR",
            "error": f"No Xenesis Desk stash schedule for {selector}. Run /xd stash schedules to see schedules.",
        }
    items: list[dict[str, Any]] = []
    for candidate in candidates:
        schedule = candidate.get("schedule") if isinstance(candidate, dict) else {}
        if not isinstance(schedule, dict):
            continue
        cron_id = str(schedule.get("cronJobId") or "").strip()
        output_dir = _stash_cron_output_dir(cron_id)
        files = []
        if output_dir is not None and output_dir.exists():
            files = sorted(output_dir.glob("*.md"), key=lambda item: item.stat().st_mtime, reverse=True)
        runs = [_cron_output_summary(path) for path in files[:limit]]
        items.append({
            "index": candidate.get("index"),
            "schedule": schedule,
            "total": len(files),
            "runs": runs,
        })
    return {"summary": "OK", "selector": selector, "limit": limit, "items": items}


def _stash_health_item(schedule: dict[str, Any], index: int) -> dict[str, Any]:
    issues = schedule.get("issues") if isinstance(schedule.get("issues"), list) else []
    last_status = str(schedule.get("lastStatus") or "").strip().lower()
    severity = "ok"
    reasons: list[str] = []
    if issues:
        severity = "error"
        reasons.extend(str(issue) for issue in issues if issue)
    elif last_status in {"error", "failed", "fail", "timeout", "cancelled"} or str(schedule.get("lastError") or "").strip():
        severity = "warn"
        reasons.append(str(schedule.get("lastError") or schedule.get("lastStatus") or "last run failed").strip())
    return {
        "index": index,
        "severity": severity,
        "reasons": reasons,
        "schedule": schedule,
    }


def _run_xd_stash_health_summary(kind: str = "health") -> dict[str, Any]:
    schedules_result = _run_xd_stash_schedules()
    schedules = schedules_result.get("schedules") if isinstance(schedules_result.get("schedules"), list) else []
    items = [
        _stash_health_item(schedule, index)
        for index, schedule in enumerate(schedules, start=1)
        if isinstance(schedule, dict)
    ]
    counts = {
        "total": len(items),
        "ok": sum(1 for item in items if item.get("severity") == "ok"),
        "warn": sum(1 for item in items if item.get("severity") == "warn"),
        "error": sum(1 for item in items if item.get("severity") == "error"),
    }
    missing_cron = sum(
        1
        for item in items
        if "cron job missing" in (item.get("reasons") if isinstance(item.get("reasons"), list) else [])
    )
    missing_scripts = sum(
        1
        for item in items
        if "script missing" in (item.get("reasons") if isinstance(item.get("reasons"), list) else [])
    )
    last_failed = sum(
        1
        for item in items
        if str((item.get("schedule") if isinstance(item.get("schedule"), dict) else {}).get("lastStatus") or "").strip().lower()
        in {"error", "failed", "fail", "timeout", "cancelled"}
        or str((item.get("schedule") if isinstance(item.get("schedule"), dict) else {}).get("lastError") or "").strip()
    )
    summary = "ERROR" if counts["error"] else "WARN" if counts["warn"] else "OK"
    return {
        "summary": summary,
        "kind": kind,
        "counts": counts,
        "missingCronJobs": missing_cron,
        "missingScripts": missing_scripts,
        "lastFailed": last_failed,
        "repairNeeded": bool(missing_cron or missing_scripts),
        "items": items,
        "path": schedules_result.get("path") or str(_stash_schedule_store_path()),
    }


def _write_stash_health_digest_script(digest_id: str) -> tuple[str, Path]:
    script_name = f"xd_stash_health_digest_{digest_id}.py"
    scripts_dir = _current_hermes_home_path() / "scripts"
    scripts_dir.mkdir(parents=True, exist_ok=True)
    script_path = scripts_dir / script_name
    body = "\n".join([
        "# Generated by the Xenesis Desk Hermes plugin.",
        "from __future__ import annotations",
        "",
        "from plugins import xenesis_desk_gateway as plugin",
        "",
        "print(plugin.handle_xd_command('stash health digest'))",
        "",
    ])
    script_path.write_text(body, encoding="utf-8")
    try:
        os.chmod(script_path, 0o700)
    except (OSError, NotImplementedError):
        pass
    return script_name, script_path


def _run_xd_stash_health_schedule(rest: str) -> dict[str, Any]:
    raw_schedule, deliver, _deliver_explicit = _extract_stash_schedule_delivery(rest)
    schedule_text = _normalize_stash_schedule_text(raw_schedule)
    if not schedule_text:
        return {"summary": "ERROR", "error": STASH_HEALTH_USAGE}
    deliver = _resolve_stash_delivery(deliver)
    try:
        cron_jobs = _cron_jobs_for_current_home()
        cron_jobs.parse_schedule(schedule_text)
    except Exception as exc:
        return {"summary": "ERROR", "error": f"Invalid Xenesis Desk stash health schedule: {exc}"}

    digest_id = uuid.uuid4().hex[:12]
    script_name, script_path = _write_stash_health_digest_script(digest_id)
    try:
        job = cron_jobs.create_job(
            prompt="Xenesis Desk stash health digest",
            schedule=schedule_text,
            name="Xenesis Desk stash health digest",
            deliver=deliver,
            origin={"platform": "xenesis_desk_gateway", "command": "stash health schedule"},
            script=script_name,
            no_agent=True,
        )
    except Exception as exc:
        try:
            script_path.unlink()
        except OSError:
            pass
        return {"summary": "ERROR", "error": f"Invalid Xenesis Desk stash health schedule: {exc}"}

    entry = {
        "id": digest_id,
        "cronJobId": str(job.get("id") or ""),
        "scheduleInput": schedule_text,
        "scheduleDisplay": str(job.get("schedule_display") or schedule_text),
        "script": script_name,
        "command": "stash health digest",
        "deliver": str(job.get("deliver") or deliver or "local"),
        "createdAt": time.time(),
    }
    store = _load_stash_ops_store()
    digests = store.get("healthDigests") if isinstance(store.get("healthDigests"), list) else []
    digests.append(entry)
    store["healthDigests"] = digests
    _save_stash_ops_store(store)
    return {"summary": "OK", "digest": entry, "job": job}


def _run_xd_stash_health(rest: str = "") -> dict[str, Any]:
    subcommand, sub_rest = _first_word_and_rest(rest)
    if not subcommand:
        return _run_xd_stash_health_summary("health")
    if subcommand == "digest":
        return _run_xd_stash_health_summary("digest")
    if subcommand == "schedule":
        return _run_xd_stash_health_schedule(sub_rest)
    return {"summary": "ERROR", "error": STASH_HEALTH_USAGE}


def _format_xd_stash_health(result: dict[str, Any]) -> str:
    if result.get("summary") == "ERROR" and result.get("error"):
        return str(result.get("error") or STASH_HEALTH_USAGE)
    if isinstance(result.get("digest"), dict):
        digest = result["digest"]
        lines = [
            f"Xenesis Desk stash health digest schedule: {str(result.get('summary') or 'UNKNOWN').upper()}",
            f"Schedule: {digest.get('scheduleDisplay') or digest.get('scheduleInput') or ''}",
            f"Cron job: {digest.get('cronJobId') or ''}",
            f"Delivery: {digest.get('deliver') or 'local'}",
            f"Command: /xd {digest.get('command') or ''}",
            f"Script: {digest.get('script') or ''}",
        ]
        return "\n".join(lines)

    counts = result.get("counts") if isinstance(result.get("counts"), dict) else {}
    summary = str(result.get("summary") or "UNKNOWN").upper()
    lines = [
        f"Xenesis Desk stash health: {summary}",
        (
            "Schedules: "
            f"total={counts.get('total', 0)} "
            f"ok={counts.get('ok', 0)} "
            f"warn={counts.get('warn', 0)} "
            f"error={counts.get('error', 0)}"
        ),
        f"Missing cron jobs: {result.get('missingCronJobs', 0)}",
        f"Missing scripts: {result.get('missingScripts', 0)}",
        f"Last failed: {result.get('lastFailed', 0)}",
        f"Repair needed: {'yes' if result.get('repairNeeded') else 'no'}",
        f"Path: {result.get('path') or _stash_schedule_store_path()}",
    ]
    items = result.get("items") if isinstance(result.get("items"), list) else []
    for item in items[:8]:
        if not isinstance(item, dict):
            continue
        schedule = item.get("schedule") if isinstance(item.get("schedule"), dict) else {}
        severity = str(item.get("severity") or "ok").upper()
        name = str(schedule.get("stashName") or "stash")
        lines.append(f"- {severity}: {name} #{schedule.get('stashIndex') or '?'}")
        for reason in item.get("reasons") if isinstance(item.get("reasons"), list) else []:
            if reason:
                lines.append(f"  {reason}")
    if result.get("repairNeeded"):
        lines.append("Repair: /xd stash repair apply")
    lines.append("Digest: /xd stash health schedule every=1d deliver=local")
    return "\n".join(lines)


def _run_xd_stash_preset(rest: str) -> dict[str, Any]:
    subcommand, sub_rest = _first_word_and_rest(rest)
    store = _load_stash_ops_store()
    presets = store.get("deliveryPresets") if isinstance(store.get("deliveryPresets"), dict) else {}
    if not subcommand or subcommand in {"list", "ls"}:
        return {"summary": "OK", "presets": presets}
    if subcommand == "add":
        parts = _split_args(sub_rest)
        if len(parts) != 2:
            return {"summary": "ERROR", "error": STASH_PRESET_USAGE}
        name = _normalize_stash_ops_name(parts[0])
        deliver = str(parts[1] or "").strip()
        if not name or not deliver:
            return {"summary": "ERROR", "error": STASH_PRESET_USAGE}
        presets[name] = {"deliver": deliver, "updatedAt": time.time()}
        store["deliveryPresets"] = presets
        _save_stash_ops_store(store)
        return {"summary": "OK", "action": "added", "name": name, "deliver": deliver, "presets": presets}
    if subcommand in {"remove", "rm", "delete"}:
        parts = _split_args(sub_rest)
        if len(parts) != 1:
            return {"summary": "ERROR", "error": STASH_PRESET_USAGE}
        name = _normalize_stash_ops_name(parts[0])
        removed = presets.pop(name, None) is not None
        store["deliveryPresets"] = presets
        _save_stash_ops_store(store)
        return {"summary": "OK" if removed else "MISSING", "action": "removed", "name": name, "presets": presets}
    return {"summary": "ERROR", "error": STASH_PRESET_USAGE}


def _format_xd_stash_preset(result: dict[str, Any]) -> str:
    if result.get("summary") == "ERROR":
        return str(result.get("error") or STASH_PRESET_USAGE)
    lines = [f"Xenesis Desk stash delivery preset: {str(result.get('summary') or 'OK').upper()}"]
    if result.get("name"):
        lines.append(f"Preset: {result.get('name')} -> {result.get('deliver') or ''}".rstrip())
    presets = result.get("presets") if isinstance(result.get("presets"), dict) else {}
    if not presets:
        lines.append("No delivery presets.")
    else:
        lines.append("Presets:")
        for name in sorted(presets):
            preset = presets.get(name) if isinstance(presets.get(name), dict) else {}
            lines.append(f"- {name} -> {preset.get('deliver') or ''}")
    return "\n".join(lines)


def _run_xd_stash_template(rest: str) -> dict[str, Any]:
    subcommand, sub_rest = _first_word_and_rest(rest)
    store = _load_stash_ops_store()
    templates = store.get("scheduleTemplates") if isinstance(store.get("scheduleTemplates"), dict) else {}
    if not subcommand or subcommand in {"list", "ls"}:
        return {"summary": "OK", "templates": templates}
    if subcommand == "add":
        parts = str(sub_rest or "").strip().split(maxsplit=1)
        if len(parts) != 2:
            return {"summary": "ERROR", "error": STASH_TEMPLATE_USAGE}
        name = _normalize_stash_ops_name(parts[0])
        raw_schedule, deliver, _explicit = _extract_stash_schedule_delivery(parts[1])
        schedule_input = _normalize_stash_schedule_text(raw_schedule)
        if not name or not schedule_input:
            return {"summary": "ERROR", "error": STASH_TEMPLATE_USAGE}
        try:
            cron_jobs = _cron_jobs_for_current_home()
            parsed = cron_jobs.parse_schedule(schedule_input)
        except Exception as exc:
            return {"summary": "ERROR", "error": f"Invalid Xenesis Desk stash schedule template: {exc}"}
        display = str(parsed.get("display") if isinstance(parsed, dict) else "") or schedule_input
        templates[name] = {
            "scheduleInput": schedule_input,
            "scheduleDisplay": display,
            "deliver": _resolve_stash_delivery(deliver),
            "updatedAt": time.time(),
        }
        store["scheduleTemplates"] = templates
        _save_stash_ops_store(store)
        return {"summary": "OK", "action": "added", "name": name, "template": templates[name], "templates": templates}
    if subcommand in {"remove", "rm", "delete"}:
        parts = _split_args(sub_rest)
        if len(parts) != 1:
            return {"summary": "ERROR", "error": STASH_TEMPLATE_USAGE}
        name = _normalize_stash_ops_name(parts[0])
        removed = templates.pop(name, None) is not None
        store["scheduleTemplates"] = templates
        _save_stash_ops_store(store)
        return {"summary": "OK" if removed else "MISSING", "action": "removed", "name": name, "templates": templates}
    return {"summary": "ERROR", "error": STASH_TEMPLATE_USAGE}


def _format_xd_stash_template(result: dict[str, Any]) -> str:
    if result.get("summary") == "ERROR":
        return str(result.get("error") or STASH_TEMPLATE_USAGE)
    lines = [f"Xenesis Desk stash schedule template: {str(result.get('summary') or 'OK').upper()}"]
    template = result.get("template") if isinstance(result.get("template"), dict) else {}
    if result.get("name") and template:
        lines.append(f"Template: {result.get('name')}")
        lines.append(f"Schedule: {template.get('scheduleDisplay') or template.get('scheduleInput') or ''}")
        lines.append(f"Delivery: {template.get('deliver') or 'local'}")
    templates = result.get("templates") if isinstance(result.get("templates"), dict) else {}
    if not templates:
        lines.append("No schedule templates.")
    else:
        lines.append("Templates:")
        for name in sorted(templates):
            item = templates.get(name) if isinstance(templates.get(name), dict) else {}
            lines.append(f"- {name}: {item.get('scheduleDisplay') or item.get('scheduleInput') or ''} deliver={item.get('deliver') or 'local'}")
    return "\n".join(lines)


def _parse_stash_retention_args(rest: str) -> tuple[str, int, int, str]:
    mode = "dry-run"
    run_days = 30
    failed_days = 90
    for raw_part in _split_args(rest):
        part = str(raw_part or "").strip()
        lowered = part.lower()
        if lowered in {"dry-run", "dryrun", "preview", "check"}:
            mode = "dry-run"
            continue
        if lowered in {"apply", "--apply", "run"}:
            mode = "apply"
            continue
        if lowered.startswith("run-days="):
            run_days = _normalize_limit(lowered.split("=", 1)[1], default=30, maximum=3650)
            continue
        if lowered.startswith("failed-days="):
            failed_days = _normalize_limit(lowered.split("=", 1)[1], default=90, maximum=3650)
            continue
        return mode, run_days, failed_days, STASH_RETENTION_USAGE
    return mode, run_days, failed_days, ""


def _cron_output_timestamp(path: Path) -> float:
    match = re.match(r"^(\d{8})-(\d{6})", path.name)
    if match:
        try:
            stamp = datetime.strptime("".join(match.groups()), "%Y%m%d%H%M%S").replace(tzinfo=timezone.utc)
            return stamp.timestamp()
        except ValueError:
            pass
    try:
        return path.stat().st_mtime
    except OSError:
        return 0


def _retention_output_candidates(run_days: int, failed_days: int) -> list[dict[str, Any]]:
    schedules = _load_stash_schedule_store().get("schedules")
    if not isinstance(schedules, list):
        schedules = []
    now = datetime.now(timezone.utc).timestamp()
    candidates: list[dict[str, Any]] = []
    for schedule in schedules:
        if not isinstance(schedule, dict):
            continue
        cron_id = str(schedule.get("cronJobId") or "").strip()
        output_dir = _stash_cron_output_dir(cron_id)
        if output_dir is None or not output_dir.exists():
            continue
        for path in output_dir.glob("*.md"):
            summary = _cron_output_summary(path)
            status = str(summary.get("status") or "").strip().lower()
            threshold_days = failed_days if status in {"error", "failed", "fail", "timeout", "cancelled"} else run_days
            age_seconds = now - _cron_output_timestamp(path)
            if age_seconds > threshold_days * 86400:
                candidates.append({
                    "path": str(path),
                    "file": path.name,
                    "status": status or "unknown",
                    "stashName": str(schedule.get("stashName") or "stash"),
                    "cronJobId": cron_id,
                })
    candidates.sort(key=lambda item: str(item.get("path") or ""))
    return candidates


def _run_xd_stash_retention(rest: str) -> dict[str, Any]:
    mode, run_days, failed_days, error = _parse_stash_retention_args(rest)
    if error:
        return {"summary": "ERROR", "error": error}
    outputs = _retention_output_candidates(run_days, failed_days)
    removed = {"runOutputs": 0}
    errors: list[str] = []
    if mode == "apply":
        for item in outputs:
            path = Path(str(item.get("path") or ""))
            try:
                path.unlink(missing_ok=True)
                removed["runOutputs"] += 1
            except OSError as exc:
                errors.append(f"{path}: {exc}")
    return {
        "summary": "APPLIED" if mode == "apply" else "DRY_RUN",
        "mode": mode,
        "runDays": run_days,
        "failedDays": failed_days,
        "candidates": {"runOutputs": outputs},
        "candidateCount": len(outputs),
        "removed": removed,
        "errors": errors,
    }


def _format_xd_stash_retention(result: dict[str, Any]) -> str:
    if result.get("summary") == "ERROR":
        return str(result.get("error") or STASH_RETENTION_USAGE)
    candidates = result.get("candidates") if isinstance(result.get("candidates"), dict) else {}
    outputs = candidates.get("runOutputs") if isinstance(candidates.get("runOutputs"), list) else []
    summary = str(result.get("summary") or "UNKNOWN").upper()
    lines = [
        f"Xenesis Desk stash retention: {summary}",
        f"Mode: {result.get('mode') or 'dry-run'}",
        f"Keep successful runs: {result.get('runDays', 30)} day(s)",
        f"Keep failed runs: {result.get('failedDays', 90)} day(s)",
        f"Run output candidates: {len(outputs)}",
    ]
    for item in outputs[:10]:
        if not isinstance(item, dict):
            continue
        lines.append(f"- {item.get('stashName') or 'stash'} [{item.get('status') or 'unknown'}]: {item.get('path') or ''}")
    if len(outputs) > 10:
        lines.append(f"- ... {len(outputs) - 10} more")
    errors = result.get("errors") if isinstance(result.get("errors"), list) else []
    if summary == "APPLIED":
        removed = result.get("removed") if isinstance(result.get("removed"), dict) else {}
        lines.append(f"Removed: runOutputs={removed.get('runOutputs', 0)} errors={len(errors)}")
    elif outputs:
        lines.append(
            "Apply: "
            f"/xd stash retention apply run-days={result.get('runDays', 30)} failed-days={result.get('failedDays', 90)}"
        )
    if errors:
        lines.append("Errors:")
        lines.extend(f"- {error}" for error in errors if error)
    return "\n".join(lines)


def _format_stash_restore_items(title: str, items: list[dict[str, Any]]) -> list[str]:
    lines = [f"{title}: {len(items)}"]
    for item in items[:5]:
        if not isinstance(item, dict):
            continue
        name = str(item.get("name") or item.get("path") or "item")
        detail = str(item.get("command") or item.get("path") or "").strip()
        lines.append(f"- {name}" if not detail or detail == name else f"- {name}: {detail}")
    if len(items) > 5:
        lines.append(f"- ... {len(items) - 5} more")
    return lines


def _format_xd_stash_restore(result: dict[str, Any]) -> str:
    if result.get("summary") == "ERROR":
        return str(result.get("error") or STASH_RESTORE_USAGE)
    stash = result.get("stash") if isinstance(result.get("stash"), dict) else {}
    plan = result.get("plan") if isinstance(result.get("plan"), dict) else {}
    add = plan.get("add") if isinstance(plan.get("add"), dict) else {}
    skip = plan.get("skip") if isinstance(plan.get("skip"), dict) else {}
    exports = plan.get("exports") if isinstance(plan.get("exports"), list) else []
    summary = str(result.get("summary") or "UNKNOWN").upper()
    lines = [
        f"Xenesis Desk stash restore: {summary}",
        f"Stash: {stash.get('name') or 'stash'}",
        f"Workspace: {plan.get('workspace') or _quick_actions_workspace_key()}",
        f"Will add: {_restore_counts_text(add)}",
        f"Already present: {_restore_counts_text(skip)}",
        f"Exports: {len(exports)} reference(s), not restored",
    ]
    lines.extend(_format_stash_restore_items("Pins to add", add.get("pins") if isinstance(add.get("pins"), list) else []))
    lines.extend(_format_stash_restore_items("Quick actions to add", add.get("quickActions") if isinstance(add.get("quickActions"), list) else []))
    lines.extend(_format_stash_restore_items("Workflows to add", add.get("workflows") if isinstance(add.get("workflows"), list) else []))
    errors = result.get("errors") if isinstance(result.get("errors"), list) else []
    if summary == "APPLIED":
        added = result.get("added") if isinstance(result.get("added"), dict) else {}
        lines.append(
            "Added: "
            f"pins={added.get('pins', 0)} "
            f"quick={added.get('quick', 0)} "
            f"workflows={added.get('workflows', 0)} "
            f"errors={len(errors)}"
        )
    else:
        lines.append(f"Apply: /xd stash restore #{result.get('index') or '?'} apply")
    if errors:
        lines.append("Errors:")
        lines.extend(f"- {error}" for error in errors if error)
    return "\n".join(lines)


def _format_xd_stash_export(result: dict[str, Any]) -> str:
    if result.get("summary") == "ERROR":
        return str(result.get("error") or STASH_EXPORT_USAGE)
    stash = result.get("stash") if isinstance(result.get("stash"), dict) else {}
    file_path = str(result.get("filePath") or "")
    file_name = Path(file_path).name if file_path else ""
    counts = result.get("counts") if isinstance(result.get("counts"), dict) else {}
    lines = [
        f"Xenesis Desk stash export: {str(result.get('summary') or 'UNKNOWN').upper()}",
        f"Stash: {stash.get('name') or 'stash'}",
        f"Kind: {result.get('kind') or 'stash'}",
        (
            "Counts: "
            f"pins={counts.get('pins', 0)} "
            f"quick={counts.get('quick', 0)} "
            f"workflows={counts.get('workflows', 0)} "
            f"exports={counts.get('exports', 0)}"
        ),
        f"Path: {file_path}",
        f"Opened: {'yes' if result.get('opened') else 'no'}",
    ]
    if file_name:
        lines.append(f"Open: /xd exports open {file_name}")
    if result.get("openError"):
        lines.append(f"Open error: {result['openError']}")
    return "\n".join(lines)


def _format_xd_stash_pack(result: dict[str, Any]) -> str:
    if result.get("summary") == "ERROR":
        return str(result.get("error") or STASH_PACK_USAGE)
    file_path = str(result.get("filePath") or "")
    file_name = Path(file_path).name if file_path else ""
    counts = result.get("counts") if isinstance(result.get("counts"), dict) else {}
    lines = [
        f"Xenesis Desk stash pack: {str(result.get('summary') or 'UNKNOWN').upper()}",
        f"Kind: {result.get('kind') or 'stash-pack'}",
        f"Stashes: {counts.get('stashes', 0)}",
        f"Schedules: {counts.get('schedules', 0)}",
        f"Counts: {_stash_pack_counts_text(counts)}",
        f"Path: {file_path}",
        f"Opened: {'yes' if result.get('opened') else 'no'}",
    ]
    if file_name:
        lines.append(f"Open: /xd exports open {file_name}")
    if result.get("openError"):
        lines.append(f"Open error: {result['openError']}")
    return "\n".join(lines)


def _format_xd_stash_import(result: dict[str, Any]) -> str:
    if result.get("summary") == "ERROR":
        return str(result.get("error") or STASH_IMPORT_USAGE)
    stash = result.get("stash") if isinstance(result.get("stash"), dict) else {}
    index = result.get("index") or "?"
    lines = [
        f"Xenesis Desk stash import: {str(result.get('summary') or 'UNKNOWN').upper()}",
        f"Stash: {stash.get('name') or 'stash'}",
        f"Source: {result.get('sourcePath') or ''}",
        f"Index: #{index}",
        f"Counts: {_stash_counts_text(stash)}",
        f"Open: /xd stash open #{index}",
        f"Diff: /xd stash diff #{index}",
        f"Restore: /xd stash restore #{index} apply",
    ]
    return "\n".join(lines)


def _format_xd_stash_unpack(result: dict[str, Any]) -> str:
    if result.get("summary") == "ERROR":
        return str(result.get("error") or STASH_UNPACK_USAGE)
    items = result.get("items") if isinstance(result.get("items"), list) else []
    lines = [
        f"Xenesis Desk stash unpack: {str(result.get('summary') or 'UNKNOWN').upper()}",
        f"Source: {result.get('sourcePath') or ''}",
        f"Imported: {result.get('imported', 0)}",
        f"Updated: {result.get('updated', 0)}",
        f"Skipped: {result.get('skipped', 0)}",
        f"Schedules: {result.get('scheduled', 0)}",
        f"Stashes: {len(items)}",
    ]
    for item_index, item in enumerate(items[:10], start=1):
        if not isinstance(item, dict):
            continue
        name = str(item.get("name") or f"stash #{item.get('index') or item_index}")
        lines.append(f"{item_index}. {name} -> /xd stash open #{item.get('index') or '?'}")
    if len(items) > 10:
        lines.append(f"... {len(items) - 10} more")
    first_index = items[0].get("index") if items and isinstance(items[0], dict) else "?"
    lines.append(f"Next: /xd stash diff #{first_index} | /xd stash restore #{first_index} apply")
    return "\n".join(lines)


def _format_xd_stash_apply(result: dict[str, Any]) -> str:
    if result.get("summary") == "ERROR":
        return str(result.get("error") or STASH_APPLY_USAGE)
    stash = result.get("stash") if isinstance(result.get("stash"), dict) else {}
    plan = result.get("plan") if isinstance(result.get("plan"), dict) else {}
    add = plan.get("add") if isinstance(plan.get("add"), dict) else {}
    skip = plan.get("skip") if isinstance(plan.get("skip"), dict) else {}
    exports = plan.get("exports") if isinstance(plan.get("exports"), list) else []
    summary = str(result.get("summary") or "UNKNOWN").upper()
    index = result.get("index") or "?"
    source_path = str(result.get("sourcePath") or "")
    source_name = Path(source_path).name if source_path else str(result.get("reference") or "")
    lines = [
        f"Xenesis Desk stash apply: {summary}",
        f"Import: {result.get('importSummary') or 'OK'} #{index}",
        f"Stash: {stash.get('name') or 'stash'}",
        f"Source: {source_path}",
        f"Workspace: {plan.get('workspace') or _quick_actions_workspace_key()}",
        f"Will add: {_restore_counts_text(add)}",
        f"Already present: {_restore_counts_text(skip)}",
        f"Exports: {len(exports)} reference(s), not restored",
    ]
    lines.extend(_format_stash_restore_items("Pins to add", add.get("pins") if isinstance(add.get("pins"), list) else []))
    lines.extend(_format_stash_restore_items("Quick actions to add", add.get("quickActions") if isinstance(add.get("quickActions"), list) else []))
    lines.extend(_format_stash_restore_items("Workflows to add", add.get("workflows") if isinstance(add.get("workflows"), list) else []))
    errors = result.get("errors") if isinstance(result.get("errors"), list) else []
    if summary == "APPLIED":
        added = result.get("added") if isinstance(result.get("added"), dict) else {}
        lines.append(
            "Added: "
            f"pins={added.get('pins', 0)} "
            f"quick={added.get('quick', 0)} "
            f"workflows={added.get('workflows', 0)} "
            f"errors={len(errors)}"
        )
    else:
        lines.append(f"Apply: /xd stash apply {source_name or '#1'} apply")
    if errors:
        lines.append("Errors:")
        lines.extend(f"- {error}" for error in errors if error)
    return "\n".join(lines)


def _format_xd_stash_apply_pack(result: dict[str, Any]) -> str:
    if result.get("summary") == "ERROR":
        return str(result.get("error") or STASH_APPLY_PACK_USAGE)
    summary = str(result.get("summary") or "UNKNOWN").upper()
    items = result.get("items") if isinstance(result.get("items"), list) else []
    source_path = str(result.get("sourcePath") or "")
    source_name = Path(source_path).name if source_path else str(result.get("reference") or "")
    will_add = result.get("willAdd") if isinstance(result.get("willAdd"), dict) else _empty_restore_counts()
    already_present = result.get("alreadyPresent") if isinstance(result.get("alreadyPresent"), dict) else _empty_restore_counts()
    errors = result.get("errors") if isinstance(result.get("errors"), list) else []
    lines = [
        f"Xenesis Desk stash apply-pack: {summary}",
        f"Source: {source_path}",
        (
            "Import: "
            f"imported={result.get('imported', 0)} "
            f"updated={result.get('updated', 0)} "
            f"skipped={result.get('skipped', 0)}"
        ),
        f"Stashes: {len(items)}",
        f"Workspace: {result.get('workspace') or _quick_actions_workspace_key()}",
        f"Will add: {_restore_count_values_text(will_add)}",
        f"Already present: {_restore_count_values_text(already_present)}",
        f"Exports: {result.get('exports', 0)} reference(s), not restored",
    ]
    for item_index, item in enumerate(items[:10], start=1):
        if not isinstance(item, dict):
            continue
        plan = item.get("plan") if isinstance(item.get("plan"), dict) else {}
        add = plan.get("add") if isinstance(plan.get("add"), dict) else {}
        skip = plan.get("skip") if isinstance(plan.get("skip"), dict) else {}
        name = str(item.get("name") or f"stash #{item.get('index') or item_index}")
        line = (
            f"{item_index}. {name} #{item.get('index') or '?'}: "
            f"add {_restore_counts_text(add)} "
            f"skip {_restore_counts_text(skip)}"
        )
        if summary == "APPLIED":
            added = item.get("added") if isinstance(item.get("added"), dict) else _empty_restore_counts()
            line += f" added {_restore_count_values_text(added)}"
        lines.append(line)
    if len(items) > 10:
        lines.append(f"... {len(items) - 10} more")
    if summary == "APPLIED":
        added = result.get("added") if isinstance(result.get("added"), dict) else _empty_restore_counts()
        lines.append(
            "Added: "
            f"pins={added.get('pins', 0)} "
            f"quick={added.get('quick', 0)} "
            f"workflows={added.get('workflows', 0)} "
            f"errors={len(errors)}"
        )
    else:
        lines.append(f"Apply: /xd stash apply-pack {source_name or '#1'} apply")
    if errors:
        lines.append("Errors:")
        lines.extend(f"- {error}" for error in errors if error)
    return "\n".join(lines)


def _format_xd_stash_inspect(result: dict[str, Any]) -> str:
    if result.get("summary") == "ERROR":
        return str(result.get("error") or STASH_INSPECT_USAGE)
    source_type = str(result.get("sourceType") or "stash")
    diagnostics = result.get("diagnostics") if isinstance(result.get("diagnostics"), dict) else {}
    counts = result.get("counts") if isinstance(result.get("counts"), dict) else {}
    source_path = str(result.get("sourcePath") or "")
    source_name = Path(source_path).name if source_path else ""
    lines = [
        f"Xenesis Desk stash inspect: {str(result.get('summary') or 'UNKNOWN').upper()}",
        f"Source type: {source_type}",
        f"Schema: {result.get('schema') or 'unknown'} v{result.get('version') or 'unknown'}",
    ]
    if source_path:
        lines.append(f"Source: {source_path}")

    if source_type == "stash-pack":
        entries = result.get("entries") if isinstance(result.get("entries"), list) else []
        lines.extend([
            f"Stashes: {len(entries)}",
            (
                "Counts: "
                f"pins={counts.get('pins', 0)} "
                f"quick={counts.get('quick', 0)} "
                f"workflows={counts.get('workflows', 0)} "
                f"exports={counts.get('exports', 0)}"
            ),
            f"Missing pin targets: {diagnostics.get('missingPins', 0)}",
            f"Duplicate quick names: {diagnostics.get('duplicateQuickNames', 0)}",
            f"Duplicate quick commands: {diagnostics.get('duplicateQuickCommands', 0)}",
            f"Duplicate workflow names: {diagnostics.get('duplicateWorkflowNames', 0)}",
            f"Duplicate stash names: {diagnostics.get('duplicateStashNames', 0)}",
            f"Skipped entries: {diagnostics.get('skippedEntries', 0)}",
            f"Issues: {result.get('issues', 0)}",
            f"Next: /xd stash apply-pack {source_name or '#1'}",
        ])
        return "\n".join(lines)

    stash = result.get("stash") if isinstance(result.get("stash"), dict) else {}
    index = result.get("index")
    stash_name = str(stash.get("name") or "stash")
    stash_label = f"{stash_name} #{index}" if isinstance(index, int) and index > 0 else stash_name
    lines.extend([
        f"Stash: {stash_label}",
        f"Workspace: {stash.get('workspace') or ''}",
        (
            "Counts: "
            f"pins={counts.get('pins', 0)} "
            f"quick={counts.get('quick', 0)} "
            f"workflows={counts.get('workflows', 0)} "
            f"exports={counts.get('exports', 0)}"
        ),
        f"Missing pin targets: {diagnostics.get('missingPins', 0)}",
        f"Duplicate quick names: {diagnostics.get('duplicateQuickNames', 0)}",
        f"Duplicate quick commands: {diagnostics.get('duplicateQuickCommands', 0)}",
        f"Duplicate workflow names: {diagnostics.get('duplicateWorkflowNames', 0)}",
        f"Name duplicates in store: {diagnostics.get('nameDuplicates', 0)}",
        f"Issues: {result.get('issues', 0)}",
    ])
    if source_type == "stash-export":
        lines.append(f"Next: /xd stash apply {source_name or '#1'}")
    else:
        next_index = index if isinstance(index, int) and index > 0 else "?"
        lines.append(f"Next: /xd stash diff #{next_index} | /xd stash restore #{next_index} apply")
    return "\n".join(lines)


def _format_xd_stash_promote(result: dict[str, Any]) -> str:
    if result.get("summary") == "ERROR":
        return str(result.get("error") or STASH_PROMOTE_USAGE)
    stash = result.get("stash") if isinstance(result.get("stash"), dict) else {}
    index = result.get("index") or "?"
    preset_name = str(result.get("presetName") or "restore stash")
    steps = result.get("workflowSteps") if isinstance(result.get("workflowSteps"), list) else []
    lines = [
        f"Xenesis Desk stash promote: {str(result.get('summary') or 'UNKNOWN').upper()}",
        f"Stash: {stash.get('name') or 'stash'} #{index}",
        f"Workspace: {result.get('workspace') or _quick_actions_workspace_key()}",
        (
            f"Quick action: {result.get('quickAction') or 'added'} "
            f"{preset_name} -> /xd {result.get('quickCommand') or ''}"
        ),
        (
            f"Workflow: {result.get('workflowAction') or 'added'} "
            f"{preset_name} ({len(steps)} step(s))"
        ),
        f"Run: /xd quick #{result.get('quickIndex') or '?'} | /xd workflow #{result.get('workflowIndex') or '?'}",
    ]
    return "\n".join(lines)


def _format_xd_stash_schedule(result: dict[str, Any]) -> str:
    if result.get("summary") == "ERROR":
        return str(result.get("error") or STASH_SCHEDULE_USAGE)
    stash = result.get("stash") if isinstance(result.get("stash"), dict) else {}
    schedule = result.get("schedule") if isinstance(result.get("schedule"), dict) else {}
    lines = [
        f"Xenesis Desk stash schedule: {str(result.get('summary') or 'UNKNOWN').upper()}",
        f"Stash: {stash.get('name') or 'stash'} #{result.get('index') or '?'}",
        f"Workspace: {result.get('workspace') or _quick_actions_workspace_key()}",
        f"Schedule: {schedule.get('scheduleDisplay') or schedule.get('scheduleInput') or ''}",
        f"Cron job: {schedule.get('cronJobId') or ''}",
        f"Delivery: {schedule.get('deliver') or 'local'}",
        f"Command: /xd {schedule.get('command') or ''}",
        f"Script: {schedule.get('script') or ''}",
    ]
    next_run = str(schedule.get("nextRunAt") or "").strip()
    if next_run:
        lines.append(f"Next run: {next_run}")
    lines.append("Next: /xd stash schedules")
    return "\n".join(lines)


def _format_xd_stash_schedules(result: dict[str, Any]) -> str:
    schedules = result.get("schedules") if isinstance(result.get("schedules"), list) else []
    path_text = str(result.get("path") or _stash_schedule_store_path())
    if not schedules:
        return "\n".join([
            "No Xenesis Desk stash schedules.",
            "Create: /xd stash schedule #N every 6h",
            f"Path: {path_text}",
        ])
    lines = [
        "Xenesis Desk stash schedules:",
        f"Path: {path_text}",
    ]
    for index, schedule in enumerate(schedules, start=1):
        if not isinstance(schedule, dict):
            continue
        stash_name = str(schedule.get("stashName") or "stash")
        stash_index = schedule.get("stashIndex") or "?"
        lines.extend([
            f"{index}. {stash_name} #{stash_index}",
            f"   Workspace: {schedule.get('workspace') or ''}",
            f"   Schedule: {schedule.get('scheduleDisplay') or schedule.get('scheduleInput') or ''}",
            f"   Cron job: {schedule.get('cronJobId') or ''}",
            f"   Status: {schedule.get('state') or 'scheduled'} enabled={bool(schedule.get('enabled', True))}",
            f"   Delivery: {schedule.get('deliver') or 'local'}",
            f"   Command: /xd {schedule.get('command') or ''}",
        ])
        next_run = str(schedule.get("nextRunAt") or "").strip()
        if next_run:
            lines.append(f"   Next run: {next_run}")
        last_run = str(schedule.get("lastRunAt") or "").strip()
        if last_run:
            lines.append(f"   Last run: {last_run}")
        last_status = str(schedule.get("lastStatus") or "").strip()
        if last_status:
            lines.append(f"   Last status: {last_status}")
        last_error = str(schedule.get("lastError") or "").strip()
        if last_error:
            lines.append(f"   Last error: {last_error}")
        issues = schedule.get("issues") if isinstance(schedule.get("issues"), list) else []
        for issue in issues:
            lines.append(f"   Issue: {issue}")
    if any(isinstance(schedule, dict) and schedule.get("issues") for schedule in schedules):
        lines.append("Repair: /xd stash repair apply")
    return "\n".join(lines)


def _format_xd_stash_cron_action(result: dict[str, Any]) -> str:
    if result.get("summary") == "ERROR":
        return str(result.get("error") or STASH_CRON_ACTION_USAGE)
    action = str(result.get("action") or "schedule")
    summary = str(result.get("summary") or "OK").upper()
    items = result.get("items") if isinstance(result.get("items"), list) else []
    errors = result.get("errors") if isinstance(result.get("errors"), list) else []
    lines = [
        f"Xenesis Desk stash {action}: {summary}",
        f"Updated: schedules={int(result.get('updated') or 0)} errors={len(errors)}",
    ]
    for item in items:
        schedule = item.get("schedule") if isinstance(item, dict) else {}
        if not isinstance(schedule, dict):
            continue
        lines.extend([
            f"- {schedule.get('stashName') or 'stash'} #{schedule.get('stashIndex') or '?'}",
            f"  Cron job: {schedule.get('cronJobId') or ''}",
            f"  Status: {schedule.get('state') or 'scheduled'} enabled={bool(schedule.get('enabled', True))}",
        ])
        next_run = str(schedule.get("nextRunAt") or "").strip()
        if next_run:
            lines.append(f"  Next run: {next_run}")
    if errors:
        lines.append("Errors:")
        lines.extend(f"- {error}" for error in errors if error)
    return "\n".join(lines)


def _format_xd_stash_repair(result: dict[str, Any]) -> str:
    if result.get("summary") == "ERROR":
        return str(result.get("error") or STASH_REPAIR_USAGE)
    summary = str(result.get("summary") or "UNKNOWN").upper()
    plan = result.get("plan") if isinstance(result.get("plan"), dict) else {}
    missing_cron = plan.get("missingCronJobs") if isinstance(plan.get("missingCronJobs"), list) else []
    missing_scripts = plan.get("missingScripts") if isinstance(plan.get("missingScripts"), list) else []
    orphan_jobs = plan.get("orphanCronJobs") if isinstance(plan.get("orphanCronJobs"), list) else []
    lines = [
        f"Xenesis Desk stash repair: {summary}",
        f"Mode: {result.get('mode') or 'dry-run'}",
        f"Missing cron jobs: {len(missing_cron)}",
        f"Missing scripts: {len(missing_scripts)}",
        f"Orphan cron jobs: {len(orphan_jobs)}",
    ]
    for item in missing_cron[:5]:
        schedule = item.get("schedule") if isinstance(item, dict) else {}
        if isinstance(schedule, dict):
            lines.append(f"- Missing cron: {schedule.get('stashName') or 'stash'} {schedule.get('cronJobId') or ''}")
    for item in missing_scripts[:5]:
        schedule = item.get("schedule") if isinstance(item, dict) else {}
        if isinstance(schedule, dict):
            lines.append(f"- Missing script: {schedule.get('stashName') or 'stash'} {schedule.get('script') or ''}")
    if summary == "APPLIED":
        recreated = result.get("recreated") if isinstance(result.get("recreated"), dict) else {}
        removed = result.get("removed") if isinstance(result.get("removed"), dict) else {}
        errors = result.get("errors") if isinstance(result.get("errors"), list) else []
        lines.append(
            "Recreated: "
            f"cronJobs={recreated.get('cronJobs', 0)} "
            f"scripts={recreated.get('scripts', 0)}"
        )
        lines.append(f"Removed orphan cronJobs={removed.get('orphanCronJobs', 0)} errors={len(errors)}")
        if errors:
            lines.append("Errors:")
            lines.extend(f"- {error}" for error in errors if error)
    elif missing_cron or missing_scripts or orphan_jobs:
        lines.append("Apply: /xd stash repair apply")
    return "\n".join(lines)


def _format_xd_stash_runs(result: dict[str, Any]) -> str:
    if result.get("summary") == "ERROR":
        return str(result.get("error") or STASH_RUNS_USAGE)
    items = result.get("items") if isinstance(result.get("items"), list) else []
    if not items or all(not item.get("runs") for item in items if isinstance(item, dict)):
        return f"No Xenesis Desk stash runs for {result.get('selector') or '?' }."
    lines = ["Xenesis Desk stash runs:"]
    for item in items:
        if not isinstance(item, dict):
            continue
        schedule = item.get("schedule") if isinstance(item.get("schedule"), dict) else {}
        runs = item.get("runs") if isinstance(item.get("runs"), list) else []
        lines.extend([
            f"Schedule: {schedule.get('stashName') or 'stash'} #{schedule.get('stashIndex') or '?'}",
            f"Cron job: {schedule.get('cronJobId') or ''}",
            f"Runs shown: {len(runs)} of {int(item.get('total') or 0)}",
        ])
        for index, run in enumerate(runs, start=1):
            if not isinstance(run, dict):
                continue
            lines.append(f"{index}. {run.get('file') or ''}")
            if run.get("status"):
                lines.append(f"   Status: {run.get('status')}")
            if run.get("preview"):
                lines.append(f"   Preview: {run.get('preview')}")
            if run.get("path"):
                lines.append(f"   Path: {run.get('path')}")
    return "\n".join(lines)


def _format_xd_stash_unschedule(result: dict[str, Any]) -> str:
    if result.get("summary") == "ERROR":
        return str(result.get("error") or STASH_UNSCHEDULE_USAGE)
    summary = str(result.get("summary") or "UNKNOWN").upper()
    mode = str(result.get("mode") or "dry-run")
    candidates = result.get("candidates") if isinstance(result.get("candidates"), list) else []
    lines = [
        f"Xenesis Desk stash unschedule: {summary}",
        f"Mode: {mode}",
        f"Candidates: {int(result.get('candidateCount') or len(candidates))}",
    ]
    for item_index, candidate in enumerate(candidates, start=1):
        schedule = candidate.get("schedule") if isinstance(candidate, dict) else {}
        if not isinstance(schedule, dict):
            continue
        lines.extend([
            f"{item_index}. {schedule.get('stashName') or 'stash'} #{schedule.get('stashIndex') or '?'}",
            f"   Schedule: {schedule.get('scheduleDisplay') or schedule.get('scheduleInput') or ''}",
            f"   Cron job: {schedule.get('cronJobId') or ''}",
            f"   Script: {schedule.get('script') or ''}",
        ])
    if summary == "APPLIED":
        removed = result.get("removed") if isinstance(result.get("removed"), dict) else {}
        errors = result.get("errors") if isinstance(result.get("errors"), list) else []
        lines.append(
            "Removed: "
            f"schedules={removed.get('schedules', 0)} "
            f"cronJobs={removed.get('cronJobs', 0)} "
            f"scripts={removed.get('scripts', 0)} "
            f"errors={len(errors)}"
        )
        if errors:
            lines.append("Errors:")
            lines.extend(f"- {error}" for error in errors if error)
        return "\n".join(lines)

    planned = result.get("planned") if isinstance(result.get("planned"), dict) else {}
    selector = str(result.get("selector") or "").strip()
    lines.append(
        "Will remove: "
        f"schedules={planned.get('schedules', 0)} "
        f"cronJobs={planned.get('cronJobs', 0)} "
        f"scripts={planned.get('scripts', 0)}"
    )
    lines.append(f"Apply: /xd stash unschedule {selector or '<target>'} apply")
    return "\n".join(lines)


def _format_stash_prune_category(title: str, items: list[dict[str, Any]]) -> list[str]:
    lines = [f"{title}: {len(items)} candidate(s)"]
    for item in items:
        if not isinstance(item, dict):
            continue
        label = str(item.get("label") or title)
        detail = str(item.get("detail") or "").strip()
        path_text = str(item.get("path") or "").strip()
        index = item.get("index")
        prefix = f"{label} #{index}" if isinstance(index, int) and index > 0 else label
        lines.append(f"- {prefix}" if not detail else f"- {prefix}: {detail}")
        if path_text:
            lines.append(f"  {path_text}")
    return lines


def _format_xd_stash_prune(result: dict[str, Any]) -> str:
    if result.get("summary") == "ERROR":
        return str(result.get("error") or STASH_PRUNE_USAGE)
    summary = str(result.get("summary") or "UNKNOWN").upper()
    candidates = result.get("candidates") if isinstance(result.get("candidates"), dict) else {}
    stashes = candidates.get("stashes") if isinstance(candidates.get("stashes"), list) else []
    exports = candidates.get("exports") if isinstance(candidates.get("exports"), list) else []
    total = int(result.get("candidateCount") or 0)
    lines = [
        f"Xenesis Desk stash prune: {summary}",
        f"Mode: {result.get('mode') or 'dry-run'}",
        f"Keep stash exports: {result.get('keepExports') or 5}",
        f"Candidates: {total}",
    ]
    if total == 0:
        lines.append("No stash prune candidates.")
        return "\n".join(lines)

    lines.extend(_format_stash_prune_category("Duplicate stashes", stashes))
    lines.extend(_format_stash_prune_category("Stash exports", exports))
    errors = result.get("errors") if isinstance(result.get("errors"), list) else []
    if summary == "APPLIED":
        removed = result.get("removed") if isinstance(result.get("removed"), dict) else {}
        lines.append(
            "Removed: "
            f"stashes={removed.get('stashes', 0)} "
            f"exports={removed.get('exports', 0)} "
            f"errors={len(errors)}"
        )
    else:
        lines.append(f"Apply: /xd stash prune apply keep={result.get('keepExports') or 5}")
    if errors:
        lines.append("Errors:")
        lines.extend(f"- {error}" for error in errors if error)
    return "\n".join(lines)


def _format_xd_stash_diff(result: dict[str, Any]) -> str:
    if result.get("summary") == "ERROR":
        return str(result.get("error") or STASH_DIFF_USAGE)
    stash = result.get("stash") if isinstance(result.get("stash"), dict) else {}
    plan = result.get("plan") if isinstance(result.get("plan"), dict) else {}
    add = plan.get("add") if isinstance(plan.get("add"), dict) else {}
    skip = plan.get("skip") if isinstance(plan.get("skip"), dict) else {}
    exports = plan.get("exports") if isinstance(plan.get("exports"), list) else []
    lines = [
        f"Xenesis Desk stash diff: {stash.get('name') or 'stash'}",
        f"Workspace: {plan.get('workspace') or _quick_actions_workspace_key()}",
        f"Missing from workspace: {_restore_counts_text(add)}",
        f"Already present: {_restore_counts_text(skip)}",
        f"Exports: {len(exports)} reference(s), not restored",
    ]
    lines.extend(_format_stash_restore_items("Missing pins", add.get("pins") if isinstance(add.get("pins"), list) else []))
    lines.extend(_format_stash_restore_items("Missing quick actions", add.get("quickActions") if isinstance(add.get("quickActions"), list) else []))
    lines.extend(_format_stash_restore_items("Missing workflows", add.get("workflows") if isinstance(add.get("workflows"), list) else []))
    lines.extend(_format_stash_restore_items("Present pins", skip.get("pins") if isinstance(skip.get("pins"), list) else []))
    lines.extend(_format_stash_restore_items("Present quick actions", skip.get("quickActions") if isinstance(skip.get("quickActions"), list) else []))
    lines.extend(_format_stash_restore_items("Present workflows", skip.get("workflows") if isinstance(skip.get("workflows"), list) else []))
    lines.append(f"Restore: /xd stash restore #{result.get('index') or '?'} apply")
    return "\n".join(lines)


def _run_xd_stash_remove(selector: str) -> dict[str, Any]:
    stash, index, error = _stash_from_selector(selector)
    if error:
        return {"summary": "ERROR", "error": error}
    store = _load_stash_store()
    stashes = _stashes(store)
    if index < 1 or index > len(stashes):
        return {"summary": "ERROR", "error": f"No Xenesis Desk stash for {selector}. Run /xd stash to see stashes."}
    removed = stashes.pop(index - 1)
    store["stashes"] = stashes
    _save_stash_store(store)
    return {"summary": "OK", "stash": removed}


def _format_xd_stash_remove(result: dict[str, Any]) -> str:
    if result.get("summary") == "ERROR":
        return str(result.get("error") or "Usage: /xd stash remove #N")
    stash = result.get("stash") if isinstance(result.get("stash"), dict) else {}
    return f"Removed Xenesis Desk stash: {stash.get('name') or 'stash'}"


def _stash_path_info() -> str:
    stashes = _stashes()
    return "\n".join([
        "Xenesis Desk stash storage:",
        f"Path: {_stash_store_path()}",
        f"Stashes: {len(stashes)}",
    ])


def _handle_stash_command(rest: str) -> str:
    subcommand, sub_rest = _first_word_and_rest(rest)
    if not subcommand or subcommand in {"list", "ls"}:
        return _format_xd_stashes()
    if subcommand == "save":
        return _format_xd_stash_save(_run_xd_stash_save(sub_rest))
    if subcommand in {"open", "show"}:
        stash, index, error = _stash_from_selector(sub_rest)
        if error:
            return error
        return _format_xd_stash_open(stash, index)
    if subcommand == "restore":
        return _format_xd_stash_restore(_run_xd_stash_restore(sub_rest))
    if subcommand in {"diff", "compare"}:
        return _format_xd_stash_diff(_run_xd_stash_diff(sub_rest))
    if subcommand == "export":
        return _format_xd_stash_export(_run_xd_stash_export(sub_rest))
    if subcommand == "import":
        return _format_xd_stash_import(_run_xd_stash_import(sub_rest))
    if subcommand == "apply":
        return _format_xd_stash_apply(_run_xd_stash_apply(sub_rest))
    if subcommand == "pack":
        return _format_xd_stash_pack(_run_xd_stash_pack(sub_rest))
    if subcommand == "unpack":
        return _format_xd_stash_unpack(_run_xd_stash_unpack(sub_rest))
    if subcommand == "apply-pack":
        return _format_xd_stash_apply_pack(_run_xd_stash_apply_pack(sub_rest))
    if subcommand == "inspect":
        return _format_xd_stash_inspect(_run_xd_stash_inspect(sub_rest))
    if subcommand == "promote":
        return _format_xd_stash_promote(_run_xd_stash_promote(sub_rest))
    if subcommand == "schedule":
        return _format_xd_stash_schedule(_run_xd_stash_schedule(sub_rest))
    if subcommand == "schedules":
        return _format_xd_stash_schedules(_run_xd_stash_schedules())
    if subcommand == "health":
        return _format_xd_stash_health(_run_xd_stash_health(sub_rest))
    if subcommand in {"preset", "presets", "delivery", "deliveries"}:
        return _format_xd_stash_preset(_run_xd_stash_preset(sub_rest))
    if subcommand in {"template", "templates"}:
        return _format_xd_stash_template(_run_xd_stash_template(sub_rest))
    if subcommand in {"pause", "resume", "trigger"}:
        return _format_xd_stash_cron_action(_run_xd_stash_cron_action(subcommand, sub_rest))
    if subcommand == "runs":
        return _format_xd_stash_runs(_run_xd_stash_runs(sub_rest))
    if subcommand == "repair":
        return _format_xd_stash_repair(_run_xd_stash_repair(sub_rest))
    if subcommand in {"retention", "retain"}:
        return _format_xd_stash_retention(_run_xd_stash_retention(sub_rest))
    if subcommand == "unschedule":
        return _format_xd_stash_unschedule(_run_xd_stash_unschedule(sub_rest))
    if subcommand == "prune":
        mode, keep_exports, error = _parse_stash_prune_args(sub_rest)
        if error:
            return error
        return _format_xd_stash_prune(_run_xd_stash_prune(mode=mode, keep_exports=keep_exports))
    if subcommand in {"remove", "rm", "delete"}:
        return _format_xd_stash_remove(_run_xd_stash_remove(sub_rest))
    if subcommand == "path":
        return _stash_path_info()
    return STASH_USAGE


def _is_work_packet_text(value: str) -> bool:
    return str(value or "").lstrip().startswith("# Hermes Work Packet")


def _work_packet_line_value(content: str, label: str) -> str:
    match = re.search(rf"^{re.escape(label)}:\s*(.+?)\s*$", content, flags=re.MULTILINE)
    return match.group(1).strip() if match else ""


def _work_packet_section(content: str, heading: str) -> str:
    lines = str(content or "").splitlines()
    start = -1
    heading_text = f"## {heading}".casefold()
    for index, line in enumerate(lines):
        if line.strip().casefold() == heading_text:
            start = index + 1
            break
    if start < 0:
        return ""
    end = len(lines)
    for index in range(start, len(lines)):
        if lines[index].startswith("## "):
            end = index
            break
    return "\n".join(lines[start:end]).strip()


def _clean_work_packet_bullet(line: str) -> str:
    text = str(line or "").strip()
    if not text:
        return ""
    text = re.sub(r"^(?:[-*]|\d+[.)])\s+", "", text).strip()
    if text.startswith("`") and text.endswith("`") and len(text) >= 2:
        text = text[1:-1].strip()
    if not text or text.lower().startswith("no "):
        return ""
    return text


def _work_packet_bullets(section: str) -> list[str]:
    values: list[str] = []
    for line in str(section or "").splitlines():
        item = _clean_work_packet_bullet(line)
        if item and item not in values:
            values.append(item)
    return values


def _parse_work_packet_counts(selected: str) -> dict[str, int]:
    match = re.search(
        r"(?P<items>\d+)\s*\((?P<artifacts>\d+)\s+artifacts?,\s*(?P<approvals>\d+)\s+approvals?\)",
        selected,
    )
    if not match:
        number = re.search(r"\d+", selected)
        return {
            "items": int(number.group(0)) if number else 0,
            "artifacts": 0,
            "approvals": 0,
        }
    return {
        "items": int(match.group("items")),
        "artifacts": int(match.group("artifacts")),
        "approvals": int(match.group("approvals")),
    }


def _parse_work_packet_markdown(content: str) -> dict[str, Any]:
    text = str(content or "").strip()[:64000]
    selected = _work_packet_line_value(text, "Selected items")
    return {
        "content": text,
        "generated": _work_packet_line_value(text, "Generated"),
        "selected": selected,
        "counts": _parse_work_packet_counts(selected),
        "artifactPaths": _work_packet_bullets(_work_packet_section(text, "Artifact Paths")),
        "replayCommands": _work_packet_bullets(_work_packet_section(text, "Replay Commands")),
    }


def _cache_work_packet(parsed: dict[str, Any]) -> None:
    artifact_items = [
        {
            "filePath": path,
            "label": path,
            "_replyCommand": f"/xd packet open #{index}",
        }
        for index, path in enumerate(parsed.get("artifactPaths") or [], start=1)
    ]
    replay_items = [
        {
            "command": command,
            "label": command,
            "_replyCommand": f"/xd packet replay #{index}",
        }
        for index, command in enumerate(parsed.get("replayCommands") or [], start=1)
    ]
    if artifact_items:
        _cache_selection("packet_artifacts", artifact_items)
    if replay_items:
        _cache_selection("packet_replay", replay_items)


def _format_work_packet(parsed: dict[str, Any]) -> str:
    _cache_work_packet(parsed)
    counts = parsed.get("counts") if isinstance(parsed.get("counts"), dict) else {}
    lines = ["Xenesis Desk Work Packet:"]
    generated = str(parsed.get("generated") or "").strip()
    selected = str(parsed.get("selected") or "").strip()
    if generated:
        lines.append(f"Generated: {generated}")
    if selected:
        lines.append(f"Selected items: {selected}")
    elif counts:
        lines.append(f"Selected items: {counts.get('items', 0)}")

    artifact_paths = parsed.get("artifactPaths") if isinstance(parsed.get("artifactPaths"), list) else []
    lines.extend(["", "Artifact paths:"])
    if artifact_paths:
        for index, path in enumerate(artifact_paths, start=1):
            lines.append(f"{index}. {path} -> /xd packet open #{index}")
    else:
        lines.append("No artifact paths.")

    replay_commands = parsed.get("replayCommands") if isinstance(parsed.get("replayCommands"), list) else []
    lines.extend(["", "Replay commands:"])
    if replay_commands:
        for index, command in enumerate(replay_commands, start=1):
            lines.append(f"{index}. {command} -> /xd packet replay #{index}")
    else:
        lines.append("No replay commands.")

    lines.extend([
        "",
        "Next:",
        "- /xd packet open #N",
        "- /xd packet replay #N",
    ])
    return "\n".join(lines)


def _packet_artifact_from_selector(selector: str) -> tuple[str, str]:
    item, error = _cached_selection("packet_artifacts", selector)
    if error:
        return "", "No cached Work Packet artifact for that selector. Run /xd packet <work-packet-markdown> first."
    file_path = str(item.get("filePath") or item.get("label") or "").strip()
    if not file_path:
        return "", "Cached Work Packet artifact has no file path. Run /xd packet <work-packet-markdown> again."
    return file_path, ""


def _packet_replay_from_selector(selector: str) -> tuple[str, str]:
    item, error = _cached_selection("packet_replay", selector)
    if error:
        return "", "No cached Work Packet replay command for that selector. Run /xd packet <work-packet-markdown> first."
    command = str(item.get("command") or item.get("label") or "").strip()
    if not command:
        return "", "Cached Work Packet replay item has no command. Run /xd packet <work-packet-markdown> again."
    return command, ""


def _run_work_packet_replay_command(command: str) -> str:
    text = str(command or "").strip()
    if not text:
        return "Usage: /xd packet replay #N"
    lowered = text.lower()
    if lowered == "/xd" or lowered == "xd":
        return handle_xd_command("")
    if lowered.startswith("/xd "):
        return handle_xd_command(text[4:].strip())
    if lowered.startswith("xd "):
        return handle_xd_command(text[3:].strip())
    return handle_xd_command(f"run {text}")


def _handle_packet_command(rest: str) -> str:
    subcommand, sub_rest = _first_word_and_rest(rest)
    if not subcommand:
        return "Usage: /xd packet <work-packet-markdown> | /xd packet open #N | /xd packet replay #N"
    if subcommand == "open":
        target = _strip_wrapping_quotes(sub_rest).strip()
        if not target:
            return "Usage: /xd packet open #N"
        file_path, error = _packet_artifact_from_selector(target)
        if error:
            return error
        return _format_open_file(_parse_json_result(handle_open_file({"filePath": file_path})))
    if subcommand == "replay":
        target = _strip_wrapping_quotes(sub_rest).strip()
        if not target:
            return "Usage: /xd packet replay #N"
        command, error = _packet_replay_from_selector(target)
        if error:
            return error
        return _run_work_packet_replay_command(command)

    content = str(rest or "").strip()
    if not _is_work_packet_text(content):
        return "Usage: /xd packet <work-packet-markdown> | /xd packet open #N | /xd packet replay #N"
    return _format_work_packet(_parse_work_packet_markdown(content))


def _format_desk_panels(result: dict[str, Any]) -> str:
    if not result.get("success", True):
        return _format_error(result)
    renderer = result.get("rendererState") if isinstance(result.get("rendererState"), dict) else {}
    contents = renderer.get("contents") if isinstance(renderer.get("contents"), list) else []
    panes = renderer.get("panes") if isinstance(renderer.get("panes"), list) else []
    active_pane_id = str(renderer.get("activePaneId") or "").strip()
    panes_by_id = {
        str(pane.get("id") or ""): pane
        for pane in panes
        if isinstance(pane, dict) and str(pane.get("id") or "")
    }

    normalized = []
    for content in contents:
        if not isinstance(content, dict):
            continue
        content_id = str(content.get("id") or content.get("contentId") or "").strip()
        if not content_id:
            continue
        pane_id = str(content.get("paneId") or "").strip()
        pane = panes_by_id.get(pane_id, {})
        pane_state = str(content.get("state") or pane.get("state") or "").strip()
        title = str(
            content.get("title")
            or content.get("fileName")
            or content.get("filePath")
            or content_id
        ).strip()
        content_type = str(content.get("contentType") or "").strip()
        is_active = (
            content_id == str(pane.get("activeContentId") or "").strip()
            or (pane_id and pane_id == active_pane_id)
        )
        normalized.append({
            "_selectionKind": "panels",
            "id": content_id,
            "contentId": content_id,
            "paneId": pane_id,
            "title": title,
            "contentType": content_type,
            "paneState": pane_state,
            "active": is_active,
        })

    _cache_selection("panels", normalized)
    if not normalized:
        return "No Xenesis Desk open tabs."

    lines = []
    for index, item in enumerate(normalized, start=1):
        title = item["title"]
        content_type = item["contentType"]
        pane_id = item["paneId"]
        pane_state = item["paneState"]
        type_text = f" [{content_type}]" if content_type else ""
        pane_parts = [part for part in (pane_id, pane_state) if part]
        if item["active"]:
            pane_parts.append("active")
        pane_text = f" ({', '.join(pane_parts)})" if pane_parts else ""
        lines.append(f"{index}. {title}{type_text}{pane_text} -> /xd focus #{index}")
    return "\n".join(lines)


def _format_bridge_panels(result: dict[str, Any]) -> str:
    if not result.get("success", True):
        return _format_error(result)
    panels = result.get("panels")
    if not isinstance(panels, list) or not panels:
        return "No Xenesis Desk bridge panels."
    normalized = []
    for panel in panels:
        if not isinstance(panel, dict):
            continue
        panel_id = str(panel.get("id") or "")
        if not panel_id:
            continue
        title = str(panel.get("title") or panel_id or "panel")
        placement = str(panel.get("placement") or "")
        normalized.append({
            "_selectionKind": "panels",
            "id": panel_id,
            "paneId": panel_id,
            "title": title,
            "placement": placement,
        })
    _cache_selection("panels", normalized)
    lines = []
    for index, panel in enumerate(normalized, start=1):
        panel_id = panel["id"]
        title = panel["title"]
        placement = panel["placement"]
        suffix = f" ({placement})" if placement else ""
        lines.append(f"{index}. {panel_id}: {title}{suffix} -> /xd focus #{index}")
    return "\n".join(lines) if lines else "No Xenesis Desk bridge panels."


def _format_open_files(result: dict[str, Any]) -> str:
    if not result.get("success", True):
        return _format_error(result)
    open_files = result.get("openFiles")
    if not isinstance(open_files, list) or not open_files:
        return "No Xenesis Desk bridge-opened files."
    normalized = []
    for item in open_files:
        if not isinstance(item, dict):
            continue
        file_path = str(item.get("filePath") or "")
        content_id = str(item.get("contentId") or item.get("id") or "").strip()
        placement = str(item.get("placement") or "")
        label = file_path or content_id
        if label:
            normalized.append({
                "_selectionKind": "files",
                "id": content_id,
                "contentId": content_id,
                "filePath": file_path,
                "placement": placement,
                "label": label,
            })
    _cache_selection("files", normalized)
    lines = []
    for index, item in enumerate(normalized, start=1):
        label = item["label"]
        placement = item["placement"]
        suffix = f" ({placement})" if placement else ""
        lines.append(f"{index}. {label}{suffix} -> /xd focus #{index}")
    return "\n".join(lines) if lines else "No Xenesis Desk bridge-opened files."


def _format_recent_diagnostics(result: dict[str, Any]) -> str:
    if not result.get("success", True):
        return _format_error(result)
    diagnostics = result.get("diagnostics")
    if not isinstance(diagnostics, list) or not diagnostics:
        return "No recent Xenesis Desk diagnostics."
    lines = []
    for item in diagnostics:
        if not isinstance(item, dict):
            continue
        level = str(item.get("level") or "info")
        source = str(item.get("source") or "system")
        message = str(item.get("message") or "")
        lines.append(f"- [{level}] {source}: {message}")
    return "\n".join(lines) if lines else "No recent Xenesis Desk diagnostics."


def _format_dock_action(result: dict[str, Any], action: str) -> str:
    if not result.get("success", True):
        return _format_pending_action_error(result)
    if action == "focus":
        target = (
            result.get("focusedContentId")
            or result.get("focusedPaneId")
            or result.get("contentId")
            or result.get("paneId")
            or "dock target"
        )
        return str(result.get("message") or f"Focused Xenesis Desk target: {target}")

    closed = result.get("closedContentIds")
    if isinstance(closed, list) and closed:
        return str(result.get("message") or f"Closed {len(closed)} Xenesis Desk item(s).")
    target = result.get("contentId") or result.get("paneId") or "dock target"
    return str(result.get("message") or f"Closed Xenesis Desk target: {target}")


def _format_open_file(result: dict[str, Any]) -> str:
    if not result.get("success", True):
        return _format_error(result)
    file_path = str(result.get("filePath") or "")
    return f"Opened {file_path} in Xenesis Desk." if file_path else "Opened file in Xenesis Desk."


def _format_xcon_create(result: dict[str, Any]) -> str:
    if not result.get("success", True):
        return _format_pending_action_error(result)
    lines = [f"Created {result.get('filePath') or 'XCON Markdown file'}"]
    lines.append("Opened in Xenesis Desk." if result.get("opened") else "Not opened in Xenesis Desk.")
    if result.get("pdfPath"):
        lines.append(f"PDF: {result['pdfPath']}")
    if result.get("pdfError"):
        lines.append(f"PDF export error: {result['pdfError']}")
    if result.get("openError"):
        lines.append(f"Open error: {result['openError']}")
    return "\n".join(lines)


def _format_xcon_prompt(result: dict[str, Any]) -> str:
    if not result.get("success", True):
        return _format_error(result)
    kind = str(result.get("kind") or "markdown-xcon")
    files = result.get("files") if isinstance(result.get("files"), list) else []
    message = str(result.get("message") or result.get("prompt") or "").strip()
    lines = ["Xenesis Desk XCON prompt:", f"Kind: {kind}"]
    if files:
        lines.append("Files: " + ", ".join(str(item) for item in files))
    if message:
        lines.extend(["", message[:6000]])
    return "\n".join(lines)



def _format_playwright_result(result: dict[str, Any]) -> str:
    if not result.get("success", True):
        return _format_pending_action_error(result)
    artifacts = result.get("artifacts") if isinstance(result.get("artifacts"), list) else []
    screenshot_path = str(result.get("screenshotFilePath") or result.get("filePath") or "")
    trace_path = str(result.get("traceFilePath") or "")
    for artifact in artifacts:
        if not isinstance(artifact, dict):
            continue
        if artifact.get("type") == "screenshot" and not screenshot_path:
            screenshot_path = str(artifact.get("filePath") or "")
        if artifact.get("type") == "trace" and not trace_path:
            trace_path = str(artifact.get("filePath") or "")
    lines = []
    if result.get("url"):
        lines.append(f"URL: {result['url']}")
    actions = result.get("actions")
    if isinstance(actions, list):
        lines.append(f"Actions: {len(actions)}")
    if screenshot_path:
        lines.append(f"Screenshot: {screenshot_path}")
    if trace_path:
        lines.append(f"Trace: {trace_path}")
    if result.get("opened"):
        lines.append("Opened in Xenesis Desk.")
    elif result.get("openInDesk"):
        lines.append("Not opened in Xenesis Desk.")
    if result.get("openError"):
        lines.append(f"Open error: {result['openError']}")
    if not lines and result.get("message"):
        return str(result.get("message"))
    return "\n".join(lines) if lines else "Playwright request completed."

def _format_extension_commands(result: dict[str, Any]) -> str:
    if not result.get("success", True):
        return _format_error(result)
    commands = result.get("commands")
    if not isinstance(commands, list) or not commands:
        return "No Xenesis Desk extension commands."
    normalized = []
    for command in commands:
        if not isinstance(command, dict):
            continue
        command_id = str(command.get("id") or "")
        if not command_id:
            continue
        title = str(command.get("title") or command_id)
        enabled = command.get("enabled") is not False
        normalized.append({
            "id": command_id,
            "title": title,
            "enabled": enabled,
        })
    _cache_selection("extensions", normalized)
    lines = []
    for index, command in enumerate(normalized, start=1):
        command_id = command["id"]
        title = command["title"]
        disabled = "" if command.get("enabled") is not False else " (disabled)"
        lines.append(f"{index}. {command_id}: {title}{disabled} -> /xd exec #{index}")
    return "\n".join(lines) if lines else "No Xenesis Desk extension commands."


def _format_extension_run(result: dict[str, Any], fallback_id: str) -> str:
    if not result.get("success", True):
        return _format_pending_action_error(result)
    command_id = str(result.get("commandId") or fallback_id)
    return str(result.get("message") or f"Ran extension command: {command_id}")


def _format_command_palette(result: dict[str, Any]) -> str:
    if not result.get("success", True):
        return _format_error(result)
    commands = result.get("commands")
    if not isinstance(commands, list) or not commands:
        return "No Xenesis Desk command palette commands."
    normalized = []
    for command in commands:
        if not isinstance(command, dict):
            continue
        command_id = str(command.get("id") or "").strip()
        if not command_id:
            continue
        normalized.append({
            "id": command_id,
            "title": str(command.get("title") or command_id),
            "enabled": command.get("enabled") is not False,
            "source": str(command.get("source") or "extension"),
            "commandPalette": command.get("commandPalette") is True,
        })
    _cache_selection("commands", normalized)
    lines = []
    for index, command in enumerate(normalized, start=1):
        disabled = "" if command.get("enabled") is not False else " (disabled)"
        source = str(command.get("source") or "extension")
        lines.append(f"{index}. {command['id']}: {command['title']} [{source}]{disabled} -> /xd command #{index}")
    return "\n".join(lines) if lines else "No Xenesis Desk command palette commands."


def _format_command_palette_run(result: dict[str, Any], fallback_id: str) -> str:
    if not result.get("success", True):
        return _format_pending_action_error(result)
    command_id = str(result.get("commandId") or fallback_id)
    return f"Ran command palette command: {command_id}"


def _call_bridge(path_name: str, body: dict[str, Any]) -> dict[str, Any]:
    return _call_bridge_with_config(path_name, body, _read_bridge_config)

def _remove_approval_entry(approval_module: Any, session_key: str, entry: Any) -> None:
    with approval_module._lock:
        queue = approval_module._gateway_queues.get(session_key, [])
        if entry in queue:
            queue.remove(entry)
        if not queue:
            approval_module._gateway_queues.pop(session_key, None)


def _fire_approval_hook_if_available(approval_module: Any, hook_name: str, **kwargs: Any) -> None:
    fire = getattr(approval_module, "_fire_approval_hook", None)
    if callable(fire):
        fire(hook_name, **kwargs)


def _approval_ui(title: str) -> dict[str, Any]:
    return {
        "title": title,
        "subject_label": "Request",
        "reason_label": "Details",
        "choices": ["once", "deny"],
        "button_labels": {
            "once": "Approve",
            "deny": "Deny",
        },
    }


def _require_mobile_action_approval(
    *,
    action: str,
    description: str,
    pattern_key: str,
    approval_ui: dict[str, Any] | None = None,
    timeout_seconds: int | None = None,
) -> bool:
    if _ACTION_APPROVAL_BYPASS:
        return True

    from tools import approval

    session_key = approval.get_current_session_key(default="")
    if not session_key:
        return False

    with approval._lock:
        notify_cb = approval._gateway_notify_cbs.get(session_key)
    if notify_cb is None:
        return False

    approval_data = {
        "command": action,
        "pattern_key": pattern_key,
        "pattern_keys": [pattern_key],
        "description": description,
    }
    if approval_ui:
        approval_data["approval_ui"] = approval_ui
    entry = approval._ApprovalEntry(approval_data)
    with approval._lock:
        approval._gateway_queues.setdefault(session_key, []).append(entry)

    _fire_approval_hook_if_available(
        approval,
        "pre_approval_request",
        command=approval_data["command"],
        description=approval_data["description"],
        pattern_key=pattern_key,
        pattern_keys=[pattern_key],
        approval_ui=approval_data.get("approval_ui"),
        session_key=session_key,
        surface="gateway",
    )

    try:
        notify_cb(approval_data)
    except Exception:
        _remove_approval_entry(approval, session_key, entry)
        return False

    timeout = APPROVAL_TIMEOUT_SECONDS if timeout_seconds is None else max(timeout_seconds, 0)
    deadline = time.monotonic() + timeout
    resolved = False
    while True:
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            break
        if entry.event.wait(timeout=min(1.0, remaining)):
            resolved = True
            break

    _remove_approval_entry(approval, session_key, entry)
    choice = entry.result if resolved else "timeout"

    _fire_approval_hook_if_available(
        approval,
        "post_approval_response",
        command=approval_data["command"],
        description=approval_data["description"],
        pattern_key=pattern_key,
        pattern_keys=[pattern_key],
        approval_ui=approval_data.get("approval_ui"),
        session_key=session_key,
        surface="gateway",
        choice=choice,
    )

    return choice in {"once", "session", "always"}


def _mobile_approval_notify_available() -> bool:
    try:
        from tools import approval

        session_key = approval.get_current_session_key(default="")
        if not session_key:
            return False
        with approval._lock:
            return approval._gateway_notify_cbs.get(session_key) is not None
    except Exception:
        return False


def _cache_terminal_run_action(command: str, cwd: str | None, shell: str | None) -> str:
    parts = ["run", command]
    action = {
        "id": "terminal-run",
        "label": "Run terminal command",
        "command": " ".join(part for part in parts if part).strip(),
        "kind": "terminal.run",
        "requiresApproval": True,
        "value": command,
    }
    if cwd:
        action["cwd"] = cwd
    if shell:
        action["shell"] = shell
    return _cache_context_action_token(action, 0)


def _cache_pending_command_action(*, label: str, command: str, kind: str, value: str = "") -> str:
    action = {
        "id": kind.replace(".", "-"),
        "label": label,
        "command": command,
        "kind": kind,
        "requiresApproval": True,
        "value": value or command,
    }
    return _cache_context_action_token(action, 0)


def _cache_xcon_markdown_action(args: dict[str, Any], title: str) -> str:
    prompt = str(args.get("prompt") or "").strip()
    if not prompt:
        return ""
    return _cache_pending_command_action(
        label="Create XCON Markdown",
        command=f"xcon {prompt}",
        kind="xcon.markdown.create",
        value=title,
    )


def _approval_description(command: str, cwd: str | None, shell: str | None) -> str:
    lines = [
        "Xenesis Desk mobile terminal execution request.",
        f"Command: {command}",
    ]
    if cwd:
        lines.append(f"CWD: {cwd}")
    if shell:
        lines.append(f"Shell: {shell}")
    lines.append("Approval applies only to this pending Xenesis Desk request.")
    return "\n".join(lines)


def _require_mobile_approval(
    *,
    command: str,
    cwd: str | None,
    shell: str | None,
    timeout_seconds: int | None = None,
) -> bool:
    return _require_mobile_action_approval(
        action=f"Xenesis Desk terminal: {command}",
        description=_approval_description(command, cwd, shell),
        pattern_key=APPROVAL_PATTERN_KEY,
        approval_ui=_approval_ui("Xenesis Desk Terminal Approval"),
        timeout_seconds=timeout_seconds,
    )


def _call_xenesis_desk_xcon_tool(tool_name: str, args: dict[str, Any]) -> dict[str, Any]:
    bridge_path = _xcon_bridge_path(tool_name)
    if bridge_path:
        try:
            payload = _call_bridge(bridge_path, args)
            if isinstance(payload, dict):
                payload.setdefault("tool", tool_name)
                payload.setdefault("success", bool(payload.get("ok", True)))
                return payload
        except HTTPError as exc:
            response = getattr(exc, "response", None)
            if getattr(response, "status_code", None) != 404:
                message = str(exc)
                try:
                    message = response.text.strip() or message
                except Exception:
                    pass
                return {"success": False, "ok": False, "error": message}
        except Exception:
            pass
    return _call_xenesis_desk_mcp_tool(tool_name, args)


def handle_terminal_preview(args: dict[str, Any], **_: Any) -> str:
    command = str(args.get("command") or "").strip()
    if not command:
        return _json_error("command is required")
    body = _payload(args, ("command", "cwd", "shell"))
    try:
        return _json_result(_call_bridge("/terminal/preview", body))
    except Exception as exc:
        return _json_error(str(exc))


def handle_terminal_run(args: dict[str, Any], **_: Any) -> str:
    command = str(args.get("command") or "").strip()
    if not command:
        return _json_error("command is required")

    cwd = args.get("cwd")
    shell = args.get("shell")
    cwd_text = str(cwd) if cwd is not None else None
    shell_text = str(shell) if shell is not None else None
    if not _ACTION_APPROVAL_BYPASS:
        if not _mobile_approval_notify_available():
            token = _cache_terminal_run_action(command, cwd_text, shell_text)
            return _json_error(
                "Mobile approval unavailable for Xenesis Desk terminal run",
                blocked=True,
                actionToken=token,
                actionCommand=f"/xd action {token}",
            )
        approved = _require_mobile_approval(
            command=command,
            cwd=cwd_text,
            shell=shell_text,
        )
        if not approved:
            return _json_error(
                "Mobile approval denied for Xenesis Desk terminal run",
                blocked=True,
            )

    body = _payload(args, ("command", "cwd", "shell", "id", "cols", "rows"))
    try:
        return _json_result(_call_bridge("/terminal/run", body))
    except Exception as exc:
        return _json_error(str(exc))


def handle_terminal_tail(args: dict[str, Any], **_: Any) -> str:
    session_id = str(args.get("id") or "").strip()
    if not session_id:
        return _json_error("id is required")
    body = _payload(args, ("id", "maxBytes"))
    try:
        return _json_result(_call_bridge("/terminal/tail", body))
    except Exception as exc:
        return _json_error(str(exc))


def handle_terminal_stop(args: dict[str, Any], **_: Any) -> str:
    session_id = str(args.get("id") or "").strip()
    if not session_id:
        return _json_error("id is required")
    try:
        return _json_result(_call_bridge("/terminal/stop", {"id": session_id}))
    except Exception as exc:
        return _json_error(str(exc))


def handle_terminal_list(args: dict[str, Any] | None = None, **_: Any) -> str:
    try:
        return _json_result(_call_bridge("/terminal/list", {}))
    except Exception as exc:
        return _json_error(str(exc))


def handle_state(args: dict[str, Any] | None = None, **_: Any) -> str:
    try:
        return _json_result(_call_bridge("/state", {}))
    except Exception as exc:
        return _json_error(str(exc))


def handle_active_context(args: dict[str, Any] | None = None, **_: Any) -> str:
    try:
        return _json_result(_call_bridge("/active-context", {}))
    except Exception as exc:
        return _json_error(str(exc))


def handle_context_actions(args: dict[str, Any] | None = None, **_: Any) -> str:
    try:
        payload = _call_bridge("/context-actions", {})
        actions = _normalize_context_actions(payload.get("actions"))
        return _json_result({
            **payload,
            "actions": actions,
            "mobileActionButtons": _mobile_action_buttons(actions),
        })
    except Exception as exc:
        return _json_error(str(exc))


def handle_list_panels(args: dict[str, Any] | None = None, **_: Any) -> str:
    try:
        return _json_result(_call_bridge("/panels/list", {}))
    except Exception as exc:
        return _json_error(str(exc))


def handle_list_open_files(args: dict[str, Any] | None = None, **_: Any) -> str:
    try:
        return _json_result(_call_bridge("/files/open", {}))
    except Exception as exc:
        return _json_error(str(exc))


def _normalize_limit(value: Any, default: int = 20, maximum: int = 100) -> int:
    try:
        number = int(value)
    except (TypeError, ValueError):
        return default
    return min(max(number, 1), maximum)


def _dock_target_payload(args: dict[str, Any]) -> dict[str, Any]:
    content_id = str(args.get("contentId") or "").strip()
    pane_id = str(args.get("paneId") or "").strip()
    payload: dict[str, Any] = {}
    if content_id:
        payload["contentId"] = content_id
    if pane_id:
        payload["paneId"] = pane_id
    return payload


def _dock_target_from_text(value: str) -> dict[str, Any]:
    target = _strip_wrapping_quotes(value).strip()
    if not target:
        return {}
    if target.lower().startswith("pane:"):
        pane_id = target.split(":", 1)[1].strip()
        return {"paneId": pane_id} if pane_id else {}
    if target.lower().startswith("content:"):
        content_id = target.split(":", 1)[1].strip()
        return {"contentId": content_id} if content_id else {}
    return {"paneId": target} if target.startswith("pane-") else {"contentId": target}


def _terminal_id_from_text(value: str) -> tuple[str, str]:
    target = _strip_wrapping_quotes(value).strip()
    if _selector_index(target) is None:
        return target, ""
    item, error = _cached_selection("terminals", target)
    if error:
        return "", error
    session_id = str(item.get("id") or "").strip()
    if not session_id:
        return "", f"Cached Xenesis Desk terminal selection {target} has no id. Run /xd terminals first."
    return session_id, ""


def _extension_id_from_text(value: str) -> tuple[str, str]:
    target = _strip_wrapping_quotes(value).strip()
    if _selector_index(target) is None:
        return target, ""
    item, error = _cached_selection("extensions", target)
    if error:
        return "", error
    command_id = str(item.get("id") or "").strip()
    if not command_id:
        return "", f"Cached Xenesis Desk extension selection {target} has no id. Run /xd extensions first."
    return command_id, ""


def _command_palette_id_from_text(value: str) -> tuple[str, str]:
    target = _strip_wrapping_quotes(value).strip()
    if _selector_index(target) is None:
        return target, ""
    item, error = _cached_selection("commands", target)
    if error:
        return "", error
    command_id = str(item.get("id") or "").strip()
    if not command_id:
        return "", f"Cached Xenesis Desk command palette selection {target} has no id. Run /xd commands first."
    return command_id, ""


def _context_action_from_selector(value: str) -> tuple[dict[str, Any], str]:
    target = _strip_wrapping_quotes(value).strip()
    item, error = _cached_selection("context_actions", target)
    if error:
        return {}, error.replace("Run /xd context_actions first.", "Run /xd context-actions first.")
    command = str(item.get("command") or "").strip()
    if not command:
        return {}, f"Cached Xenesis Desk context action {target} has no command. Run /xd context-actions first."
    return item, ""


def _refresh_dock_selection_from_bridge(selector: str) -> tuple[dict[str, Any], str]:
    index = _selector_index(selector)
    if index is None:
        return {}, ""

    global_bucket = _SELECTION_CACHE.get(GLOBAL_DOCK_SELECTION_KEY, {})
    last_kind = str(global_bucket.get("last_kind") or "") if isinstance(global_bucket, dict) else ""
    ordered_kinds = []
    if last_kind in DOCK_SELECTION_KINDS:
        ordered_kinds.append(last_kind)
    ordered_kinds.extend(kind for kind in ("files", "panels") if kind not in ordered_kinds)

    for kind in ordered_kinds:
        if kind == "files":
            _format_open_files(_parse_json_result(handle_list_open_files({})))
        else:
            _format_desk_panels(_parse_json_result(handle_state({})))
        item, _ = _cached_selection(kind, selector)
        if item:
            return item, ""

    return {}, f"No Xenesis Desk dock selection for {selector}. Run /xd panels or /xd files first."


def _dock_target_from_selector(value: str) -> tuple[dict[str, Any], str]:
    target = _strip_wrapping_quotes(value).strip()
    if _selector_index(target) is None:
        return _dock_target_from_text(target), ""
    item, error = _cached_dock_selection(target)
    if error:
        item, error = _refresh_dock_selection_from_bridge(target)
        if error:
            return {}, error
    content_id = str(item.get("contentId") or "").strip()
    if content_id:
        return {"contentId": content_id}, ""
    kind = str(item.get("_selectionKind") or "")
    if kind == "panels":
        pane_id = str(item.get("paneId") or item.get("id") or "").strip()
        if pane_id:
            return {"paneId": pane_id}, ""
        return {}, f"Cached Xenesis Desk panel selection {target} has no pane id. Run /xd panels first."

    content_id = str(item.get("contentId") or item.get("id") or "").strip()
    if content_id:
        return {"contentId": content_id}, ""
    file_path = str(item.get("filePath") or "").strip()
    if file_path:
        return {"contentId": file_path}, ""
    return {}, f"Cached Xenesis Desk file selection {target} has no content id. Run /xd files first."


def handle_recent_diagnostics(args: dict[str, Any] | None = None, **_: Any) -> str:
    args = args or {}
    try:
        return _json_result(_call_bridge(
            "/diagnostics/recent",
            {"limit": _normalize_limit(args.get("limit"))},
        ))
    except Exception as exc:
        return _json_error(str(exc))


def handle_focus_content(args: dict[str, Any], **_: Any) -> str:
    payload = _dock_target_payload(args)
    if not payload:
        return _json_error("contentId or paneId is required")
    try:
        return _json_result(_call_bridge("/dock/focus", payload))
    except Exception as exc:
        return _json_error(str(exc))


def _dock_close_approval_description(payload: dict[str, Any]) -> str:
    lines = ["Xenesis Desk dock close request."]
    if payload.get("contentId"):
        lines.append(f"Content id: {payload['contentId']}")
    if payload.get("paneId"):
        lines.append(f"Pane id: {payload['paneId']}")
    lines.append("Approval applies only to this pending Xenesis Desk request.")
    return "\n".join(lines)


def handle_close_content(args: dict[str, Any], **_: Any) -> str:
    payload = _dock_target_payload(args)
    if not payload:
        return _json_error("contentId or paneId is required")

    approved = _require_mobile_action_approval(
        action=f"Xenesis Desk dock close: {payload.get('contentId') or payload.get('paneId')}",
        description=_dock_close_approval_description(payload),
        pattern_key=DOCK_CLOSE_APPROVAL_PATTERN_KEY,
        approval_ui=_approval_ui("Xenesis Desk Dock Close Approval"),
    )
    if not approved:
        if not _mobile_approval_notify_available():
            target = str(payload.get("contentId") or payload.get("paneId") or "").strip()
            command_target = f"content:{payload['contentId']}" if payload.get("contentId") else f"pane:{payload['paneId']}"
            token = _cache_pending_command_action(
                label="Close Xenesis Desk dock target",
                command=f"close {command_target}",
                kind="dock.close",
                value=target,
            )
            return _json_error(
                "Mobile approval unavailable for Xenesis Desk dock close",
                blocked=True,
                actionToken=token,
                actionCommand=f"/xd action {token}",
            )
        return _json_error(
            "Mobile approval denied or unavailable for Xenesis Desk dock close",
            blocked=True,
        )

    try:
        return _json_result(_call_bridge("/dock/close", payload))
    except Exception as exc:
        return _json_error(str(exc))


def handle_open_file(args: dict[str, Any], **_: Any) -> str:
    raw_file_path = str(args.get("filePath") or "").strip()
    if not raw_file_path:
        return _json_error("filePath is required")
    if not _is_bridge_absolute_file_path(raw_file_path):
        return _json_error("filePath must be an absolute path")
    file_path = Path(raw_file_path)
    if not (_is_windows_absolute_path(raw_file_path) or _is_wsl_mount_path(raw_file_path)) and not file_path.exists():
        return _json_error(f"file does not exist: {file_path}")

    resolved = _resolve_file_path_for_bridge(raw_file_path)
    try:
        payload = _call_bridge("/open-file", _bridge_open_file_payload(resolved, args))
        return _json_result({"ok": payload.get("ok", True), "opened": True, "filePath": resolved, **payload})
    except Exception as exc:
        return _json_error(str(exc))


def handle_get_xcon_prompt(args: dict[str, Any] | None = None, **_: Any) -> str:
    args = args or {}
    kind = str(args.get("kind") or "markdown-xcon").strip() or "markdown-xcon"
    if kind not in XCON_PROMPT_KINDS:
        return _json_error(
            "Invalid Xenesis Desk XCON prompt kind: "
            f"{kind}. Expected one of: {', '.join(sorted(XCON_PROMPT_KINDS))}"
        )

    payload: dict[str, Any] = {"kind": kind}
    for key in ("task", "brief", "audience"):
        value = str(args.get(key) or "").strip()
        if value:
            payload[key] = value
    return _json_result(_call_xenesis_desk_xcon_tool(
        "xenesis_desk_get_xcon_prompt",
        payload,
    ))


def handle_validate_xcon_markdown(args: dict[str, Any], **_: Any) -> str:
    content = str(args.get("content") or "")
    if not content.strip():
        return _json_error("content is required", ok=False, errors=["content is required"])
    return _json_result(_call_xenesis_desk_xcon_tool(
        "xenesis_desk_validate_xcon_markdown",
        {"content": content},
    ))


def _create_xcon_markdown_from_content(args: dict[str, Any], content: str, title: str) -> str:
    validation = _call_xenesis_desk_xcon_tool(
        "xenesis_desk_validate_xcon_markdown",
        {"content": content},
    )
    if validation.get("success") is False or validation.get("ok") is False:
        return _json_result(validation)

    file_path = _xcon_requested_file_path(args, title)
    approved = _require_mobile_action_approval(
        action=f"Xenesis Desk XCON Markdown: {file_path}",
        description=_xcon_approval_description(file_path, title, validation),
        pattern_key=XCON_APPROVAL_PATTERN_KEY,
        approval_ui=_approval_ui("Xenesis Desk XCON Approval"),
    )
    if not approved:
        if not _mobile_approval_notify_available():
            token = _cache_xcon_markdown_action(args, title)
            if token:
                return _json_error(
                    "Mobile approval unavailable for Xenesis Desk XCON Markdown creation",
                    blocked=True,
                    actionToken=token,
                    actionCommand=f"/xd action {token}",
                )
        return _json_error(
            "Mobile approval denied or unavailable for Xenesis Desk XCON Markdown creation",
            blocked=True,
        )

    payload_args = dict(args)
    payload_args["content"] = content
    payload_args["title"] = title
    return _json_result(_call_xenesis_desk_xcon_tool(
        "xenesis_desk_create_xcon_markdown_from_content",
        payload_args,
    ))


def _create_xcon_markdown_from_prompt(args: dict[str, Any], title: str, mode: str) -> str:
    file_path = _xcon_requested_file_path(args, title)
    validation = {"ok": True, "fenceCount": 1}
    approved = _require_mobile_action_approval(
        action=f"Xenesis Desk XCON Markdown: {file_path}",
        description=_xcon_approval_description(file_path, title, validation),
        pattern_key=XCON_APPROVAL_PATTERN_KEY,
        approval_ui=_approval_ui("Xenesis Desk XCON Approval"),
    )
    if not approved:
        if not _mobile_approval_notify_available():
            token = _cache_xcon_markdown_action(args, title)
            if token:
                return _json_error(
                    "Mobile approval unavailable for Xenesis Desk XCON Markdown creation",
                    blocked=True,
                    actionToken=token,
                    actionCommand=f"/xd action {token}",
                )
        return _json_error(
            "Mobile approval denied or unavailable for Xenesis Desk XCON Markdown creation",
            blocked=True,
        )

    payload_args = dict(args)
    payload_args["title"] = title
    payload_args["mode"] = mode
    return _json_result(_call_xenesis_desk_xcon_tool(
        "xenesis_desk_create_xcon_markdown",
        payload_args,
    ))


def handle_create_xcon_markdown_from_content(args: dict[str, Any], **_: Any) -> str:
    content = str(args.get("content") or "")
    if not content.strip():
        return _json_error("content is required")
    title = _normalize_title(
        args.get("title"),
        _markdown_title_from_content(content) or "XCON/SKETCH Document",
    )
    return _create_xcon_markdown_from_content(args, content, title)


def handle_create_xcon_markdown(args: dict[str, Any], **_: Any) -> str:
    prompt = str(args.get("prompt") or "").strip()
    if not prompt:
        return _json_error("prompt is required")
    title = _normalize_title(args.get("title"), prompt[:80])
    mode = _normalize_mode(args.get("mode"))
    return _create_xcon_markdown_from_prompt(args, title, mode)


def handle_export_xcon_pdf(args: dict[str, Any], **_: Any) -> str:
    raw_file_path = str(args.get("filePath") or "").strip()
    if not raw_file_path:
        return _json_error("filePath is required")
    if not _is_bridge_absolute_file_path(raw_file_path):
        return _json_error("filePath must be an absolute path")
    body = _payload(args, ("filePath", "title", "pdfFileName", "pdfOutDir"))
    return _json_result(_call_xenesis_desk_xcon_tool(
        "xenesis_desk_export_xcon_pdf",
        body,
    ))



def _playwright_approval_description(tool_name: str, args: dict[str, Any]) -> str:
    lines = ["Xenesis Desk Playwright browser automation request.", f"Tool: {tool_name}"]
    if args.get("url"):
        lines.append(f"URL: {args['url']}")
    actions = args.get("actions")
    if isinstance(actions, list):
        lines.append(f"Actions: {len(actions)}")
    if args.get("selector"):
        lines.append(f"Selector: {args['selector']}")
    if args.get("screenshot"):
        lines.append("Final screenshot: yes")
    if args.get("trace"):
        lines.append("Trace: yes")
    lines.append("Approval applies only to this pending Xenesis Desk request.")
    return "\n".join(lines)


def _cache_playwright_action(tool_name: str, args: dict[str, Any]) -> str:
    command = "pw-json " + json.dumps({"tool": tool_name, "args": args}, ensure_ascii=False, separators=(",", ":"))
    return _cache_pending_command_action(
        label="Run Playwright automation",
        command=command,
        kind="playwright.run",
        value=str(args.get("url") or tool_name),
    )


def _playwright_bridge_path(tool_name: str) -> str:
    if tool_name == "xenesis_desk_playwright_snapshot":
        return "/playwright/snapshot"
    if tool_name == "xenesis_desk_playwright_run":
        return "/playwright/run"
    return ""


def _call_xenesis_desk_playwright_tool(tool_name: str, args: dict[str, Any]) -> dict[str, Any]:
    bridge_path = _playwright_bridge_path(tool_name)
    if bridge_path:
        try:
            payload = _call_bridge(bridge_path, args)
            if isinstance(payload, dict):
                payload.setdefault("tool", tool_name)
                payload.setdefault("success", bool(payload.get("ok", True)))
                return payload
        except HTTPError as exc:
            response = getattr(exc, "response", None)
            if getattr(response, "status_code", None) != 404:
                message = str(exc)
                try:
                    message = response.text.strip() or message
                except Exception:
                    pass
                return {"success": False, "error": message}
        except Exception:
            pass
    return _call_xenesis_desk_mcp_tool(tool_name, args)


def _run_playwright_tool(tool_name: str, args: dict[str, Any]) -> str:
    if not str(args.get("url") or "").strip():
        return _json_error("url is required")
    if not _ACTION_APPROVAL_BYPASS:
        if not _mobile_approval_notify_available():
            token = _cache_playwright_action(tool_name, args)
            return _json_error(
                "Mobile approval unavailable for Xenesis Desk Playwright request",
                blocked=True,
                actionToken=token,
                actionCommand=f"/xd action {token}",
            )
        approved = _require_mobile_action_approval(
            action=f"Xenesis Desk Playwright: {args.get('url') or tool_name}",
            description=_playwright_approval_description(tool_name, args),
            pattern_key=PLAYWRIGHT_APPROVAL_PATTERN_KEY,
            approval_ui=_approval_ui("Xenesis Desk Playwright Approval"),
            timeout_seconds=APPROVAL_TIMEOUT_SECONDS,
        )
        if not approved:
            return _json_error("Mobile approval denied for Xenesis Desk Playwright request", blocked=True)
    return _json_result(_call_xenesis_desk_playwright_tool(tool_name, args))


def handle_playwright_snapshot(args: dict[str, Any], **_: Any) -> str:
    return _run_playwright_tool("xenesis_desk_playwright_snapshot", dict(args))


def handle_playwright_run(args: dict[str, Any], **_: Any) -> str:
    actions = args.get("actions")
    if not isinstance(actions, list) or not actions:
        return _json_error("actions must contain at least one action")
    return _run_playwright_tool("xenesis_desk_playwright_run", dict(args))

def _normalize_extension_commands(value: Any, include_disabled: bool) -> list[dict[str, Any]]:
    commands = value if isinstance(value, list) else []
    normalized = []
    for item in commands:
        if not isinstance(item, dict):
            continue
        enabled = item.get("enabled") is not False
        if not include_disabled and not enabled:
            continue
        command_id = str(item.get("id") or "").strip()
        if not command_id:
            continue
        normalized.append({
            "id": command_id,
            "title": str(item.get("title") or command_id),
            "category": item.get("category") if isinstance(item.get("category"), str) else None,
            "extensionId": str(item.get("extensionId") or ""),
            "extensionName": str(item.get("extensionName") or ""),
            "enabled": enabled,
            "source": item.get("source") if isinstance(item.get("source"), str) else None,
            "commandPalette": item.get("commandPalette") is True,
            "menuLocations": [
                str(location)
                for location in item.get("menuLocations", [])
                if isinstance(location, str)
            ] if isinstance(item.get("menuLocations"), list) else [],
        })
    return normalized


def handle_list_extension_commands(args: dict[str, Any] | None = None, **_: Any) -> str:
    args = args or {}
    include_disabled = args.get("includeDisabled") is True
    try:
        payload = _call_bridge("/extension-commands", {})
        commands = _normalize_extension_commands(payload.get("commands"), include_disabled)
        return _json_result({"ok": payload.get("ok", True), "commands": commands})
    except Exception as exc:
        return _json_error(str(exc))


def handle_command_palette(args: dict[str, Any] | None = None, **_: Any) -> str:
    args = args or {}
    include_disabled = args.get("includeDisabled") is True
    payload: dict[str, Any] = {"includeDisabled": include_disabled}
    query = str(args.get("query") or "").strip()
    if query:
        payload["query"] = query
    try:
        result = _call_bridge("/command-palette", payload)
        commands = _normalize_extension_commands(result.get("commands"), include_disabled)
        return _json_result({"ok": result.get("ok", True), "query": result.get("query", query), "commands": commands})
    except Exception as exc:
        return _json_error(str(exc))


def handle_run_command_palette(args: dict[str, Any], **_: Any) -> str:
    command_id = str(args.get("commandId") or "").strip()
    if not command_id:
        return _json_error("commandId is required")
    panel_placement = _normalize_placement(args.get("panelPlacement"))
    description_lines = [
        "Xenesis Desk command palette execution request.",
        f"Command id: {command_id}",
    ]
    if panel_placement:
        description_lines.append(f"Panel placement: {panel_placement}")
    description_lines.append("Approval applies only to this pending Xenesis Desk request.")
    approved = _require_mobile_action_approval(
        action=f"Xenesis Desk command palette: {command_id}",
        description="\n".join(description_lines),
        pattern_key=EXTENSION_APPROVAL_PATTERN_KEY,
        approval_ui=_approval_ui("Xenesis Desk Command Approval"),
    )
    if not approved:
        if not _mobile_approval_notify_available():
            command = f"command {command_id}{f' {panel_placement}' if panel_placement else ''}"
            token = _cache_pending_command_action(
                label="Run Xenesis Desk command palette command",
                command=command,
                kind="command.palette.run",
                value=command_id,
            )
            return _json_error(
                "Mobile approval unavailable for Xenesis Desk command palette command",
                blocked=True,
                actionToken=token,
                actionCommand=f"/xd action {token}",
            )
        return _json_error(
            "Mobile approval denied or unavailable for Xenesis Desk command palette command",
            blocked=True,
        )

    payload = {"commandId": command_id}
    if panel_placement:
        payload["panelPlacement"] = panel_placement
    try:
        return _json_result(_call_bridge("/command-palette/run", payload))
    except Exception as exc:
        return _json_error(str(exc))


def handle_run_extension_command(args: dict[str, Any], **_: Any) -> str:
    command_id = str(args.get("commandId") or "").strip()
    if not command_id:
        return _json_error("commandId is required")
    panel_placement = _normalize_placement(args.get("panelPlacement"))
    description_lines = [
        "Xenesis Desk extension command execution request.",
        f"Command id: {command_id}",
    ]
    if panel_placement:
        description_lines.append(f"Panel placement: {panel_placement}")
    description_lines.append("Approval applies only to this pending Xenesis Desk request.")
    approved = _require_mobile_action_approval(
        action=f"Xenesis Desk extension command: {command_id}",
        description="\n".join(description_lines),
        pattern_key=EXTENSION_APPROVAL_PATTERN_KEY,
        approval_ui=_approval_ui("Xenesis Desk Extension Approval"),
    )
    if not approved:
        if not _mobile_approval_notify_available():
            command = f"exec {command_id}{f' {panel_placement}' if panel_placement else ''}"
            token = _cache_pending_command_action(
                label="Run Xenesis Desk extension command",
                command=command,
                kind="extension.command.run",
                value=command_id,
            )
            return _json_error(
                "Mobile approval unavailable for Xenesis Desk extension command",
                blocked=True,
                actionToken=token,
                actionCommand=f"/xd action {token}",
            )
        return _json_error(
            "Mobile approval denied or unavailable for Xenesis Desk extension command",
            blocked=True,
        )

    payload = {"commandId": command_id}
    if panel_placement:
        payload["panelPlacement"] = panel_placement
    try:
        return _json_result(_call_bridge("/run-extension-command", payload))
    except Exception as exc:
        return _json_error(str(exc))


def _action_token_from_callback_text(value: str) -> str:
    text = str(value or "").strip()
    if not text:
        return ""
    match = ACTION_CALLBACK_RE.match(text)
    if match:
        return match.group(1)
    try:
        parsed = json.loads(text)
    except Exception:
        parsed = None
    if isinstance(parsed, dict) and parsed.get("type") == "xenesis_desk_action":
        token = str(parsed.get("token") or "").strip()
        return token
    return ""


def _normalize_callback_xd_command(value: str) -> str:
    command = _strip_wrapping_quotes(str(value or "")).strip()
    if command.startswith("/xd"):
        return command if command == "/xd" or command.startswith("/xd ") else ""
    if command.startswith("$xd"):
        return f"/xd{command[3:]}" if command == "$xd" or command.startswith("$xd ") else ""
    if command == "xd" or command.startswith("xd "):
        return f"/{command}"
    return ""


def _xd_command_from_callback_text(value: str) -> str:
    text = str(value or "").strip()
    if not text:
        return ""
    match = ACTION_COMMAND_CALLBACK_RE.match(text)
    if match:
        return _normalize_callback_xd_command(match.group(1))
    try:
        parsed = json.loads(text)
    except Exception:
        parsed = None
    if isinstance(parsed, dict) and parsed.get("type") == "xenesis_desk_command":
        return _normalize_callback_xd_command(str(parsed.get("command") or ""))
    return ""


def _event_platform_value(event: Any) -> str:
    source = getattr(event, "source", None)
    platform = getattr(source, "platform", "")
    return str(getattr(platform, "value", platform) or "").strip()


def _event_raw_message(event: Any) -> dict[str, Any]:
    raw = getattr(event, "raw_message", None)
    return raw if isinstance(raw, dict) else {}


def _event_xenesis_desk_metadata(event: Any) -> dict[str, Any]:
    raw = _event_raw_message(event)
    for key in ("xenesis_desk", "xd", "xenis"):
        value = raw.get(key)
        if isinstance(value, dict):
            return value
    return {}


def _is_visual_cockpit_bot_event(event: Any) -> bool:
    xenesis_desk = _event_xenesis_desk_metadata(event)
    mode = str(xenesis_desk.get("mode") or "").strip().lower()
    surface = str(xenesis_desk.get("surface") or "").strip().lower()
    return (
        _event_platform_value(event) == "xenesis_desk_bot"
        or mode == "visual-cockpit"
        or (surface == "bot" and bool(xenesis_desk))
    )


def _is_work_packet_bot_event(event: Any, text: str) -> bool:
    if not _is_work_packet_text(text):
        return False
    xenesis_desk = _event_xenesis_desk_metadata(event)
    mode = str(xenesis_desk.get("mode") or "").strip().lower()
    surface = str(xenesis_desk.get("surface") or "").strip().lower()
    return (
        _event_platform_value(event) == "xenesis_desk_bot"
        or mode in {"work-packet", "work-packet-history"}
        or surface in {"timeline", "work-packet"}
    )


def _visual_cockpit_prompt(text: str) -> str:
    return "\n".join([
        "Xenesis Bot visual cockpit request.",
        "",
        "Original user request:",
        text,
        "",
        "Use the Xenesis Desk integration through the Hermes xenesis_desk_gateway plugin:",
        "- When current Desk state matters, call `xenesis_desk_mobile_active_context` first.",
        "- For XCON/SKETCH, dashboard, workflow, or Markdown artifacts, call `xenesis_desk_mobile_get_xcon_prompt` before drafting.",
        "- After drafting Markdown with XCON/SKETCH fences, call `xenesis_desk_mobile_validate_xcon_markdown`.",
        "- Save completed artifacts with `xenesis_desk_mobile_create_xcon_markdown_from_content`; set `openInDesk` to false unless the user explicitly asks to open a separate Xenesis Desk pane or window.",
        "- For Xenesis Bot responses, include the generated Markdown with XCON/SKETCH fences in the final Bot answer so it renders inline in the chat surface.",
        "- Prefer semantic data components when the request contains structured data. Do not emulate tables, charts, maps, or relationship diagrams with labels when XCON components exist for that job.",
        "- Use `spanGrid` for table-like rankings, standings, schedules, inventories, ledgers, and comparison rows.",
        "- Use `chart` for comparative values, trends, forecasts, distributions, scorecards, rankings, and numeric summaries.",
        "- Use `map` for geographic, regional, route, venue, facility, weather-location, or site-status reports.",
        "- Use `networkDiagram` for dependencies, process flows, topology, handoffs, lineage, and incident blast-radius views.",
        "- In XCON/SKETCH, nested children inside panels, list cells, or other components use parent-local coordinates; do not add the parent screen offset, and keep child x/y inside the parent width/height.",
        "- Do not open generated artifacts in a separate Xenesis Desk pane unless the user explicitly asks for a separate artifact window, pane, placement, or streaming reveal.",
        "- Omit placement unless the user asks for a specific dock location, and use streaming only when a progressive artifact reveal is explicitly useful.",
        "- Do not use generic `write_file` or `xenesis_desk_mobile_open_file` as the primary save path for XCON artifacts; the dedicated create tool applies Xenesis Desk defaults and artifact delivery.",
        "- XCON/SKETCH fence display mode defaults to `view`; never emit `mode both` or `mode code` unless the user explicitly asks to see source code.",
        "- For Telegram or mobile requests that need a shareable document, set `exportPdf` to true so Xenesis Desk exports the Markdown artifact to PDF for delivery.",
        "- Keep terminal runs, dock close, Playwright, command palette, and extension execution behind the existing Xenesis Desk approval flow.",
        "",
        "Return a concise user-facing answer followed by the generated Markdown/XCON content for inline Bot rendering.",
    ])


def _artifact_session_key(session_id: Any) -> str:
    return str(session_id or "default").strip() or "default"


def _artifact_basename(file_path: str) -> str:
    parts = [part for part in re.split(r"[\\/]+", str(file_path or "").strip()) if part]
    return parts[-1] if parts else "Artifact"


def _quote_xd_command_arg(value: str) -> str:
    return '"' + str(value or "").replace('"', '\\"') + '"'


def _is_xcon_markdown_path(file_path: str) -> bool:
    name = _artifact_basename(file_path).lower()
    return name.endswith((".xcon.md", ".xcon.markdown", ".xcons.md", ".xcon.sketch.md"))


def _looks_like_xcon_markdown(value: str) -> bool:
    return bool(re.search(
        r"^```(?:xcon(?:-[A-Za-z0-9_-]+)?|xcons|xconj|xconx|xcont|sketch)\b",
        str(value or ""),
        re.MULTILINE | re.IGNORECASE,
    ))


def _normalize_xcon_fence_modes(content: str) -> tuple[str, bool]:
    changed = False

    def replace(match: re.Match[str]) -> str:
        nonlocal changed
        lang = match.group("lang")
        attrs = match.group("attrs") or ""
        if re.search(r"\bmode\s*=?\s*view\b", attrs, re.IGNORECASE):
            return match.group(0)
        if re.search(r"\bmode\s*=?\s*(?:both|code)\b", attrs, re.IGNORECASE):
            changed = True
            normalized = re.sub(
                r"\bmode\s*=?\s*(?:both|code)\b",
                "mode view",
                attrs,
                count=1,
                flags=re.IGNORECASE,
            )
            return f"```{lang}{normalized}"
        changed = True
        return f"```{lang} mode view{attrs}"

    normalized = re.sub(
        r"^```(?P<lang>xcon(?:-[A-Za-z0-9_-]+)?|xcons|xconj|xconx|xcont|sketch)\b(?P<attrs>[^\n]*)$",
        replace,
        str(content or ""),
        flags=re.MULTILINE | re.IGNORECASE,
    )
    return normalized, changed


def _plugin_local_path(file_path: str) -> Path:
    raw = str(file_path or "").strip()
    if os.name != "nt" and _is_windows_absolute_path(raw):
        converted = _windows_drive_to_wsl_path(raw)
        if converted:
            raw = converted
    elif os.name == "nt" and _is_wsl_mount_path(raw):
        converted = _wsl_path_to_windows_drive(raw)
        if converted:
            raw = converted
    return Path(raw).expanduser()


def _xd_artifact_export_dir() -> Path:
    explicit_dir = os.getenv("XENIS_ARTIFACT_EXPORT_DIR", "").strip()
    if explicit_dir:
        return _plugin_local_path(explicit_dir)

    xddesk_home = os.getenv("XENIS_HOME", "").strip()
    if xddesk_home:
        return _plugin_local_path(xddesk_home) / "exports"

    try:
        state_file = _plugin_local_path(str(_bridge_state_file()))
    except Exception:
        state_file = Path.home() / ".xenis" / "mcp" / "bridge.json"
    for parent in [state_file.parent, *state_file.parents]:
        if parent.name == ".xenis":
            return parent / "exports"
    return Path.home() / ".xenis" / "exports"


def _safe_artifact_export_name(file_path: str) -> str:
    name = _artifact_basename(file_path)
    safe = re.sub(r'[<>:"/\\|?*\x00-\x1F]+', "-", name).strip(" .")
    return safe or "xcon-artifact.xcon.md"


def _same_local_file(left: Path, right: Path) -> bool:
    try:
        return left.resolve() == right.resolve()
    except Exception:
        return str(left) == str(right)


def _promote_xcon_markdown_to_export(file_path: str, content_hint: str = "") -> tuple[str, bool, bool]:
    if not file_path:
        return "", False, False
    local_path = _plugin_local_path(file_path)
    try:
        current = local_path.read_text(encoding="utf-8")
    except Exception:
        current = str(content_hint or "")
    if not current or not (_is_xcon_markdown_path(file_path) or _looks_like_xcon_markdown(current)):
        return file_path, False, False

    normalized, changed = _normalize_xcon_fence_modes(current)
    export_dir = _xd_artifact_export_dir()
    export_path = export_dir / _safe_artifact_export_name(file_path)
    try:
        export_dir.mkdir(parents=True, exist_ok=True)
        if not _same_local_file(local_path, export_path) or changed or not export_path.exists():
            export_path.write_text(normalized, encoding="utf-8")
    except Exception:
        return file_path, changed, False
    return str(export_path), changed, not _same_local_file(local_path, export_path)


def _normalize_xcon_markdown_file_mode(file_path: str, content_hint: str = "") -> bool:
    if not file_path:
        return False
    local_path = _plugin_local_path(file_path)
    try:
        current = local_path.read_text(encoding="utf-8")
    except Exception:
        current = str(content_hint or "")
    if not current or not (_is_xcon_markdown_path(file_path) or _looks_like_xcon_markdown(current)):
        return False
    normalized, changed = _normalize_xcon_fence_modes(current)
    if not changed:
        return False
    try:
        local_path.write_text(normalized, encoding="utf-8")
    except Exception:
        return False
    return True


def _xcon_write_file_paths(args: dict[str, Any], parsed: dict[str, Any]) -> list[str]:
    paths: list[str] = []
    for value in (parsed.get("resolved_path"), args.get("path"), parsed.get("filePath")):
        if value:
            paths.append(str(value))
    files_modified = parsed.get("files_modified")
    if isinstance(files_modified, list):
        paths.extend(str(item) for item in files_modified if item)
    return list(dict.fromkeys(path for path in paths if path))


def _replace_xcon_result_paths(
    parsed: dict[str, Any],
    tool_args: dict[str, Any],
    promoted_paths: dict[str, str],
) -> None:
    if not promoted_paths:
        return

    def replace(value: Any) -> Any:
        text = str(value or "")
        return promoted_paths.get(text, value)

    for key in ("path", "resolved_path", "filePath"):
        if key in parsed:
            parsed[key] = replace(parsed.get(key))
        if key in tool_args:
            tool_args[key] = replace(tool_args.get(key))

    files_modified = parsed.get("files_modified")
    if isinstance(files_modified, list):
        parsed["files_modified"] = [replace(item) for item in files_modified]

    primary = next(iter(promoted_paths.values()), "")
    if primary:
        parsed["filePath"] = str(parsed.get("filePath") or primary)
        parsed["resolved_path"] = str(parsed.get("resolved_path") or primary)
        if "path" in tool_args:
            tool_args["path"] = primary
        if "filePath" in tool_args:
            tool_args["filePath"] = primary


def _xcon_artifacts_from_tool_result(tool_name: str, args: dict[str, Any], result: str) -> list[dict[str, Any]]:
    if tool_name not in _XCON_DIRECT_ARTIFACT_TOOL_NAMES:
        return []
    parsed = _parse_json_result(result)
    if not isinstance(parsed, dict):
        return []
    if parsed.get("success") is False or parsed.get("ok") is False:
        return []
    if tool_name == "write_file":
        content_hint = str(args.get("content") or "")
        artifacts: list[dict[str, Any]] = []
        for file_path in _xcon_write_file_paths(args, parsed):
            if not (_is_xcon_markdown_path(file_path) or _looks_like_xcon_markdown(content_hint)):
                continue
            artifacts.append({
                "title": _artifact_basename(file_path),
                "kind": "markdown-xcon",
                "filePath": file_path,
                "openCommand": f"/xd open {_quote_xd_command_arg(file_path)}",
            })
        return artifacts
    file_path = str(parsed.get("filePath") or parsed.get("path") or "").strip()
    if tool_name == "xenesis_desk_mobile_open_file" and not _is_xcon_markdown_path(file_path):
        return []
    title = str(
        args.get("title")
        or parsed.get("title")
        or parsed.get("fileName")
        or _artifact_basename(file_path)
    ).strip()
    artifacts: list[dict[str, Any]] = []
    if file_path and tool_name != "xenesis_desk_mobile_export_xcon_pdf":
        artifacts.append({
            "title": title or _artifact_basename(file_path),
            "kind": str(parsed.get("kind") or args.get("kind") or "markdown-xcon").strip() or "markdown-xcon",
            "filePath": file_path,
            "openCommand": f"/xd open {_quote_xd_command_arg(file_path)}",
        })

    pdf_path = str(parsed.get("pdfPath") or parsed.get("pdfFilePath") or "").strip()
    if pdf_path:
        pdf_title = str(parsed.get("pdfTitle") or "").strip()
        if not pdf_title:
            base_title = title or _artifact_basename(pdf_path)
            pdf_title = base_title if base_title.lower().endswith("pdf") else f"{base_title} PDF"
        artifacts.append({
            "title": pdf_title,
            "kind": "pdf",
            "filePath": pdf_path,
            "openCommand": f"/xd open {_quote_xd_command_arg(pdf_path)}",
        })
    return artifacts


def _artifact_marker(artifacts: list[dict[str, Any]]) -> str:
    encoded = base64.b64encode(
        json.dumps(artifacts, ensure_ascii=False, separators=(",", ":")).encode("utf-8"),
    ).decode("ascii")
    return f"<!-- xenesis-artifacts:{encoded} -->"


def _is_bot_inline_artifact(artifact: dict[str, Any]) -> bool:
    file_path = str(artifact.get("filePath") or "").strip()
    if not file_path:
        return False
    kind = str(artifact.get("kind") or "").strip().lower()
    if kind == "pdf":
        return False
    return kind in _BOT_INLINE_ARTIFACT_KINDS or _is_xcon_markdown_path(file_path)


def _read_bot_inline_artifact_content(artifact: dict[str, Any]) -> str:
    if not _is_bot_inline_artifact(artifact):
        return ""
    file_path = str(artifact.get("filePath") or "").strip()
    try:
        path = _plugin_local_path(file_path)
        if not path.is_file():
            return ""
        if path.stat().st_size > _BOT_INLINE_ARTIFACT_MAX_CHARS:
            return (
                f"> Xenesis Desk artifact `{_artifact_basename(file_path)}` is too large "
                "to render inline. Use the artifact actions to open it."
            )
        content = path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        try:
            content = _plugin_local_path(file_path).read_text(encoding="utf-8", errors="replace")
        except OSError:
            return ""
    except OSError:
        return ""
    content = content.strip()
    if not _looks_like_xcon_markdown(content):
        return ""
    return content


def _bot_inline_artifact_response(response_text: str, artifacts: list[dict[str, Any]]) -> str:
    base = str(response_text or "").rstrip()
    if _looks_like_xcon_markdown(base):
        return base

    previews: list[str] = []
    seen: set[str] = set()
    for artifact in artifacts:
        if not isinstance(artifact, dict):
            continue
        preview = _read_bot_inline_artifact_content(artifact).rstrip()
        if not preview or preview in base or preview in seen:
            continue
        previews.append(preview)
        seen.add(preview)

    if not previews:
        return base
    if not base:
        return "\n\n".join(previews)
    return f"{base}\n\n" + "\n\n".join(previews)


def _telegram_media_path(path_text: str) -> str:
    path = str(path_text or "").strip()
    if os.name != "nt" and _is_windows_absolute_path(path):
        return _windows_drive_to_wsl_path(path) or path
    return path


def _media_directive(path_text: str) -> str:
    path = _telegram_media_path(path_text)
    if '"' not in path:
        return f'MEDIA:"{path}"'
    if "'" not in path:
        return f"MEDIA:'{path}'"
    if "`" not in path:
        return f"MEDIA:`{path}`"
    return f"MEDIA:{path}"


def _tool_result_media_directive(path_text: str) -> str:
    path = _telegram_media_path(path_text)
    if path and not re.search(r"\s", path) and (path.startswith("/") or path.startswith("~/")):
        return f"MEDIA:{path}"
    return _media_directive(path)


def _ensure_telegram_pdf_artifacts(
    artifacts: list[dict[str, Any]],
    *,
    pdf_out_dir: str | None = None,
) -> tuple[list[dict[str, Any]], list[str]]:
    ensured: list[dict[str, Any]] = []
    export_artifacts: list[dict[str, Any]] = []
    for artifact in artifacts:
        normalized_artifact = dict(artifact)
        file_path = str(normalized_artifact.get("filePath") or "").strip()
        kind = str(normalized_artifact.get("kind") or "").strip().lower()
        if file_path and kind != "pdf" and file_path.lower().endswith((".md", ".markdown")):
            promoted_path, _, promoted = _promote_xcon_markdown_to_export(file_path)
            if promoted_path and promoted:
                normalized_artifact["filePath"] = promoted_path
                normalized_artifact["openCommand"] = f"/xd open {_quote_xd_command_arg(promoted_path)}"
        ensured.append(normalized_artifact)
        export_artifacts.append(normalized_artifact)

    if any(str(item.get("kind") or "").strip().lower() == "pdf" for item in ensured):
        return ensured, []

    errors: list[str] = []
    for artifact in export_artifacts:
        kind = str(artifact.get("kind") or "").strip().lower()
        if kind == "pdf":
            continue
        file_path = str(artifact.get("filePath") or "").strip()
        if not file_path or not file_path.lower().endswith((".md", ".markdown")):
            continue
        title = str(artifact.get("title") or _artifact_basename(file_path) or "XCON Markdown").strip()
        export_args = {
            "filePath": file_path,
            "title": title if title.lower().endswith("pdf") else f"{title} PDF",
        }
        if pdf_out_dir:
            export_args["pdfOutDir"] = pdf_out_dir
        try:
            export_result = _parse_json_result(handle_export_xcon_pdf(export_args))
        except Exception as exc:
            errors.append(str(exc) or exc.__class__.__name__)
            continue
        if not isinstance(export_result, dict):
            errors.append("PDF export returned an unreadable response")
            continue
        pdf_path = str(export_result.get("pdfPath") or export_result.get("pdfFilePath") or "").strip()
        if pdf_path and export_result.get("success") is not False and export_result.get("ok") is not False:
            pdf_title = str(export_result.get("pdfTitle") or export_args["title"]).strip()
            pdf_artifact = {
                "title": pdf_title,
                "kind": "pdf",
                "filePath": pdf_path,
                "openCommand": f"/xd open {_quote_xd_command_arg(pdf_path)}",
            }
            if pdf_artifact not in ensured:
                ensured.append(pdf_artifact)
            continue
        error = str(
            export_result.get("pdfError")
            or export_result.get("error")
            or export_result.get("message")
            or "PDF export failed"
        ).strip()
        errors.append(error or "PDF export failed")
    return ensured, errors


def handle_post_tool_call(
    tool_name: str = "",
    args: dict[str, Any] | None = None,
    result: str = "",
    session_id: str = "",
    **_: Any,
) -> None:
    artifacts = _xcon_artifacts_from_tool_result(tool_name, args or {}, result)
    if not artifacts:
        return None
    key = _artifact_session_key(session_id)
    bucket = _SESSION_ARTIFACTS.setdefault(key, [])
    for artifact in artifacts:
        if artifact not in bucket:
            bucket.append(artifact)
    if len(bucket) > 8:
        del bucket[:-8]
    return None


def handle_transform_tool_result(
    tool_name: str = "",
    args: dict[str, Any] | None = None,
    result: str = "",
    session_id: str = "",
    **_: Any,
) -> str | None:
    parsed = _parse_json_result(result)
    if not isinstance(parsed, dict):
        return None
    if parsed.get("success") is False or parsed.get("ok") is False:
        return None

    tool_args = args or {}
    mode_normalized = False
    promoted_paths: dict[str, str] = {}
    if tool_name == "write_file":
        content_hint = str(tool_args.get("content") or "")
        for file_path in _xcon_write_file_paths(tool_args, parsed):
            if _normalize_xcon_markdown_file_mode(file_path, content_hint):
                mode_normalized = True
            promoted_path, promoted_normalized, promoted = _promote_xcon_markdown_to_export(file_path, content_hint)
            if promoted_normalized:
                mode_normalized = True
            if promoted and promoted_path:
                promoted_paths[file_path] = promoted_path
    elif tool_name == "xenesis_desk_mobile_open_file":
        file_path = str(parsed.get("filePath") or tool_args.get("filePath") or "").strip()
        if file_path and _normalize_xcon_markdown_file_mode(file_path):
            mode_normalized = True
        if file_path:
            promoted_path, promoted_normalized, promoted = _promote_xcon_markdown_to_export(file_path)
            if promoted_normalized:
                mode_normalized = True
            if promoted and promoted_path:
                promoted_paths[file_path] = promoted_path

    if promoted_paths:
        tool_args = dict(tool_args)
        _replace_xcon_result_paths(parsed, tool_args, promoted_paths)

    artifacts = _xcon_artifacts_from_tool_result(tool_name, tool_args, json.dumps(parsed, ensure_ascii=False))
    if not artifacts and not mode_normalized:
        return None

    pdf_errors: list[str] = []
    if artifacts:
        artifacts, pdf_errors = _ensure_telegram_pdf_artifacts(artifacts)
        pdf_paths = [
            str(artifact.get("filePath") or "").strip()
            for artifact in artifacts
            if str(artifact.get("kind") or "").strip().lower() == "pdf"
        ]
        pdf_paths = [path for path in pdf_paths if path]
        if pdf_paths:
            pdf_path = pdf_paths[-1]
            parsed["pdfPath"] = pdf_path
            parsed["pdfExported"] = True
            parsed["mediaTag"] = _tool_result_media_directive(pdf_path)
        elif pdf_errors:
            parsed["pdfExported"] = False
            parsed["pdfError"] = "; ".join(dict.fromkeys(error for error in pdf_errors if error))

    if mode_normalized:
        parsed["xenesis_desk_xcon_mode_normalized"] = True
        parsed["xenesis_desk_xcon_mode"] = "view"
    return json.dumps(parsed, ensure_ascii=False)


def handle_transform_llm_output(
    response_text: str = "",
    session_id: str = "",
    platform: str = "",
    **_: Any,
) -> str | None:
    artifacts = _SESSION_ARTIFACTS.pop(_artifact_session_key(session_id), [])
    if not artifacts:
        return None
    normalized_platform = str(platform or "").strip().lower()
    if normalized_platform == "xenesis_desk_bot":
        base = _bot_inline_artifact_response(response_text, artifacts).rstrip()
        return f"{base}\n\n{_artifact_marker(artifacts)}"
    if normalized_platform == "telegram":
        artifacts, pdf_errors = _ensure_telegram_pdf_artifacts(artifacts)
        pdf_paths = [
            str(artifact.get("filePath") or "").strip()
            for artifact in artifacts
            if str(artifact.get("kind") or "").strip().lower() == "pdf"
        ]
        pdf_paths = [path for path in pdf_paths if path]
        if not pdf_paths:
            if pdf_errors:
                base = str(response_text or "").rstrip()
                error_text = "; ".join(dict.fromkeys(error for error in pdf_errors if error))
                warning = f"PDF export failed; Telegram attachment was not sent: {error_text}"
                if warning not in base:
                    return f"{base}\n\n{warning}"
            return None
        base = str(response_text or "").rstrip()
        media_lines = [
            _media_directive(path)
            for path in pdf_paths
            if _media_directive(path) not in base
        ]
        if not media_lines:
            return None
        return f"{base}\n\n" + "\n".join(media_lines)
    return None


def handle_pre_gateway_dispatch(event: Any = None, **_: Any) -> dict[str, str] | None:
    text = str(getattr(event, "text", "") or "").strip()
    token = _action_token_from_callback_text(text)
    if token:
        return {"action": "rewrite", "text": f"/xd action {token}"}
    direct_command = _normalize_callback_xd_command(text)
    if direct_command and direct_command != text:
        return {"action": "rewrite", "text": direct_command}
    command = _xd_command_from_callback_text(text)
    if command:
        return {"action": "rewrite", "text": command}
    if _is_work_packet_bot_event(event, text):
        return {"action": "rewrite", "text": f"/xd packet {text}"}
    selector = _selector_from_reply(text)
    if selector:
        last_kind = _last_selection_kind()
        ordered_kinds = [last_kind] if last_kind else []
        ordered_kinds.extend(
            kind for kind in (
                "terminals",
                "panels",
                "files",
                "context_actions",
                "menu_actions",
                "quick_actions",
                "workflows",
                "recommendations",
                "inbox",
                "commands",
                "extensions",
                "action_history",
                "packet_replay",
                "packet_artifacts",
            )
            if kind not in ordered_kinds
        )
        for kind in ordered_kinds:
            item, _ = _cached_selection(kind, selector)
            if not item:
                continue
            reply_command = str(item.get("_replyCommand") or "").strip()
            if reply_command:
                return {"action": "rewrite", "text": reply_command}
            prefix = SELECTABLE_REPLY_PREFIXES.get(kind)
            if prefix:
                return {"action": "rewrite", "text": f"/xd {prefix} {selector}"}
    if text and not text.startswith("/") and _is_visual_cockpit_bot_event(event):
        return {"action": "rewrite", "text": _visual_cockpit_prompt(text)}
    return None



def _parse_json_object_payload(value: str) -> dict[str, Any] | None:
    text = _strip_wrapping_quotes(str(value or "").strip())
    if not text:
        return None
    try:
        parsed = json.loads(text)
    except Exception:
        return None
    return parsed if isinstance(parsed, dict) else None


def _apply_playwright_cli_option(payload: dict[str, Any], token: str) -> None:
    text = str(token or "").strip()
    lowered = text.lower()
    if lowered in {"open", "--open"}:
        payload["openInDesk"] = True
        return
    if lowered in {"full", "--full", "fullpage", "--full-page"}:
        payload["fullPage"] = True
        return
    if lowered in {"trace", "--trace"}:
        payload["trace"] = True
        return
    if lowered in {"screenshot", "--screenshot", "shot", "--shot"}:
        payload["screenshot"] = True
        return
    if "=" not in text:
        return
    key, value = text.split("=", 1)
    key = key.strip().lstrip("-").lower()
    value = _strip_wrapping_quotes(value.strip())
    if key in {"selector", "sel"}:
        payload["selector"] = value
    elif key in {"screenshotselector", "shotselector"}:
        payload["screenshotSelector"] = value
    elif key in {"out", "outdir"}:
        payload["outDir"] = value
    elif key in {"file", "filename"}:
        payload["fileName"] = value
    elif key in {"tracefile", "tracefilename"}:
        payload["traceFileName"] = value
    elif key in {"format"}:
        payload["format"] = value
    elif key in {"host", "allowedhost"}:
        payload.setdefault("allowedHosts", []).append(value)
    elif key in {"w", "width", "h", "height", "timeout", "timeoutms", "quality"}:
        try:
            number = int(value)
        except ValueError:
            return
        mapped = {"w": "width", "h": "height", "timeout": "timeoutMs"}.get(key, key)
        payload[mapped] = number


def _handle_playwright_command(rest: str) -> str:
    mode, body = _first_word_and_rest(rest)
    if not mode:
        return "Usage: /xd pw snapshot <url> [selector] [open] | /xd pw run <json-payload>"
    mode = mode.lower()
    if mode in {"json", "pw-json"}:
        payload = _parse_json_object_payload(body)
        if not payload:
            return "Usage: /xd pw-json {\"tool\":\"xenesis_desk_playwright_run\",\"args\":{...}}"
        tool_name = str(payload.get("tool") or "").strip()
        args = payload.get("args") if isinstance(payload.get("args"), dict) else {}
        if tool_name == "xenesis_desk_playwright_snapshot":
            return _format_playwright_result(_parse_json_result(handle_playwright_snapshot(args)))
        if tool_name == "xenesis_desk_playwright_run":
            return _format_playwright_result(_parse_json_result(handle_playwright_run(args)))
        return "Unsupported Playwright tool in payload."
    if mode in {"snapshot", "shot", "capture"}:
        payload = _parse_json_object_payload(body)
        if payload is None:
            parts = _split_args(body)
            if not parts:
                return "Usage: /xd pw snapshot <url> [selector] [open]"
            payload = {"url": parts[0]}
            remaining = parts[1:]
            if remaining and not remaining[0].startswith("-") and "=" not in remaining[0].lower() and remaining[0].lower() not in {"open", "full", "fullpage"}:
                payload["selector"] = remaining[0]
                remaining = remaining[1:]
            for token in remaining:
                _apply_playwright_cli_option(payload, token)
        return _format_playwright_result(_parse_json_result(handle_playwright_snapshot(payload)))
    if mode in {"run", "actions", "trace"}:
        payload = _parse_json_object_payload(body)
        if payload is None:
            url, action_text = _first_word_and_rest(body)
            action_text = action_text.strip()
            if not url or not action_text:
                return "Usage: /xd pw run {\"url\":\"https://...\",\"actions\":[...]}"
            try:
                actions = json.loads(_strip_wrapping_quotes(action_text))
            except Exception:
                return "Usage: /xd pw run <url> '[{\"type\":\"click\",\"selector\":\"#go\"}]'"
            payload = {"url": url, "actions": actions}
        if mode == "trace":
            payload["trace"] = True
            payload.setdefault("screenshot", True)
        return _format_playwright_result(_parse_json_result(handle_playwright_run(payload)))
    return "Usage: /xd pw snapshot <url> [selector] [open] | /xd pw run <json-payload>"


def _xenesis_desk_bot_status_lines() -> list[str]:
    try:
        diagnostics = _xenesis_desk_bot_diagnostics()
    except Exception:
        return []
    if diagnostics.get("error"):
        return [f"Bot diagnostics: unavailable ({diagnostics['error']})"]

    token_state = "present" if diagnostics.get("tokenPresent") else "missing"
    state_file = str(diagnostics.get("stateFile") or "")
    state_suffix = "exists" if diagnostics.get("stateFileExists") else "missing"
    wsl_state = "detected" if diagnostics.get("wslDetected") else "not detected"
    return [
        "Bot platform: available" if diagnostics.get("available") else "Bot platform: unavailable",
        f"Bot URL: {diagnostics.get('bridgeUrl') or '(none)'}",
        f"Bot token: {token_state}",
        f"Bot state file: {state_file or '(none)'} ({state_suffix})",
        f"Bot listen: {diagnostics.get('listenHost') or '(none)'}",
        f"Bot input: {diagnostics.get('inputUrl') or '(none)'}",
        f"Bot WSL: {wsl_state}",
    ]


def _xenesis_desk_bot_diagnostics() -> dict[str, Any]:
    try:
        from plugins.platforms.xenesis_desk_bot.adapter import xenesis_desk_bot_diagnostics
    except Exception as exc:
        return {"available": False, "error": str(exc) or exc.__class__.__name__}
    try:
        diagnostics = xenesis_desk_bot_diagnostics()
    except Exception as exc:
        return {"available": False, "error": str(exc) or exc.__class__.__name__}
    return diagnostics if isinstance(diagnostics, dict) else {"available": False}


def _format_bridge_doctor(result: dict[str, Any]) -> str:
    summary = str(result.get("summary") or "UNKNOWN").upper()
    lines = [f"Xenesis Desk doctor: {summary}"]
    checks = result.get("checks")
    if isinstance(checks, list):
        for check in checks:
            if not isinstance(check, dict):
                continue
            status = str(check.get("status") or "unknown").upper()
            name = str(check.get("name") or "Check")
            detail = str(check.get("detail") or "").strip()
            lines.append(f"{status} {name}: {detail}" if detail else f"{status} {name}")

    bot_lines = _xenesis_desk_bot_status_lines()
    if bot_lines:
        lines.extend(["", "Xenesis Bot:", *bot_lines])
    return "\n".join(lines)


def _selftest_check(name: str, status: str, detail: str = "") -> dict[str, str]:
    return {
        "name": name,
        "status": status,
        "detail": detail,
    }


def _selftest_failed(payload: dict[str, Any]) -> bool:
    return payload.get("success") is False or payload.get("ok") is False


def _selftest_failure_detail(payload: dict[str, Any]) -> str:
    return str(payload.get("error") or payload.get("message") or "returned failure")


def _selftest_state_detail(payload: dict[str, Any]) -> str:
    files = payload.get("openFiles") if isinstance(payload.get("openFiles"), list) else payload.get("files")
    return (
        f"terminals={_list_count(payload.get('terminals'))} "
        f"panels={_list_count(payload.get('panels'))} "
        f"files={_list_count(files)}"
    )


def _selftest_terminal_list_detail(payload: dict[str, Any]) -> str:
    return f"sessions={_list_count(payload.get('sessions'))}"


def _selftest_diagnostics_detail(payload: dict[str, Any]) -> str:
    return f"diagnostics={_list_count(payload.get('diagnostics'))}"


def _selftest_preview_detail(payload: dict[str, Any]) -> str:
    return "preview returned" if any(key in payload for key in ("preview", "command", "mcpCommand")) else "reachable"


def _run_xd_selftest() -> dict[str, Any]:
    steps = [
        ("State", "/state", {}, _selftest_state_detail),
        ("Terminal list", "/terminal/list", {}, _selftest_terminal_list_detail),
        ("Recent diagnostics", "/diagnostics/recent", {"limit": 5}, _selftest_diagnostics_detail),
        ("Terminal preview", "/terminal/preview", {"command": "echo xd-selftest"}, _selftest_preview_detail),
    ]
    checks: list[dict[str, str]] = []
    for name, path_name, payload, detail_fn in steps:
        try:
            result = _call_bridge(path_name, payload)
            if _selftest_failed(result):
                checks.append(_selftest_check(name, "fail", _selftest_failure_detail(result)))
            else:
                checks.append(_selftest_check(name, "pass", detail_fn(result)))
        except Exception as exc:
            checks.append(_selftest_check(name, "fail", str(exc) or exc.__class__.__name__))
    return {
        "summary": "FAIL" if any(check["status"] == "fail" for check in checks) else "PASS",
        "checks": checks,
    }


def _format_xd_selftest(result: dict[str, Any]) -> str:
    summary = str(result.get("summary") or "UNKNOWN").upper()
    lines = [f"Xenesis Desk selftest: {summary}"]
    checks = result.get("checks")
    if isinstance(checks, list):
        for check in checks:
            if not isinstance(check, dict):
                continue
            status = str(check.get("status") or "unknown").upper()
            name = str(check.get("name") or "Check")
            detail = str(check.get("detail") or "").strip()
            lines.append(f"{status} {name}: {detail}" if detail else f"{status} {name}")
    return "\n".join(lines)


def _compatibility_check(name: str, status: str, detail: str = "") -> dict[str, str]:
    return {
        "name": name,
        "status": status,
        "detail": detail,
    }


def _compatibility_error_status(error_text: str) -> str:
    lowered = str(error_text or "").lower()
    return "unsupported" if "404" in lowered or "not found" in lowered else "fail"


def _compatibility_endpoint_detail(payload: dict[str, Any], keys: tuple[str, ...] = ()) -> str:
    if keys:
        parts = [f"{key}={_list_count(payload.get(key))}" for key in keys]
        return " ".join(parts)
    return "reachable"


def _compatibility_probe_endpoint(
    name: str,
    path_name: str,
    payload: dict[str, Any],
    keys: tuple[str, ...] = (),
) -> dict[str, str]:
    try:
        result = _call_bridge(path_name, payload)
    except Exception as exc:
        error_text = str(exc) or exc.__class__.__name__
        status = _compatibility_error_status(error_text)
        if status == "unsupported":
            if path_name == "/action-inbox/list":
                return _compatibility_check(name, "unsupported", "action-inbox bridge endpoint is not available")
            return _compatibility_check(name, "unsupported", f"{path_name} is not available")
        return _compatibility_check(name, "fail", error_text)
    if not isinstance(result, dict):
        return _compatibility_check(name, "fail", "bridge returned non-object payload")
    if result.get("success") is False or result.get("ok") is False:
        detail = str(result.get("error") or result.get("message") or "returned failure")
        status = _compatibility_error_status(detail)
        return _compatibility_check(name, status, detail)
    return _compatibility_check(name, "pass", _compatibility_endpoint_detail(result, keys))


def _compatibility_command_palette() -> tuple[dict[str, str], dict[str, str]]:
    try:
        result = _call_bridge("/command-palette", {})
    except Exception as exc:
        error_text = str(exc) or exc.__class__.__name__
        status = _compatibility_error_status(error_text)
        detail = "/command-palette is not available" if status == "unsupported" else error_text
        check = _compatibility_check("Command palette", status, detail)
        return check, _compatibility_check("Action Inbox panel command", "unsupported", "command palette unavailable")
    if not isinstance(result, dict):
        check = _compatibility_check("Command palette", "fail", "bridge returned non-object payload")
        return check, _compatibility_check("Action Inbox panel command", "unsupported", "command palette unavailable")
    if result.get("success") is False or result.get("ok") is False:
        detail = str(result.get("error") or result.get("message") or "returned failure")
        status = _compatibility_error_status(detail)
        check = _compatibility_check("Command palette", status, detail)
        return check, _compatibility_check("Action Inbox panel command", "unsupported", "command palette unavailable")

    commands = result.get("commands") if isinstance(result.get("commands"), list) else []
    command_ids = {
        str(command.get("id") or "").strip()
        for command in commands
        if isinstance(command, dict)
    }
    palette_check = _compatibility_check("Command palette", "pass", f"commands={len(command_ids)}")
    if ACTION_INBOX_OPEN_COMMAND_ID in command_ids:
        inbox_command_check = _compatibility_check("Action Inbox panel command", "pass", ACTION_INBOX_OPEN_COMMAND_ID)
    else:
        inbox_command_check = _compatibility_check(
            "Action Inbox panel command",
            "unsupported",
            f"missing {ACTION_INBOX_OPEN_COMMAND_ID}",
        )
    return palette_check, inbox_command_check


def _compatibility_summary(checks: list[dict[str, str]]) -> str:
    statuses = {str(check.get("status") or "").lower() for check in checks}
    if "fail" in statuses:
        return "FAIL"
    if "unsupported" in statuses:
        return "PARTIAL"
    return "PASS"


def _run_xd_compatibility() -> dict[str, Any]:
    checks = [
        _compatibility_probe_endpoint("State", "/state", {}, ("terminals", "panels", "openFiles")),
        _compatibility_probe_endpoint("Active context", "/active-context", {}),
        _compatibility_probe_endpoint("Context actions", "/context-actions", {}, ("actions",)),
        _compatibility_probe_endpoint("Terminal list", "/terminal/list", {}, ("sessions",)),
        _compatibility_probe_endpoint("Panels", "/panels/list", {}, ("panels",)),
        _compatibility_probe_endpoint("Open files", "/files/open", {}, ("openFiles",)),
        _compatibility_probe_endpoint("Diagnostics", "/diagnostics/recent", {"limit": 1}, ("diagnostics",)),
        _compatibility_probe_endpoint("Action inbox", "/action-inbox/list", {"limit": 1}, ("actions",)),
    ]
    palette_check, inbox_command_check = _compatibility_command_palette()
    checks.extend([palette_check, inbox_command_check])
    return {
        "summary": _compatibility_summary(checks),
        "checks": checks,
    }


def _format_xd_compatibility(result: dict[str, Any]) -> str:
    summary = str(result.get("summary") or "UNKNOWN").upper()
    lines = [f"Xenesis Desk compatibility: {summary}"]
    checks = result.get("checks")
    if isinstance(checks, list):
        for check in checks:
            if not isinstance(check, dict):
                continue
            status = str(check.get("status") or "unknown").upper()
            name = str(check.get("name") or "Check")
            detail = str(check.get("detail") or "").strip()
            lines.append(f"{status} {name}: {detail}" if detail else f"{status} {name}")
    return "\n".join(lines)


def _upgrade_note(name: str, detail: str) -> dict[str, str]:
    return {
        "name": name,
        "detail": detail,
    }


def _upgrade_notes_for_check(check: dict[str, Any]) -> list[dict[str, str]]:
    status = str(check.get("status") or "").strip().lower()
    if status == "pass":
        return []
    name = str(check.get("name") or "").strip()
    detail = str(check.get("detail") or "").strip()
    lowered_name = name.lower()

    if lowered_name == "action inbox":
        return [_upgrade_note(
            "Xenesis Desk action-inbox bridge",
            "Update or restart Xenesis Desk so the MCP bridge exposes /action-inbox/list, then run /xd compatibility.",
        )]
    if lowered_name == "action inbox panel command":
        return [_upgrade_note(
            "Action Inbox panel command",
            f"Update or enable the Xenesis Bot tool so {ACTION_INBOX_OPEN_COMMAND_ID} is registered, then restart Xenesis Desk.",
        )]
    if lowered_name == "command palette":
        return [_upgrade_note(
            "Xenesis Desk command palette bridge",
            "Update or restart Xenesis Desk so /command-palette is available; Action Inbox panel opening depends on it.",
        )]
    if status == "fail":
        return [_upgrade_note(
            "Xenesis Desk bridge health",
            f"{name or 'Bridge check'} failed{f': {detail}' if detail else ''}. Run /xd doctor and /xd repair before retrying.",
        )]
    return [_upgrade_note(
        f"{name or 'Xenesis Desk feature'} support",
        f"Update or restart Xenesis Desk so this bridge capability is available{f': {detail}' if detail else ''}.",
    )]


def _run_xd_upgrade_notes() -> dict[str, Any]:
    compatibility = _run_xd_compatibility()
    actions: list[dict[str, str]] = []
    seen: set[str] = set()
    checks = compatibility.get("checks")
    if isinstance(checks, list):
        for check in checks:
            if not isinstance(check, dict):
                continue
            for action in _upgrade_notes_for_check(check):
                key = action.get("name", "")
                if key in seen:
                    continue
                seen.add(key)
                actions.append(action)
    return {
        "summary": "ACTION_REQUIRED" if actions else "OK",
        "compatibility": compatibility,
        "actions": actions,
        "nextCommands": ["/xd compatibility", "/xd inbox", "/xd doctor"] if actions else ["/xd compatibility"],
    }


def _format_xd_upgrade_notes(result: dict[str, Any]) -> str:
    summary = str(result.get("summary") or "UNKNOWN").upper()
    compatibility = result.get("compatibility") if isinstance(result.get("compatibility"), dict) else {}
    lines = [
        f"Xenesis Desk upgrade notes: {summary}",
        f"Compatibility: {str(compatibility.get('summary') or 'UNKNOWN').upper()}",
    ]
    actions = result.get("actions")
    if isinstance(actions, list) and actions:
        for index, action in enumerate(actions, start=1):
            if not isinstance(action, dict):
                continue
            name = str(action.get("name") or "Action")
            detail = str(action.get("detail") or "").strip()
            lines.append(f"{index}. {name}: {detail}" if detail else f"{index}. {name}")
    else:
        lines.append("No Xenesis Desk upgrade actions required.")
    next_commands = result.get("nextCommands")
    if isinstance(next_commands, list) and next_commands:
        lines.append("Next: " + " | ".join(str(command) for command in next_commands if command))
    return "\n".join(lines)


def _readiness_check(name: str, status: str, detail: str = "") -> dict[str, str]:
    normalized = str(status or "fail").strip().lower()
    if normalized not in {"pass", "partial", "fail"}:
        normalized = "fail"
    return {
        "name": name,
        "status": normalized,
        "detail": str(detail or "").strip(),
    }


def _readiness_summary(checks: list[dict[str, str]]) -> str:
    statuses = {str(check.get("status") or "").lower() for check in checks}
    if "fail" in statuses:
        return "FAIL"
    if "partial" in statuses:
        return "PARTIAL"
    return "PASS"


def _readiness_status_from_summary(summary: str) -> str:
    value = str(summary or "").strip().upper()
    if value == "PASS":
        return "pass"
    if value in {"PARTIAL", "WARN", "WARNING"}:
        return "partial"
    return "fail"


def _check_status_counts(checks: Any) -> dict[str, int]:
    counts = {"pass": 0, "unsupported": 0, "warn": 0, "fail": 0}
    if not isinstance(checks, list):
        return counts
    for check in checks:
        if not isinstance(check, dict):
            continue
        status = str(check.get("status") or "").strip().lower()
        if status in counts:
            counts[status] += 1
    return counts


def _run_xd_readiness() -> dict[str, Any]:
    checks: list[dict[str, str]] = []

    try:
        diagnostics = bridge_diagnostics()
        bridge_url = str(diagnostics.get("url") or "").strip()
        bridge_configured = bool(diagnostics.get("configured") and bridge_url)
        checks.append(_readiness_check(
            "Bridge",
            "pass" if bridge_configured else "fail",
            f"configured {bridge_url}" if bridge_configured else "bridge URL missing",
        ))
    except Exception as exc:
        checks.append(_readiness_check("Bridge", "fail", str(exc) or exc.__class__.__name__))

    try:
        doctor = bridge_doctor()
        doctor_summary = str(doctor.get("summary") or "UNKNOWN").upper()
        doctor_counts = _check_status_counts(doctor.get("checks"))
        checks.append(_readiness_check(
            "Doctor",
            _readiness_status_from_summary(doctor_summary),
            (
                f"summary={doctor_summary} "
                f"pass={doctor_counts['pass']} warn={doctor_counts['warn']} fail={doctor_counts['fail']}"
            ),
        ))
    except Exception as exc:
        checks.append(_readiness_check("Doctor", "fail", str(exc) or exc.__class__.__name__))

    try:
        compatibility = _run_xd_compatibility()
        compatibility_summary = str(compatibility.get("summary") or "UNKNOWN").upper()
        compatibility_counts = _check_status_counts(compatibility.get("checks"))
        checks.append(_readiness_check(
            "Compatibility",
            _readiness_status_from_summary(compatibility_summary),
            (
                f"pass={compatibility_counts['pass']} "
                f"unsupported={compatibility_counts['unsupported']} "
                f"fail={compatibility_counts['fail']}"
            ),
        ))
    except Exception as exc:
        checks.append(_readiness_check("Compatibility", "fail", str(exc) or exc.__class__.__name__))

    try:
        bot = _xenesis_desk_bot_diagnostics()
        bot_available = bool(bot.get("available")) and not bot.get("error")
        if bot_available:
            detail = f"listen={bot.get('listenHost') or '(none)'} input={bot.get('inputUrl') or '(none)'}"
        else:
            detail = str(bot.get("error") or "xenesis_desk_bot platform unavailable")
        checks.append(_readiness_check("Bot", "pass" if bot_available else "fail", detail))
    except Exception as exc:
        checks.append(_readiness_check("Bot", "fail", str(exc) or exc.__class__.__name__))

    try:
        export_dir = _xd_export_dir()
        export_dir.mkdir(parents=True, exist_ok=True)
        probe = export_dir / f".xd-readiness-{os.getpid()}-{int(time.time() * 1000)}.tmp"
        probe.write_text("ok\n", encoding="utf-8")
        probe.unlink(missing_ok=True)
        checks.append(_readiness_check("Exports", "pass", f"writable {export_dir}"))
    except Exception as exc:
        checks.append(_readiness_check("Exports", "partial", str(exc) or exc.__class__.__name__))

    summary = _readiness_summary(checks)
    checks_by_name = {check["name"]: check for check in checks}
    next_commands: list[str] = []
    if summary == "PASS":
        next_commands.extend(["/xd mobile", "/xd brief", "/xd support-bundle"])
    else:
        if any(
            checks_by_name.get(name, {}).get("status") == "fail"
            for name in ("Bridge", "Doctor", "Bot")
        ):
            next_commands.extend(["/xd doctor", "/xd repair"])
        if checks_by_name.get("Compatibility", {}).get("status") != "pass":
            next_commands.extend(["/xd compatibility", "/xd upgrade-notes"])
        if summary == "PARTIAL" or checks_by_name.get("Exports", {}).get("status") != "pass":
            next_commands.append("/xd support-bundle")
    deduped_next = list(dict.fromkeys(next_commands or ["/xd doctor"]))
    return {
        "summary": summary,
        "checks": checks,
        "nextCommands": deduped_next,
    }


def _format_xd_readiness(result: dict[str, Any]) -> str:
    lines = [f"Xenesis Desk readiness: {str(result.get('summary') or 'UNKNOWN').upper()}"]
    checks = result.get("checks")
    if isinstance(checks, list):
        for check in checks:
            if not isinstance(check, dict):
                continue
            status = str(check.get("status") or "unknown").upper()
            name = str(check.get("name") or "Check")
            detail = str(check.get("detail") or "").strip()
            lines.append(f"{status} {name}: {detail}" if detail else f"{status} {name}")
    next_commands = result.get("nextCommands")
    if isinstance(next_commands, list) and next_commands:
        lines.append("Next: " + " | ".join(str(command) for command in next_commands if command))
    return "\n".join(lines)


def _xd_watch_store_path() -> Path:
    return _quick_actions_store_path().parent / "watch_state.json"


def _load_xd_watch_store() -> dict[str, Any]:
    path = _xd_watch_store_path()
    if not path.exists():
        return {"version": 1}
    try:
        parsed = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {"version": 1}
    return parsed if isinstance(parsed, dict) else {"version": 1}


def _save_xd_watch_snapshot(snapshot: dict[str, Any]) -> None:
    path = _xd_watch_store_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps({"version": 1, "snapshot": snapshot}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def _watch_reset() -> str:
    path = _xd_watch_store_path()
    try:
        path.unlink(missing_ok=True)
    except Exception as exc:
        return f"Xenesis Desk watch: ERROR\nPath: {path}\nError: {str(exc) or exc.__class__.__name__}"
    return f"Xenesis Desk watch: RESET\nPath: {path}\nPrevious watch baseline cleared.\nNext: /xd watch"


def _watch_fingerprint(item: dict[str, Any], identity_keys: tuple[str, ...]) -> str:
    for key in identity_keys:
        value = str(item.get(key) or "").strip()
        if value:
            return f"{key}:{value}"
    payload = json.dumps(item, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha1(payload.encode("utf-8")).hexdigest()[:16]


def _watch_normalize_diagnostics(items: Any, limit: int) -> list[dict[str, str]]:
    if not isinstance(items, list):
        return []
    normalized: list[dict[str, str]] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        message = str(item.get("message") or item.get("text") or "").strip()
        source = str(item.get("source") or item.get("origin") or "system").strip() or "system"
        level = str(item.get("level") or item.get("severity") or "info").strip().lower() or "info"
        when = str(item.get("timestamp") or item.get("time") or item.get("createdAt") or "").strip()
        normalized.append({
            "level": level,
            "source": source,
            "message": message,
            "time": when,
        })
    return normalized[:_normalize_limit(limit, default=10, maximum=50)]


def _watch_normalize_inbox(items: Any, limit: int) -> list[dict[str, str]]:
    if not isinstance(items, list):
        return []
    normalized: list[dict[str, str]] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        item_id = str(item.get("id") or item.get("requestId") or "").strip()
        title = str(item.get("title") or item_id or "Hermes Action Request").strip()
        normalized.append({
            "id": item_id,
            "status": str(item.get("status") or "pending").strip().lower() or "pending",
            "kind": str(item.get("kind") or "approval").strip() or "approval",
            "title": title,
        })
    return normalized[:_normalize_limit(limit, default=10, maximum=50)]


def _watch_readiness_changes(previous: dict[str, Any], current: dict[str, Any]) -> list[str]:
    changes: list[str] = []
    previous_summary = str(previous.get("summary") or "UNKNOWN").upper()
    current_summary = str(current.get("summary") or "UNKNOWN").upper()
    if previous_summary != current_summary:
        changes.append(f"Readiness: {previous_summary} -> {current_summary}")

    previous_checks = {
        str(check.get("name") or ""): str(check.get("status") or "").upper()
        for check in previous.get("checks", [])
        if isinstance(check, dict)
    } if isinstance(previous.get("checks"), list) else {}
    current_checks = {
        str(check.get("name") or ""): str(check.get("status") or "").upper()
        for check in current.get("checks", [])
        if isinstance(check, dict)
    } if isinstance(current.get("checks"), list) else {}
    for name, current_status in current_checks.items():
        if not name:
            continue
        previous_status = previous_checks.get(name)
        if previous_status and previous_status != current_status:
            changes.append(f"Readiness check {name}: {previous_status} -> {current_status}")
    return changes


def _watch_new_diagnostics(previous: list[dict[str, Any]], current: list[dict[str, Any]]) -> list[str]:
    previous_keys = {_watch_fingerprint(item, ("time", "message")) for item in previous if isinstance(item, dict)}
    lines: list[str] = []
    for item in current:
        if not isinstance(item, dict):
            continue
        key = _watch_fingerprint(item, ("time", "message"))
        if key in previous_keys:
            continue
        level = str(item.get("level") or "info")
        source = str(item.get("source") or "system")
        message = str(item.get("message") or "").strip()
        lines.append(f"New diagnostic: [{level}] {source}: {message}" if message else f"New diagnostic: [{level}] {source}")
    return lines


def _watch_new_inbox_items(previous: list[dict[str, Any]], current: list[dict[str, Any]]) -> list[str]:
    previous_keys = {_watch_fingerprint(item, ("id", "title")) for item in previous if isinstance(item, dict)}
    lines: list[str] = []
    for item in current:
        if not isinstance(item, dict):
            continue
        key = _watch_fingerprint(item, ("id", "title"))
        if key in previous_keys:
            continue
        status = str(item.get("status") or "pending")
        kind = str(item.get("kind") or "approval")
        title = str(item.get("title") or item.get("id") or "Hermes Action Request")
        lines.append(f"New inbox item: [{status}] {kind}: {title}")
    return lines


def _watch_next_commands(summary: str, changes: list[str]) -> list[str]:
    normalized_summary = str(summary).upper()
    if normalized_summary == "BASELINE":
        return ["/xd watch", "/xd readiness"]
    if normalized_summary == "QUIET":
        return ["/xd watch", "/xd readiness"]
    next_commands: list[str] = []
    if any(change.startswith("Readiness") for change in changes):
        next_commands.append("/xd readiness")
    if any(change.startswith("New diagnostic") for change in changes):
        next_commands.append("/xd logs")
    if any(change.startswith("New inbox item") for change in changes):
        next_commands.append("/xd inbox")
    if changes:
        next_commands.append("/xd support-bundle")
    return list(dict.fromkeys(next_commands or ["/xd watch", "/xd readiness"]))


def _run_xd_watch(limit: int = 10) -> dict[str, Any]:
    display_limit = _normalize_limit(limit, default=10, maximum=50)
    store = _load_xd_watch_store()
    previous = store.get("snapshot") if isinstance(store.get("snapshot"), dict) else None

    readiness = _run_xd_readiness()
    diagnostics_result = _parse_json_result(handle_recent_diagnostics({"limit": display_limit}))
    inbox_result = _run_xd_inbox(limit=display_limit)
    diagnostics = _watch_normalize_diagnostics(diagnostics_result.get("diagnostics"), display_limit)
    inbox = _watch_normalize_inbox(inbox_result.get("items"), display_limit)
    snapshot = {
        "capturedAt": time.time(),
        "limit": display_limit,
        "readiness": {
            "summary": str(readiness.get("summary") or "UNKNOWN").upper(),
            "checks": readiness.get("checks") if isinstance(readiness.get("checks"), list) else [],
        },
        "diagnostics": diagnostics,
        "inbox": inbox,
    }

    if previous is None:
        changes = ["Baseline captured. Run /xd watch again to see changes."]
        summary = "BASELINE"
    else:
        previous_readiness = previous.get("readiness") if isinstance(previous.get("readiness"), dict) else {}
        previous_diagnostics = previous.get("diagnostics") if isinstance(previous.get("diagnostics"), list) else []
        previous_inbox = previous.get("inbox") if isinstance(previous.get("inbox"), list) else []
        changes = [
            *_watch_readiness_changes(previous_readiness, snapshot["readiness"]),
            *_watch_new_diagnostics(previous_diagnostics, diagnostics),
            *_watch_new_inbox_items(previous_inbox, inbox),
        ]
        if not changes:
            changes = ["No new Xenesis Desk changes since last watch."]
        summary = "CHANGED" if changes and not changes[0].startswith("No new") else "QUIET"

    _save_xd_watch_snapshot(snapshot)
    return {
        "summary": summary,
        "limit": display_limit,
        "readiness": snapshot["readiness"]["summary"],
        "counts": {
            "diagnostics": len(diagnostics),
            "inbox": len(inbox),
        },
        "previous": previous is not None,
        "changes": changes,
        "nextCommands": _watch_next_commands(summary, changes),
        "path": str(_xd_watch_store_path()),
    }


def _format_xd_watch(result: dict[str, Any]) -> str:
    lines = [
        f"Xenesis Desk watch: {str(result.get('summary') or 'UNKNOWN').upper()}",
        f"Readiness: {str(result.get('readiness') or 'UNKNOWN').upper()}",
    ]
    counts = result.get("counts") if isinstance(result.get("counts"), dict) else {}
    lines.append(f"Counts: diagnostics={counts.get('diagnostics', 0)} inbox={counts.get('inbox', 0)}")
    changes = result.get("changes")
    if isinstance(changes, list):
        lines.append("Changes:")
        for change in changes:
            if change:
                lines.append(f"- {change}")
    next_commands = result.get("nextCommands")
    if isinstance(next_commands, list) and next_commands:
        lines.append("Next: " + " | ".join(str(command) for command in next_commands if command))
    return "\n".join(lines)


def _timeline_entry(
    timestamp: float,
    source: str,
    kind: str,
    title: str,
    detail: str = "",
    command: str = "",
    file_path: str = "",
) -> dict[str, Any]:
    return {
        "timestamp": timestamp,
        "when": _format_action_timestamp(timestamp),
        "source": source,
        "kind": kind,
        "title": title,
        "detail": detail,
        "command": command,
        "filePath": file_path,
    }


def _timeline_watch_entry() -> dict[str, Any] | None:
    store = _load_xd_watch_store()
    snapshot = store.get("snapshot") if isinstance(store.get("snapshot"), dict) else None
    if not isinstance(snapshot, dict):
        return None
    try:
        timestamp = float(snapshot.get("capturedAt") or 0)
    except (TypeError, ValueError):
        timestamp = 0.0
    if timestamp <= 0:
        try:
            timestamp = _xd_watch_store_path().stat().st_mtime
        except Exception:
            timestamp = time.time()
    readiness = snapshot.get("readiness") if isinstance(snapshot.get("readiness"), dict) else {}
    readiness_summary = str(readiness.get("summary") or "UNKNOWN").upper()
    diagnostics_count = _list_count(snapshot.get("diagnostics"))
    inbox_count = _list_count(snapshot.get("inbox"))
    detail = f"readiness={readiness_summary} diagnostics={diagnostics_count} inbox={inbox_count}"
    return _timeline_entry(
        timestamp,
        "watch",
        "watch",
        "Watch checkpoint",
        detail,
        "/xd watch",
        str(_xd_watch_store_path()),
    )


def _timeline_export_entries(limit: int) -> list[dict[str, Any]]:
    result = _run_xd_exports(limit=limit)
    entries = result.get("entries") if isinstance(result.get("entries"), list) else []
    timeline_entries: list[dict[str, Any]] = []
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        try:
            timestamp = float(entry.get("modifiedAt") or 0)
        except (TypeError, ValueError):
            timestamp = 0.0
        if timestamp <= 0:
            continue
        kind = str(entry.get("kind") or "export")
        file_name = str(entry.get("fileName") or Path(str(entry.get("filePath") or "")).name)
        index = entry.get("index") or "?"
        size = entry.get("size")
        detail = file_name
        if isinstance(size, int):
            detail = f"{detail} ({size} bytes)"
        timeline_entries.append(_timeline_entry(
            timestamp,
            "export",
            kind,
            f"{kind} export",
            detail,
            f"/xd exports open #{index}",
            str(entry.get("filePath") or ""),
        ))
    return timeline_entries


def _run_xd_timeline(limit: int = 10) -> dict[str, Any]:
    display_limit = _normalize_limit(limit, default=10, maximum=50)
    entries: list[dict[str, Any]] = []
    watch_entry = _timeline_watch_entry()
    if watch_entry:
        entries.append(watch_entry)
    entries.extend(_timeline_export_entries(display_limit))
    entries.sort(key=lambda item: (float(item.get("timestamp") or 0), str(item.get("title") or "")), reverse=True)
    limited = entries[:display_limit]
    for index, entry in enumerate(limited, start=1):
        entry["index"] = index
    return {
        "summary": "OK" if limited else "EMPTY",
        "limit": display_limit,
        "count": len(limited),
        "entries": limited,
        "nextCommands": ["/xd watch", "/xd exports", "/xd support-bundle"] if limited else ["/xd watch", "/xd export handoff"],
    }


def _format_xd_timeline(result: dict[str, Any]) -> str:
    lines = [
        f"Xenesis Desk timeline: {str(result.get('summary') or 'UNKNOWN').upper()}",
        f"Limit: {result.get('limit') or 10}",
    ]
    entries = result.get("entries") if isinstance(result.get("entries"), list) else []
    if not entries:
        lines.append("No Xenesis Desk timeline events found.")
        next_commands = result.get("nextCommands") if isinstance(result.get("nextCommands"), list) else []
        if next_commands:
            lines.append("Next: " + " | ".join(str(command) for command in next_commands if command))
        return "\n".join(lines)

    for entry in entries:
        if not isinstance(entry, dict):
            continue
        index = entry.get("index") or "?"
        when = str(entry.get("when") or "")
        source = str(entry.get("source") or "event")
        kind = str(entry.get("kind") or "event")
        title = str(entry.get("title") or "Xenesis Desk event")
        detail = str(entry.get("detail") or "").strip()
        command = str(entry.get("command") or "").strip()
        lines.append(f"{index}. {when} [{source}/{kind}] {title}".rstrip())
        if detail:
            lines.append(f"   {detail}")
        if command:
            lines.append(f"   -> {command}")
    next_commands = result.get("nextCommands")
    if isinstance(next_commands, list) and next_commands:
        lines.append("Next: " + " | ".join(str(command) for command in next_commands if command))
    return "\n".join(lines)


def _digest_brief_lines(brief_result: dict[str, Any], limit: int) -> list[str]:
    lines: list[str] = []
    for line in _format_xd_brief(brief_result).splitlines():
        text = str(line or "").strip()
        if not text:
            continue
        if text.startswith("Xenesis Desk brief:") or text.startswith("Next:"):
            continue
        lines.append(text)
    return lines[:_normalize_limit(limit, default=3, maximum=10)]


def _digest_next_commands(*command_lists: Any) -> list[str]:
    commands: list[str] = []
    for command_list in command_lists:
        if not isinstance(command_list, list):
            continue
        for command in command_list:
            text = str(command or "").strip()
            if text and text not in commands:
                commands.append(text)
    return commands[:8] or ["/xd readiness", "/xd watch", "/xd support-bundle"]


def _run_xd_digest(limit: int = 3) -> dict[str, Any]:
    display_limit = _normalize_limit(limit, default=3, maximum=10)
    readiness = _run_xd_readiness()
    watch = _run_xd_watch(limit=display_limit)
    brief = _run_xd_brief(limit=display_limit)
    timeline = _run_xd_timeline(limit=display_limit)

    timeline_entries = timeline.get("entries") if isinstance(timeline.get("entries"), list) else []
    watch_changes = watch.get("changes") if isinstance(watch.get("changes"), list) else []
    watch_counts = watch.get("counts") if isinstance(watch.get("counts"), dict) else {}
    return {
        "summary": str(readiness.get("summary") or watch.get("readiness") or "UNKNOWN").upper(),
        "limit": display_limit,
        "readinessSummary": str(readiness.get("summary") or "UNKNOWN").upper(),
        "watchSummary": str(watch.get("summary") or "UNKNOWN").upper(),
        "watchCounts": {
            "diagnostics": watch_counts.get("diagnostics", 0),
            "inbox": watch_counts.get("inbox", 0),
        },
        "watchChanges": [str(change) for change in watch_changes if str(change or "").strip()][:display_limit],
        "briefLines": _digest_brief_lines(brief, display_limit),
        "timelineEntries": [entry for entry in timeline_entries if isinstance(entry, dict)][:display_limit],
        "nextCommands": _digest_next_commands(
            watch.get("nextCommands"),
            readiness.get("nextCommands"),
            timeline.get("nextCommands"),
        ),
    }


def _format_xd_digest(result: dict[str, Any]) -> str:
    lines = [
        f"Xenesis Desk digest: {str(result.get('summary') or 'UNKNOWN').upper()}",
        f"Readiness: {str(result.get('readinessSummary') or 'UNKNOWN').upper()}",
    ]
    counts = result.get("watchCounts") if isinstance(result.get("watchCounts"), dict) else {}
    lines.append(
        f"Watch: {str(result.get('watchSummary') or 'UNKNOWN').upper()} "
        f"diagnostics={counts.get('diagnostics', 0)} inbox={counts.get('inbox', 0)}"
    )

    changes = result.get("watchChanges") if isinstance(result.get("watchChanges"), list) else []
    if changes:
        lines.append("Changes:")
        for change in changes:
            if change:
                lines.append(f"- {change}")

    brief_lines = result.get("briefLines") if isinstance(result.get("briefLines"), list) else []
    if brief_lines:
        lines.append("Context:")
        for line in brief_lines:
            if line:
                lines.append(f"- {line}")

    timeline_entries = result.get("timelineEntries") if isinstance(result.get("timelineEntries"), list) else []
    if timeline_entries:
        lines.append("Timeline:")
        for entry in timeline_entries:
            if not isinstance(entry, dict):
                continue
            index = entry.get("index") or "?"
            when = str(entry.get("when") or "")
            source = str(entry.get("source") or "event")
            kind = str(entry.get("kind") or "event")
            title = str(entry.get("title") or "Xenesis Desk event")
            detail = str(entry.get("detail") or "").strip()
            lines.append(f"{index}. {when} [{source}/{kind}] {title}".rstrip())
            if detail:
                lines.append(f"   {detail}")

    next_commands = result.get("nextCommands")
    if isinstance(next_commands, list) and next_commands:
        lines.append("Next: " + " | ".join(str(command) for command in next_commands if command))
    return "\n".join(lines)


def _snapshot_call(name: str, path_name: str, payload: dict[str, Any], errors: list[dict[str, str]]) -> dict[str, Any]:
    try:
        result = _call_bridge(path_name, payload)
    except Exception as exc:
        errors.append({"name": name, "detail": str(exc) or exc.__class__.__name__})
        return {}
    if not isinstance(result, dict):
        errors.append({"name": name, "detail": "bridge returned non-object payload"})
        return {}
    if result.get("success") is False or result.get("ok") is False:
        errors.append({
            "name": name,
            "detail": str(result.get("error") or result.get("message") or "returned failure"),
        })
    return result


def _run_xd_snapshot(limit: int = 5) -> dict[str, Any]:
    display_limit = _normalize_limit(limit, default=5, maximum=20)
    errors: list[dict[str, str]] = []
    state = _snapshot_call("State", "/state", {}, errors)
    active_context = _snapshot_call("Active context", "/active-context", {}, errors)
    terminal_list = _snapshot_call("Terminal list", "/terminal/list", {}, errors)
    open_files = _snapshot_call("Open files", "/files/open", {}, errors)
    diagnostics = _snapshot_call("Recent diagnostics", "/diagnostics/recent", {"limit": display_limit}, errors)
    return {
        "summary": "PARTIAL" if errors else "OK",
        "limit": display_limit,
        "counts": {
            "terminals": _list_count(state.get("terminals")),
            "panels": _list_count(state.get("panels")),
            "openFiles": _list_count(state.get("openFiles")),
            "diagnostics": _list_count(state.get("diagnostics")),
        },
        "state": state,
        "activeContext": active_context,
        "terminals": terminal_list.get("sessions") if isinstance(terminal_list.get("sessions"), list) else [],
        "openFiles": open_files.get("openFiles") if isinstance(open_files.get("openFiles"), list) else [],
        "diagnostics": diagnostics.get("diagnostics") if isinstance(diagnostics.get("diagnostics"), list) else [],
        "errors": errors,
    }


def _limited_snapshot_items(items: Any, limit: int) -> list[Any]:
    return items[:limit] if isinstance(items, list) else []


def _snapshot_active_lines(active_context: dict[str, Any]) -> list[str]:
    active_content = active_context.get("activeContent") if isinstance(active_context.get("activeContent"), dict) else {}
    active_open_file = active_context.get("activeOpenFile") if isinstance(active_context.get("activeOpenFile"), dict) else {}
    active_panel = active_context.get("activePanel") if isinstance(active_context.get("activePanel"), dict) else {}
    active_terminal = active_context.get("activeTerminal") if isinstance(active_context.get("activeTerminal"), dict) else {}
    lines: list[str] = []
    file_path = str(active_open_file.get("filePath") or "").strip()
    if file_path:
        lines.append(f"Active file: {file_path}")
    if active_content:
        content_id = str(active_content.get("id") or "").strip()
        title = str(active_content.get("title") or "").strip()
        content_type = str(active_content.get("contentType") or "").strip()
        title_text = f" - {title}" if title else ""
        type_text = f" [{content_type}]" if content_type else ""
        lines.append(f"Active content: {content_id}{title_text}{type_text}".strip())
    if active_panel:
        panel_title = str(active_panel.get("title") or active_panel.get("contentId") or "").strip()
        if panel_title:
            lines.append(f"Active panel: {panel_title}")
    if active_terminal:
        terminal_id = str(active_terminal.get("id") or "").strip()
        terminal_title = str(active_terminal.get("title") or active_terminal.get("shell") or "").strip()
        title_text = f" - {terminal_title}" if terminal_title else ""
        lines.append(f"Active terminal: {terminal_id}{title_text}".strip())
    return lines


def _snapshot_terminal_lines(items: list[Any], limit: int) -> list[str]:
    lines = ["Terminals:"]
    for index, item in enumerate(_limited_snapshot_items(items, limit), start=1):
        if not isinstance(item, dict):
            continue
        session_id = str(item.get("id") or item.get("jobId") or "").strip()
        title = str(item.get("title") or item.get("shell") or item.get("command") or "terminal").strip()
        cwd = str(item.get("cwd") or "").strip()
        suffix = f" ({cwd})" if cwd else ""
        label = f"{session_id}: {title}" if session_id else title
        lines.append(f"{index}. {label}{suffix}")
    if len(lines) == 1:
        lines.append("None")
    return lines


def _snapshot_open_file_lines(items: list[Any], limit: int) -> list[str]:
    lines = ["Open files:"]
    for index, item in enumerate(_limited_snapshot_items(items, limit), start=1):
        if not isinstance(item, dict):
            continue
        label = str(item.get("filePath") or item.get("contentId") or item.get("id") or "").strip()
        placement = str(item.get("placement") or "").strip()
        suffix = f" ({placement})" if placement else ""
        if label:
            lines.append(f"{index}. {label}{suffix}")
    if len(lines) == 1:
        lines.append("None")
    return lines


def _snapshot_diagnostic_lines(items: list[Any], limit: int) -> list[str]:
    lines = ["Diagnostics:"]
    for item in _limited_snapshot_items(items, limit):
        if not isinstance(item, dict):
            continue
        level = str(item.get("level") or "info")
        source = str(item.get("source") or "system")
        message = str(item.get("message") or "")
        lines.append(f"- [{level}] {source}: {message}")
    if len(lines) == 1:
        lines.append("None")
    return lines


def _format_xd_snapshot(result: dict[str, Any]) -> str:
    summary = str(result.get("summary") or "UNKNOWN").upper()
    limit = _normalize_limit(result.get("limit"), default=5, maximum=20)
    counts = result.get("counts") if isinstance(result.get("counts"), dict) else {}
    lines = [
        f"Xenesis Desk snapshot: {summary}",
        (
            f"Counts: terminals={counts.get('terminals', 0)} "
            f"panels={counts.get('panels', 0)} "
            f"files={counts.get('openFiles', 0)} "
            f"diagnostics={counts.get('diagnostics', 0)}"
        ),
    ]
    active_lines = _snapshot_active_lines(
        result.get("activeContext") if isinstance(result.get("activeContext"), dict) else {}
    )
    if active_lines:
        lines.extend(active_lines)
    else:
        lines.append("Active: none")
    lines.extend(["", *_snapshot_terminal_lines(result.get("terminals") if isinstance(result.get("terminals"), list) else [], limit)])
    lines.extend(["", *_snapshot_open_file_lines(result.get("openFiles") if isinstance(result.get("openFiles"), list) else [], limit)])
    lines.extend(["", *_snapshot_diagnostic_lines(result.get("diagnostics") if isinstance(result.get("diagnostics"), list) else [], limit)])
    errors = result.get("errors")
    if isinstance(errors, list) and errors:
        lines.extend(["", "Errors:"])
        for item in errors:
            if not isinstance(item, dict):
                continue
            name = str(item.get("name") or "Step")
            detail = str(item.get("detail") or "").strip()
            lines.append(f"- {name}: {detail}" if detail else f"- {name}")
    return "\n".join(lines)


def _brief_active_label(active_context: dict[str, Any]) -> str:
    active_content = active_context.get("activeContent") if isinstance(active_context.get("activeContent"), dict) else {}
    active_open_file = active_context.get("activeOpenFile") if isinstance(active_context.get("activeOpenFile"), dict) else {}
    active_panel = active_context.get("activePanel") if isinstance(active_context.get("activePanel"), dict) else {}
    active_terminal = active_context.get("activeTerminal") if isinstance(active_context.get("activeTerminal"), dict) else {}
    file_path = str(active_open_file.get("filePath") or "").strip()
    if file_path:
        return file_path
    title = str(active_content.get("title") or active_content.get("id") or "").strip()
    if title:
        return title
    panel_title = str(active_panel.get("title") or active_panel.get("contentId") or "").strip()
    if panel_title:
        return panel_title
    terminal_title = str(active_terminal.get("title") or active_terminal.get("id") or "").strip()
    return terminal_title or "none"


def _brief_terminal_label(item: Any) -> str:
    if not isinstance(item, dict):
        return ""
    session_id = str(item.get("id") or item.get("jobId") or "").strip()
    title = str(item.get("title") or item.get("shell") or item.get("command") or "terminal").strip()
    cwd = str(item.get("cwd") or "").strip()
    label = f"{session_id}: {title}" if session_id else title
    return f"{label} ({cwd})" if cwd else label


def _brief_open_file_label(item: Any) -> str:
    if not isinstance(item, dict):
        return ""
    return str(item.get("filePath") or item.get("contentId") or item.get("id") or "").strip()


def _brief_join(items: Any, limit: int, formatter) -> str:
    labels = [
        label
        for label in (formatter(item) for item in _limited_snapshot_items(items, limit))
        if label
    ]
    return "; ".join(labels) if labels else "none"


def _brief_diagnostic_lines(items: Any, limit: int) -> list[str]:
    diagnostics: list[str] = []
    for item in _limited_snapshot_items(items, limit):
        if not isinstance(item, dict):
            continue
        level = str(item.get("level") or "info")
        source = str(item.get("source") or "system")
        message = str(item.get("message") or "").strip()
        diagnostics.append(f"- [{level}] {source}: {message}" if message else f"- [{level}] {source}")
    return diagnostics or ["Diagnostics: none"]


def _format_xd_brief_snapshot(snapshot: dict[str, Any]) -> str:
    summary = str(snapshot.get("summary") or "UNKNOWN").upper()
    limit = _normalize_limit(snapshot.get("limit"), default=3, maximum=10)
    counts = snapshot.get("counts") if isinstance(snapshot.get("counts"), dict) else {}
    active_context = snapshot.get("activeContext") if isinstance(snapshot.get("activeContext"), dict) else {}
    diagnostics = _brief_diagnostic_lines(snapshot.get("diagnostics"), limit)
    lines = [
        f"Xenesis Desk brief: {summary}",
        (
            f"Counts: terminals={counts.get('terminals', 0)} "
            f"panels={counts.get('panels', 0)} "
            f"files={counts.get('openFiles', 0)} "
            f"diagnostics={counts.get('diagnostics', 0)}"
        ),
        f"Active: {_brief_active_label(active_context)}",
        f"Files: {_brief_join(snapshot.get('openFiles'), limit, _brief_open_file_label)}",
        f"Terminals: {_brief_join(snapshot.get('terminals'), limit, _brief_terminal_label)}",
    ]
    if diagnostics == ["Diagnostics: none"]:
        lines.extend(diagnostics)
    else:
        lines.append("Diagnostics:")
        lines.extend(diagnostics)
    errors = snapshot.get("errors")
    if isinstance(errors, list) and errors:
        lines.append(f"Errors: {len(errors)}")
    lines.append(f"Next: /xd mobile | /xd snapshot {limit} | /xd export handoff {limit}")
    return "\n".join(lines)


def _run_xd_brief(limit: int = 3) -> dict[str, Any]:
    display_limit = _normalize_limit(limit, default=3, maximum=10)
    snapshot = _run_xd_snapshot(limit=display_limit)
    return {
        "summary": str(snapshot.get("summary") or "UNKNOWN").upper(),
        "limit": display_limit,
        "snapshot": snapshot,
        "brief": _format_xd_brief_snapshot(snapshot),
    }


def _format_xd_brief(result: dict[str, Any]) -> str:
    return str(result.get("brief") or "Xenesis Desk brief: UNKNOWN")


def _handoff_active_lines(active_context: dict[str, Any]) -> list[str]:
    active_content = active_context.get("activeContent") if isinstance(active_context.get("activeContent"), dict) else {}
    active_open_file = active_context.get("activeOpenFile") if isinstance(active_context.get("activeOpenFile"), dict) else {}
    active_panel = active_context.get("activePanel") if isinstance(active_context.get("activePanel"), dict) else {}
    active_terminal = active_context.get("activeTerminal") if isinstance(active_context.get("activeTerminal"), dict) else {}
    lines: list[str] = []
    file_path = str(active_open_file.get("filePath") or "").strip()
    if file_path:
        lines.append(f"- File: {file_path}")
    if active_content:
        content_id = str(active_content.get("id") or "").strip()
        title = str(active_content.get("title") or "").strip()
        content_type = str(active_content.get("contentType") or "").strip()
        title_text = f" - {title}" if title else ""
        type_text = f" [{content_type}]" if content_type else ""
        lines.append(f"- Content: {content_id}{title_text}{type_text}".strip())
    if active_panel:
        panel_title = str(active_panel.get("title") or active_panel.get("contentId") or "").strip()
        if panel_title:
            lines.append(f"- Panel: {panel_title}")
    if active_terminal:
        terminal_id = str(active_terminal.get("id") or "").strip()
        terminal_title = str(active_terminal.get("title") or active_terminal.get("shell") or "").strip()
        title_text = f" - {terminal_title}" if terminal_title else ""
        lines.append(f"- Terminal: {terminal_id}{title_text}".strip())
    return lines or ["- None"]


def _handoff_terminal_lines(items: list[Any], limit: int) -> list[str]:
    lines: list[str] = []
    for index, item in enumerate(_limited_snapshot_items(items, limit), start=1):
        if not isinstance(item, dict):
            continue
        session_id = str(item.get("id") or item.get("jobId") or "").strip()
        title = str(item.get("title") or item.get("shell") or item.get("command") or "terminal").strip()
        cwd = str(item.get("cwd") or "").strip()
        suffix = f" ({cwd})" if cwd else ""
        label = f"{session_id}: {title}" if session_id else title
        lines.append(f"{index}. {label}{suffix}")
    return lines or ["None"]


def _handoff_open_file_lines(items: list[Any], limit: int) -> list[str]:
    lines: list[str] = []
    for index, item in enumerate(_limited_snapshot_items(items, limit), start=1):
        if not isinstance(item, dict):
            continue
        label = str(item.get("filePath") or item.get("contentId") or item.get("id") or "").strip()
        placement = str(item.get("placement") or "").strip()
        suffix = f" ({placement})" if placement else ""
        if label:
            lines.append(f"{index}. {label}{suffix}")
    return lines or ["None"]


def _handoff_diagnostic_lines(items: list[Any], limit: int) -> list[str]:
    lines: list[str] = []
    for item in _limited_snapshot_items(items, limit):
        if not isinstance(item, dict):
            continue
        level = str(item.get("level") or "info")
        source = str(item.get("source") or "system")
        message = str(item.get("message") or "")
        lines.append(f"- [{level}] {source}: {message}")
    return lines or ["None"]


def _format_xd_handoff_markdown(snapshot: dict[str, Any]) -> str:
    summary = str(snapshot.get("summary") or "UNKNOWN").upper()
    limit = _normalize_limit(snapshot.get("limit"), default=5, maximum=20)
    counts = snapshot.get("counts") if isinstance(snapshot.get("counts"), dict) else {}
    lines = [
        "# Xenesis Desk Handoff",
        "",
        f"Status: {summary}",
        (
            f"Counts: terminals={counts.get('terminals', 0)} "
            f"panels={counts.get('panels', 0)} "
            f"files={counts.get('openFiles', 0)} "
            f"diagnostics={counts.get('diagnostics', 0)}"
        ),
        "",
        "## Active Context",
        *_handoff_active_lines(snapshot.get("activeContext") if isinstance(snapshot.get("activeContext"), dict) else {}),
        "",
        "## Open Files",
        *_handoff_open_file_lines(snapshot.get("openFiles") if isinstance(snapshot.get("openFiles"), list) else [], limit),
        "",
        "## Terminals",
        *_handoff_terminal_lines(snapshot.get("terminals") if isinstance(snapshot.get("terminals"), list) else [], limit),
        "",
        "## Recent Diagnostics",
        *_handoff_diagnostic_lines(snapshot.get("diagnostics") if isinstance(snapshot.get("diagnostics"), list) else [], limit),
    ]
    errors = snapshot.get("errors")
    if isinstance(errors, list) and errors:
        lines.extend(["", "## Snapshot Errors"])
        for item in errors:
            if not isinstance(item, dict):
                continue
            name = str(item.get("name") or "Step")
            detail = str(item.get("detail") or "").strip()
            lines.append(f"- {name}: {detail}" if detail else f"- {name}")
    lines.extend([
        "",
        "## Next Commands",
        f"- /xd snapshot {limit}",
        "- /xd selftest",
        "- /xd doctor",
        "- /xd repair",
        "- /xd context-actions",
    ])
    return "\n".join(lines)


def _run_xd_handoff(limit: int = 5) -> dict[str, Any]:
    display_limit = _normalize_limit(limit, default=5, maximum=20)
    snapshot = _run_xd_snapshot(limit=display_limit)
    return {
        "summary": str(snapshot.get("summary") or "UNKNOWN").upper(),
        "limit": display_limit,
        "snapshot": snapshot,
        "markdown": _format_xd_handoff_markdown(snapshot),
    }


def _format_xd_handoff(result: dict[str, Any]) -> str:
    return str(result.get("markdown") or "# Xenesis Desk Handoff\n\nStatus: UNKNOWN")


def _xd_export_dir() -> Path:
    env_dir = os.getenv("XENIS_EXPORT_DIR", "").strip()
    if env_dir:
        return Path(env_dir).expanduser()
    try:
        state_file = _bridge_state_file()
    except Exception:
        state_file = Path.home() / ".xenis" / "mcp" / "bridge.json"
    for parent in [state_file.parent, *state_file.parents]:
        if parent.name == ".xenis":
            return parent / "exports" / "hermes"
    return Path.home() / ".xenis" / "exports" / "hermes"


def _handle_xcon_render(xcon_input: str) -> str:
    args: dict[str, Any] = {"xcon": xcon_input, "theme": "light"}
    try:
        result = _call_bridge("/capabilities/call", {
            "path": "xd.xcon.renderToPng",
            "args": args,
            "approved": True,
            "source": "gateway",
        })
    except Exception as exc:
        return f"XCON render failed: {exc}"
    inner = result if isinstance(result, dict) else {}
    nested = inner.get("result") if isinstance(inner.get("result"), dict) else inner
    base64_data = str(nested.get("base64") or "").strip()
    if not base64_data:
        error = str(nested.get("error") or inner.get("error") or "unknown error")
        return f"XCON render failed: {error}"
    png_bytes = nested.get("pngBytes") or 0
    width = nested.get("width") or 0
    height = nested.get("height") or 0
    export_dir = _xd_export_dir() / "renders"
    export_dir.mkdir(parents=True, exist_ok=True)
    stamp = time.strftime("%Y%m%d-%H%M%S", time.localtime())
    suffix = int(time.time() * 1000) % 100000
    file_name = f"xcon-render-{stamp}-{suffix:05d}.png"
    file_path = export_dir / file_name
    file_path.write_bytes(base64.b64decode(base64_data))
    path_str = str(file_path)
    media = _media_directive(path_str)
    return f"XCON rendered ({width}x{height}, {png_bytes} bytes)\n\n{media}"


def _xd_export_filename(kind: str) -> str:
    safe_kind = _slugify(kind or "handoff") or "handoff"
    stamp = time.strftime("%Y%m%d-%H%M%S", time.localtime())
    suffix = int(time.time() * 1000) % 100000
    return f"xd-{safe_kind}-{stamp}-{suffix:05d}.md"


def _xd_export_content(kind: str, limit: int) -> tuple[str, str]:
    export_kind = str(kind or "handoff").strip().lower()
    if export_kind in {"snapshot", "snap"}:
        snapshot = _run_xd_snapshot(limit=limit)
        return "snapshot", _format_xd_snapshot(snapshot)
    handoff = _run_xd_handoff(limit=limit)
    return "handoff", _format_xd_handoff(handoff)


def _run_xd_export(kind: str = "handoff", limit: int = 5, open_in_xd: bool = True) -> dict[str, Any]:
    display_limit = _normalize_limit(limit, default=5, maximum=20)
    export_kind, content = _xd_export_content(kind, display_limit)
    export_dir = _xd_export_dir()
    export_dir.mkdir(parents=True, exist_ok=True)
    file_path = export_dir / _xd_export_filename(export_kind)
    file_path.write_text(content, encoding="utf-8")

    opened = False
    open_error = ""
    if open_in_xd:
        try:
            payload = _call_bridge(
                "/open-file",
                _bridge_open_file_payload(str(file_path), {}),
            )
            opened = bool(payload.get("opened", payload.get("ok", True)))
        except Exception as exc:
            open_error = str(exc) or exc.__class__.__name__

    return {
        "summary": "PARTIAL" if open_error else "OK",
        "kind": export_kind,
        "limit": display_limit,
        "filePath": str(file_path),
        "opened": opened,
        "openError": open_error,
    }


def _format_xd_export(result: dict[str, Any]) -> str:
    lines = [
        f"Xenesis Desk export: {str(result.get('summary') or 'UNKNOWN').upper()}",
        f"Kind: {result.get('kind') or 'handoff'}",
        f"Path: {result.get('filePath') or ''}",
        f"Opened: {'yes' if result.get('opened') else 'no'}",
    ]
    if result.get("openError"):
        lines.append(f"Open error: {result['openError']}")
    return "\n".join(lines)


def _xd_export_kind_from_name(file_path: Path) -> str:
    match = re.match(r"^xd-([A-Za-z0-9_-]+)-\d{8}-\d{6}-\d{5}\.md$", file_path.name)
    return match.group(1).replace("_", "-") if match else "export"


def _xd_export_entry(file_path: Path, index: int) -> dict[str, Any]:
    stat = file_path.stat()
    return {
        "index": index,
        "kind": _xd_export_kind_from_name(file_path),
        "fileName": file_path.name,
        "filePath": str(file_path),
        "modifiedAt": stat.st_mtime,
        "modified": _format_action_timestamp(stat.st_mtime),
        "size": stat.st_size,
    }


def _xd_export_files(limit: int = 10) -> list[Path]:
    display_limit = _normalize_limit(limit, default=10, maximum=50)
    export_dir = _xd_export_dir()
    if not export_dir.exists():
        return []
    files = [
        item
        for item in export_dir.glob("xd-*.md")
        if item.is_file()
    ]
    files.sort(key=lambda item: (item.stat().st_mtime, item.name), reverse=True)
    return files[:display_limit]


def _run_xd_exports(limit: int = 10) -> dict[str, Any]:
    display_limit = _normalize_limit(limit, default=10, maximum=50)
    entries = [
        _xd_export_entry(file_path, index)
        for index, file_path in enumerate(_xd_export_files(display_limit), start=1)
    ]
    return {
        "summary": "OK",
        "directory": str(_xd_export_dir()),
        "limit": display_limit,
        "count": len(entries),
        "entries": entries,
    }


def _format_xd_exports(result: dict[str, Any]) -> str:
    lines = [
        f"Xenesis Desk exports: {str(result.get('summary') or 'UNKNOWN').upper()}",
        f"Directory: {result.get('directory') or ''}",
    ]
    entries = result.get("entries")
    if not isinstance(entries, list) or not entries:
        lines.append("No exports found.")
        lines.append("Next: /xd export handoff")
        return "\n".join(lines)

    for entry in entries:
        if not isinstance(entry, dict):
            continue
        index = entry.get("index") or "?"
        kind = entry.get("kind") or "export"
        modified = entry.get("modified") or ""
        file_name = entry.get("fileName") or Path(str(entry.get("filePath") or "")).name
        size = entry.get("size")
        suffix = f" ({size} bytes)" if isinstance(size, int) else ""
        lines.append(f"{index}. {kind}: {file_name}{suffix}")
        if modified:
            lines.append(f"   Modified: {modified}")
    lines.append("Open: /xd exports open #1")
    return "\n".join(lines)


def _support_bundle_text_block(text: str) -> str:
    body = str(text or "").rstrip()
    return f"```text\n{body}\n```"


def _support_bundle_section(title: str, producer) -> tuple[str, str]:
    try:
        text = producer()
        return f"## {title}\n\n{_support_bundle_text_block(text)}", ""
    except Exception as exc:
        detail = str(exc) or exc.__class__.__name__
        return f"## {title}\n\n{_support_bundle_text_block(f'ERROR: {detail}')}", detail


def _format_xd_support_bundle_markdown(limit: int) -> tuple[str, list[str]]:
    display_limit = _normalize_limit(limit, default=5, maximum=20)
    generated_at = _format_action_timestamp(time.time())
    section_specs = [
        ("Brief", lambda: _format_xd_brief(_run_xd_brief(limit=min(display_limit, 10)))),
        ("Compatibility", lambda: _format_xd_compatibility(_run_xd_compatibility())),
        ("Upgrade Notes", lambda: _format_xd_upgrade_notes(_run_xd_upgrade_notes())),
        ("Doctor", lambda: _format_bridge_doctor(bridge_doctor())),
        ("Recent Exports", lambda: _format_xd_exports(_run_xd_exports(limit=display_limit))),
    ]
    sections: list[str] = []
    errors: list[str] = []
    for title, producer in section_specs:
        section, error = _support_bundle_section(title, producer)
        sections.append(section)
        if error:
            errors.append(f"{title}: {error}")

    header = [
        "# Xenesis Desk Support Bundle",
        "",
        f"Generated: {generated_at}",
        f"Limit: {display_limit}",
    ]
    return "\n\n".join(["\n".join(header), *sections]) + "\n", errors


def _run_xd_support_bundle(limit: int = 5, open_in_xd: bool = True) -> dict[str, Any]:
    display_limit = _normalize_limit(limit, default=5, maximum=20)
    content, section_errors = _format_xd_support_bundle_markdown(display_limit)
    export_dir = _xd_export_dir()
    export_dir.mkdir(parents=True, exist_ok=True)
    file_path = export_dir / _xd_export_filename("support-bundle")
    file_path.write_text(content, encoding="utf-8")

    opened = False
    open_error = ""
    if open_in_xd:
        try:
            payload = _call_bridge(
                "/open-file",
                _bridge_open_file_payload(str(file_path), {}),
            )
            opened = bool(payload.get("opened", payload.get("ok", True)))
        except Exception as exc:
            open_error = str(exc) or exc.__class__.__name__

    return {
        "summary": "PARTIAL" if section_errors or open_error else "OK",
        "kind": "support-bundle",
        "limit": display_limit,
        "filePath": str(file_path),
        "opened": opened,
        "openError": open_error,
        "sectionErrors": section_errors,
    }


def _format_xd_support_bundle(result: dict[str, Any]) -> str:
    lines = [
        f"Xenesis Desk support bundle: {str(result.get('summary') or 'UNKNOWN').upper()}",
        f"Limit: {result.get('limit') or 5}",
        f"Path: {result.get('filePath') or ''}",
        f"Opened: {'yes' if result.get('opened') else 'no'}",
    ]
    section_errors = result.get("sectionErrors")
    if isinstance(section_errors, list) and section_errors:
        lines.append("Section errors:")
        lines.extend(f"- {error}" for error in section_errors if error)
    if result.get("openError"):
        lines.append(f"Open error: {result['openError']}")
    return "\n".join(lines)


def _selector_index_from_text(value: str) -> int | None:
    text = str(value or "").strip()
    match = SELECTOR_RE.match(text) or BARE_SELECTOR_RE.match(text)
    if not match:
        return None
    try:
        return int(match.group(1))
    except (TypeError, ValueError):
        return None


def _resolve_xd_export_reference(reference: str) -> tuple[Path | None, str]:
    text = _strip_wrapping_quotes(str(reference or "").strip())
    if not text:
        return None, "Usage: /xd exports open <#N|filename>"

    export_dir = _xd_export_dir().resolve()
    index = _selector_index_from_text(text)
    if index is not None:
        files = _xd_export_files(max(index, 10))
        if index < 1 or index > len(files):
            return None, f"Xenesis Desk export selection not found: {text}. Run /xd exports first."
        return files[index - 1], ""

    candidate = Path(text).expanduser()
    if not candidate.is_absolute():
        candidate = export_dir / candidate.name
    try:
        resolved = candidate.resolve()
        resolved.relative_to(export_dir)
    except Exception:
        return None, f"Xenesis Desk export must be inside {export_dir}: {text}"
    if not resolved.is_file() or not resolved.name.startswith("xd-") or resolved.suffix.lower() != ".md":
        return None, f"Xenesis Desk export not found: {text}"
    return resolved, ""


def _run_xd_open_export(reference: str) -> dict[str, Any]:
    file_path, error = _resolve_xd_export_reference(reference)
    if error:
        return {
            "summary": "ERROR",
            "filePath": "",
            "opened": False,
            "error": error,
        }

    opened = False
    open_error = ""
    try:
        payload = _call_bridge(
            "/open-file",
            _bridge_open_file_payload(str(file_path), {}),
        )
        opened = bool(payload.get("opened", payload.get("ok", True)))
    except Exception as exc:
        open_error = str(exc) or exc.__class__.__name__

    return {
        "summary": "PARTIAL" if open_error else "OK",
        "filePath": str(file_path),
        "opened": opened,
        "error": open_error,
    }


def _format_xd_open_export(result: dict[str, Any]) -> str:
    lines = [
        f"Xenesis Desk export open: {str(result.get('summary') or 'UNKNOWN').upper()}",
        f"Path: {result.get('filePath') or ''}",
        f"Opened: {'yes' if result.get('opened') else 'no'}",
    ]
    if result.get("error"):
        lines.append(f"Error: {result['error']}")
    return "\n".join(lines)


def _normalize_xd_inbox_items(payload: dict[str, Any], limit: int) -> list[dict[str, Any]]:
    raw_items = payload.get("actions")
    if not isinstance(raw_items, list):
        raw_items = payload.get("items")
    if not isinstance(raw_items, list):
        raw_items = payload.get("actionInbox")
    if not isinstance(raw_items, list):
        raw_items = []

    normalized: list[dict[str, Any]] = []
    for item in raw_items:
        if not isinstance(item, dict):
            continue
        item_id = str(item.get("id") or item.get("requestId") or item.get("messageId") or "").strip()
        if not item_id:
            continue
        normalized.append({
            "id": item_id,
            "title": str(item.get("title") or "Hermes Action Request").strip() or "Hermes Action Request",
            "kind": str(item.get("kind") or item.get("type") or "approval").strip() or "approval",
            "command": str(item.get("command") or item.get("subject") or "").strip(),
            "description": str(item.get("description") or item.get("reason") or "").strip(),
            "source": str(item.get("source") or "").strip(),
            "sessionId": str(item.get("sessionId") or item.get("chatId") or "").strip(),
            "requester": str(item.get("requester") or item.get("userName") or item.get("userId") or "").strip(),
            "status": str(item.get("status") or "pending").strip().lower() or "pending",
            "updatedAt": str(item.get("updatedAt") or item.get("createdAt") or "").strip(),
            "createdAt": str(item.get("createdAt") or "").strip(),
            "expiresAt": str(item.get("expiresAt") or "").strip(),
        })
    return normalized[:_normalize_limit(limit, default=10, maximum=50)]


def _run_xd_inbox(limit: int = 10) -> dict[str, Any]:
    display_limit = _normalize_limit(limit, default=10, maximum=50)
    try:
        payload = _call_bridge("/action-inbox/list", {"limit": display_limit})
    except Exception as exc:
        error_text = str(exc) or exc.__class__.__name__
        unsupported = "404" in error_text or "not found" in error_text.lower()
        return {
            "summary": "UNSUPPORTED" if unsupported else "ERROR",
            "success": False,
            "unsupported": unsupported,
            "error": (
                "Xenesis Desk action inbox bridge endpoint is not available. "
                "Upgrade or restart Xenesis Desk with action-inbox bridge support."
            ) if unsupported else error_text,
            "limit": display_limit,
            "items": [],
        }
    items = _normalize_xd_inbox_items(payload, display_limit)
    _cache_selection("inbox", items)
    return {
        "summary": "OK" if payload.get("ok", True) else "ERROR",
        "success": payload.get("ok", True) is not False,
        "limit": display_limit,
        "count": len(items),
        "pending": sum(1 for item in items if item.get("status") == "pending"),
        "items": items,
        "error": str(payload.get("error") or ""),
    }


def _format_xd_inbox(result: dict[str, Any]) -> str:
    summary = str(result.get("summary") or "UNKNOWN").upper()
    lines = [f"Xenesis Desk inbox: {summary}"]
    if not result.get("success", True):
        error = str(result.get("error") or "").strip()
        if error:
            lines.append(f"Error: {error}")
        return "\n".join(lines)

    items = result.get("items") if isinstance(result.get("items"), list) else []
    lines.append(f"Items: {len(items)}")
    lines.append(f"Pending: {sum(1 for item in items if isinstance(item, dict) and item.get('status') == 'pending')}")
    if not items:
        lines.append("No Xenesis Desk inbox items.")
        lines.append("Open: /xd inbox open")
        return "\n".join(lines)

    for index, item in enumerate(items, start=1):
        if not isinstance(item, dict):
            continue
        status = str(item.get("status") or "pending")
        kind = str(item.get("kind") or "approval")
        title = str(item.get("title") or item.get("id") or "Hermes Action Request")
        lines.append(f"{index}. [{status}] {kind}: {title}")
        command = str(item.get("command") or "").strip()
        if command:
            lines.append(f"   Command: {command}")
        source = str(item.get("source") or "").strip()
        session_id = str(item.get("sessionId") or "").strip()
        if source or session_id:
            detail = " | ".join(part for part in [f"Source: {source}" if source else "", f"Session: {session_id}" if session_id else ""] if part)
            lines.append(f"   {detail}")
        updated_at = str(item.get("updatedAt") or "").strip()
        if updated_at:
            lines.append(f"   Updated: {updated_at}")
        lines.append(f"   -> /xd inbox open #{index}")
    return "\n".join(lines)


def _resolve_xd_inbox_reference(reference: str) -> tuple[dict[str, Any], str]:
    text = _strip_wrapping_quotes(str(reference or "").strip())
    if not text:
        return {}, ""
    index = _selector_index_from_text(text)
    lookup = _run_xd_inbox(limit=max(index or 0, 10) if index else 50)
    if not lookup.get("success", True):
        return {}, str(lookup.get("error") or "Xenesis Desk inbox is unavailable.")
    items = lookup.get("items") if isinstance(lookup.get("items"), list) else []
    if index is not None:
        if index < 1 or index > len(items):
            return {}, f"Xenesis Desk inbox selection not found: {text}. Run /xd inbox first."
        item = items[index - 1]
        return dict(item) if isinstance(item, dict) else {}, ""
    for item in items:
        if isinstance(item, dict) and str(item.get("id") or "") == text:
            return dict(item), ""
    return {}, f"Xenesis Desk inbox item not found: {text}"


def _run_xd_open_inbox(reference: str = "") -> dict[str, Any]:
    item, error = _resolve_xd_inbox_reference(reference)
    if error:
        return {
            "summary": "ERROR",
            "success": False,
            "opened": False,
            "item": item,
            "error": error,
        }
    try:
        payload = _call_bridge(
            "/command-palette/run",
            {"commandId": ACTION_INBOX_OPEN_COMMAND_ID, "panelPlacement": "right"},
        )
    except Exception as exc:
        return {
            "summary": "ERROR",
            "success": False,
            "opened": False,
            "item": item,
            "error": str(exc) or exc.__class__.__name__,
        }
    return {
        "summary": "OK" if payload.get("ok", True) else "ERROR",
        "success": payload.get("ok", True) is not False,
        "opened": payload.get("ok", True) is not False,
        "item": item,
        "message": str(payload.get("message") or ""),
        "error": str(payload.get("error") or ""),
    }


def _format_xd_inbox_open(result: dict[str, Any]) -> str:
    lines = [f"Xenesis Desk inbox open: {str(result.get('summary') or 'UNKNOWN').upper()}"]
    item = result.get("item") if isinstance(result.get("item"), dict) else {}
    if item.get("id"):
        lines.append(f"Item: {item['id']}")
    lines.append(f"Opened: {'yes' if result.get('opened') else 'no'}")
    if result.get("message"):
        lines.append(f"Message: {result['message']}")
    if result.get("error"):
        lines.append(f"Error: {result['error']}")
    return "\n".join(lines)


def _format_xd_inbox_clear_unavailable() -> str:
    return "\n".join([
        "Xenesis Desk inbox clear is not available through the bridge.",
        "Open the Action Inbox panel and clear resolved items there.",
        "Open: /xd inbox open",
    ])


def _repair_action(name: str, detail: str) -> dict[str, str]:
    return {
        "name": name,
        "detail": detail,
    }


def _repair_url_uses_loopback(value: str) -> bool:
    try:
        parsed = urlsplit(str(value or ""))
    except Exception:
        return False
    return (parsed.hostname or "").lower() in {"127.0.0.1", "localhost", "::1"}


def _run_xd_repair() -> dict[str, Any]:
    bridge = bridge_diagnostics()
    doctor = bridge_doctor()
    bot = _xenesis_desk_bot_diagnostics()
    actions: list[dict[str, str]] = []

    bridge_url = str(bridge.get("url") or "").strip()
    wsl_host = str(bridge.get("wslHostIp") or "").strip()
    if not bridge_url:
        actions.append(_repair_action(
            "Bridge URL",
            "Start Xenesis Desk and verify the MCP bridge state file is written, or set XENIS_MCP_BRIDGE_URL.",
        ))
    elif bridge.get("wslDetected") and _repair_url_uses_loopback(bridge_url):
        replacement = f"http://{wsl_host}:3847" if wsl_host else "http://<wsl-host-ip>:3847"
        actions.append(_repair_action(
            "WSL bridge URL",
            f"unset XENIS_MCP_BRIDGE_URL or set XENIS_MCP_BRIDGE_URL={replacement}.",
        ))

    state_file = str(bridge.get("stateFile") or "").strip()
    if not bridge.get("stateFileExists"):
        actions.append(_repair_action(
            "Bridge state file",
            f"Start Xenesis Desk so it writes the bridge state file: {state_file or '(unknown path)'}.",
        ))

    if not bridge.get("tokenPresent"):
        actions.append(_repair_action(
            "Bridge token",
            "Use the token from the Xenesis Desk bridge state file or leave XENIS_MCP_BRIDGE_TOKEN unset when state auto-detect is active.",
        ))

    checks = doctor.get("checks")
    if isinstance(checks, list):
        for check in checks:
            if not isinstance(check, dict) or check.get("status") != "fail":
                continue
            name = str(check.get("name") or "Bridge check")
            detail = str(check.get("detail") or "").strip()
            actions.append(_repair_action(
                name,
                f"{detail}. Run /xd doctor again after applying the repair.",
            ))

    bot_listen = str(bot.get("listenHost") or "").strip()
    if bot.get("wslDetected") and bot_listen and bot_listen not in {"0.0.0.0", "::"}:
        actions.append(_repair_action(
            "Bot listen host",
            "Set XENIS_BOT_LISTEN_HOST=0.0.0.0 or unset it so Xenesis Desk on Windows can reach the WSL bot endpoint.",
        ))

    if bot.get("error"):
        actions.append(_repair_action(
            "Bot diagnostics",
            f"Xenesis Bot diagnostics are unavailable: {bot['error']}.",
        ))
    elif bot and not bot.get("available"):
        actions.append(_repair_action(
            "Bot platform",
            "Enable xenesis_desk_bot in Hermes gateway config and restart the gateway.",
        ))

    if actions:
        actions.append(_repair_action(
            "Gateway reload",
            "Restart Hermes gateway after changing environment, config, or Xenesis Desk bridge state.",
        ))

    return {
        "summary": "ACTION_REQUIRED" if actions else "OK",
        "actions": actions,
    }


def _format_xd_repair(result: dict[str, Any]) -> str:
    summary = str(result.get("summary") or "UNKNOWN").upper()
    lines = [f"Xenesis Desk repair: {summary}"]
    actions = result.get("actions")
    if isinstance(actions, list) and actions:
        for index, action in enumerate(actions, start=1):
            if not isinstance(action, dict):
                continue
            name = str(action.get("name") or "Action")
            detail = str(action.get("detail") or "").strip()
            lines.append(f"{index}. {name}: {detail}" if detail else f"{index}. {name}")
    else:
        lines.append("No repair actions required.")
    return "\n".join(lines)


def handle_xd_command(raw_args: str) -> str:
    subcommand, rest = _first_word_and_rest(raw_args)
    if not subcommand or subcommand in {"help", "-h", "--help"}:
        return _xd_help()

    if subcommand == "status":
        bridge = bridge_diagnostics()
        token_state = "present" if bridge.get("tokenPresent") else "missing"
        state_file = str(bridge.get("stateFile") or "")
        state_suffix = "exists" if bridge.get("stateFileExists") else "missing"
        wsl_state = "detected" if bridge.get("wslDetected") else "not detected"
        lines = [
            "Xenesis Desk bridge: configured" if bridge.get("configured") else "Xenesis Desk bridge: missing",
            f"URL: {bridge.get('url') or '(none)'}",
            f"Token: {token_state}",
            f"State file: {state_file or '(none)'} ({state_suffix})",
            f"WSL: {wsl_state}",
            f"Toolset: {TOOLSET}",
            f"Tools: {len(_TOOLS)}",
        ]
        bot_lines = _xenesis_desk_bot_status_lines()
        if bot_lines:
            lines.extend(["", "Xenesis Bot:", *bot_lines])
        return "\n".join(lines)

    if subcommand in {"doctor", "health", "healthcheck"}:
        return _format_bridge_doctor(bridge_doctor())

    if subcommand in {"selftest", "self-test", "test"}:
        return _format_xd_selftest(_run_xd_selftest())

    if subcommand in {"readiness", "ready", "go"}:
        return _format_xd_readiness(_run_xd_readiness())

    if subcommand in {"watch", "monitor"}:
        parts = _split_args(rest)
        if parts and parts[0].lower() in {"reset", "clear"}:
            return _watch_reset()
        limit = _normalize_limit(parts[0], default=10, maximum=50) if parts else 10
        return _format_xd_watch(_run_xd_watch(limit=limit))

    if subcommand in {"timeline", "history"}:
        parts = _split_args(rest)
        limit = _normalize_limit(parts[0], default=10, maximum=50) if parts else 10
        return _format_xd_timeline(_run_xd_timeline(limit=limit))

    if subcommand in {"digest", "ops-digest"}:
        parts = _split_args(rest)
        limit = _normalize_limit(parts[0], default=3, maximum=10) if parts else 3
        return _format_xd_digest(_run_xd_digest(limit=limit))

    if subcommand in {"compatibility", "compat", "capabilities", "version-check"}:
        return _format_xd_compatibility(_run_xd_compatibility())

    if subcommand in {"upgrade-notes", "upgrade", "notes"}:
        return _format_xd_upgrade_notes(_run_xd_upgrade_notes())

    if subcommand in {"snapshot", "snap"}:
        parts = _split_args(rest)
        limit = _normalize_limit(parts[0], default=5, maximum=20) if parts else 5
        return _format_xd_snapshot(_run_xd_snapshot(limit=limit))

    if subcommand in {"brief", "summary"}:
        parts = _split_args(rest)
        limit = _normalize_limit(parts[0], default=3, maximum=10) if parts else 3
        return _format_xd_brief(_run_xd_brief(limit=limit))

    if subcommand in {"handoff", "hand-off"}:
        parts = _split_args(rest)
        limit = _normalize_limit(parts[0], default=5, maximum=20) if parts else 5
        return _format_xd_handoff(_run_xd_handoff(limit=limit))

    if subcommand == "export":
        parts = _split_args(rest)
        export_kind = "handoff"
        limit_text = ""
        if parts:
            first = parts[0].lower()
            if first in {"handoff", "hand-off", "snapshot", "snap"}:
                export_kind = first
                limit_text = parts[1] if len(parts) > 1 else ""
            else:
                limit_text = parts[0]
        limit = _normalize_limit(limit_text, default=5, maximum=20) if limit_text else 5
        return _format_xd_export(_run_xd_export(kind=export_kind, limit=limit))

    if subcommand in {"exports", "export-list", "export-history"}:
        parts = _split_args(rest)
        if parts and parts[0].lower() in {"open", "show"}:
            return _format_xd_open_export(_run_xd_open_export(" ".join(parts[1:])))
        limit = _normalize_limit(parts[0], default=10, maximum=50) if parts else 10
        return _format_xd_exports(_run_xd_exports(limit=limit))

    if subcommand in {"support-bundle", "bundle", "support"}:
        parts = _split_args(rest)
        limit = _normalize_limit(parts[0], default=5, maximum=20) if parts else 5
        return _format_xd_support_bundle(_run_xd_support_bundle(limit=limit))

    if subcommand in {"pin", "pins"}:
        return _handle_pin_command(rest)

    if subcommand in {"launch", "launcher"}:
        parts = _split_args(rest)
        if parts and parts[0].lower() in {"open", "run"}:
            return _run_xd_launch_selector(" ".join(parts[1:]))
        if parts and _selector_index(parts[0]) is not None:
            return _run_xd_launch_selector(parts[0])
        limit = _normalize_limit(parts[0], default=20, maximum=50) if parts else 20
        return _format_xd_launch(_run_xd_launch(limit=limit))

    if subcommand in {"find", "search"}:
        parts = _split_args(rest)
        if parts and parts[0].lower() in {"open", "run"}:
            return _run_xd_find_selector(" ".join(parts[1:]))
        if parts and _selector_index(parts[0]) is not None:
            return _run_xd_find_selector(parts[0])
        query, limit = _parse_find_query_and_limit(rest)
        return _format_xd_find(_run_xd_find(query, limit=limit))

    if subcommand in {"cleanup", "clean"}:
        return _handle_cleanup_command(rest)

    if subcommand in {"stash", "stashes"}:
        return _handle_stash_command(rest)

    if subcommand in {"inbox", "action-inbox"}:
        parts = _split_args(rest)
        if parts and parts[0].lower() in {"open", "show"}:
            return _format_xd_inbox_open(_run_xd_open_inbox(" ".join(parts[1:])))
        if parts and parts[0].lower() in {"clear", "prune"}:
            return _format_xd_inbox_clear_unavailable()
        limit = _normalize_limit(parts[0], default=10, maximum=50) if parts else 10
        return _format_xd_inbox(_run_xd_inbox(limit=limit))

    if subcommand == "repair":
        return _format_xd_repair(_run_xd_repair())

    if subcommand == "state":
        return _format_state(_parse_json_result(handle_state({})))

    if subcommand in {"mobile", "dashboard", "mobile-dashboard"}:
        parts = _split_args(rest)
        payload = {"limit": _normalize_mobile_dashboard_limit(parts[0])} if parts else {}
        return _format_mobile_dashboard(_parse_json_result(handle_mobile_dashboard(payload)))

    if subcommand in {"context", "active"}:
        return _format_active_context(_parse_json_result(handle_active_context({})))

    if subcommand in {"context-actions", "ctx"}:
        parts = _split_args(rest)
        if not parts:
            return _format_context_actions(_parse_json_result(handle_context_actions({})))
        action, error = _context_action_from_selector(parts[0])
        if error:
            return error
        return handle_xd_command(str(action.get("command") or ""))

    if subcommand == "action":
        parts = _split_args(rest)
        if not parts:
            return "Usage: /xd action <token>"
        return _run_context_action_token(parts[0])

    if subcommand in {"action-status", "action-log"}:
        parts = _split_args(rest)
        if not parts:
            return "Usage: /xd action-status <token>"
        return _format_context_action_status(parts[0])

    if subcommand in {"action-history", "actions-history"}:
        parts = _split_args(rest)
        payload = {"limit": _normalize_action_history_limit(parts[0])} if parts else {}
        return _format_action_history(_parse_json_result(handle_action_history(payload)))

    if subcommand in {"action-clear", "actions-clear"}:
        parts = _split_args(rest)
        payload = {"mode": parts[0]} if parts else {}
        return _format_action_clear(_parse_json_result(handle_action_clear(payload)))

    if subcommand == "action-prune":
        return _format_action_clear(_parse_json_result(handle_action_clear({"mode": "expired"})))

    if subcommand in {"menu", "actions"}:
        parts = _split_args(rest)
        if not parts:
            return _format_mobile_menu(_parse_json_result(handle_state({})))
        command, error = _menu_action_from_selector(parts[0])
        if error:
            return error
        return handle_xd_command(command)

    if subcommand == "quick":
        return _handle_quick_command(rest)

    if subcommand in {"workflow", "workflows", "wf"}:
        return _handle_workflow_command(rest)

    if subcommand in {"recommend", "recommended", "suggest", "suggestions"}:
        return _handle_recommend_command(rest)

    if subcommand in {"packet", "work-packet", "workpacket"}:
        return _handle_packet_command(rest)

    if subcommand in {"terminals", "terminal", "terms"}:
        return _format_terminal_sessions(_parse_json_result(handle_terminal_list({})))

    if subcommand in {"panels", "panel"}:
        return _format_desk_panels(_parse_json_result(handle_state({})))

    if subcommand in {"bridge-panels", "bridge-panel", "extension-panels", "extension-panel"}:
        return _format_bridge_panels(_parse_json_result(handle_list_panels({})))

    if subcommand in {"files", "open-files", "opened-files"}:
        return _format_open_files(_parse_json_result(handle_list_open_files({})))

    if subcommand in {"logs", "diagnostics"}:
        parts = _split_args(rest)
        payload = {"limit": _normalize_limit(parts[0])} if parts else {}
        return _format_recent_diagnostics(_parse_json_result(handle_recent_diagnostics(payload)))

    if subcommand == "focus":
        if not rest:
            return "Usage: /xd focus <content-id|pane-id|#N>"
        payload, error = _dock_target_from_selector(rest)
        if error:
            return error
        return _format_dock_action(
            _parse_json_result(handle_focus_content(payload)),
            "focus",
        )

    if subcommand == "close":
        if not rest:
            return "Usage: /xd close <content-id|pane-id|#N>"
        payload, error = _dock_target_from_selector(rest)
        if error:
            return error
        return _format_dock_action(
            _parse_json_result(handle_close_content(payload)),
            "close",
        )

    if subcommand == "tail":
        parts = _split_args(rest)
        if not parts:
            return "Usage: /xd tail <id|#N>"
        session_id, error = _terminal_id_from_text(parts[0])
        if error:
            return error
        result = _parse_json_result(handle_terminal_tail({"id": session_id}))
        if not result.get("success", True):
            return _format_error(result)
        return str(result.get("tail") or "")

    if subcommand == "stop":
        parts = _split_args(rest)
        if not parts:
            return "Usage: /xd stop <id|#N>"
        session_id, error = _terminal_id_from_text(parts[0])
        if error:
            return error
        result = _parse_json_result(handle_terminal_stop({"id": session_id}))
        if not result.get("success", True):
            return _format_error(result)
        return f"Stopped Xenesis Desk terminal: {result.get('id') or session_id}"

    if subcommand == "run":
        if not rest:
            return "Usage: /xd run <command>"
        return _format_terminal_run(_parse_json_result(handle_terminal_run({"command": rest})))

    if subcommand == "open":
        if not rest:
            return "Usage: /xd open <absolute-path>"
        file_path = _strip_wrapping_quotes(rest)
        return _format_open_file(_parse_json_result(handle_open_file({"filePath": file_path})))

    if subcommand in {"prompt", "xcon-prompt", "guide"}:
        parts = _split_args(rest)
        payload: dict[str, Any] = {}
        if parts and parts[0] in XCON_PROMPT_KINDS:
            payload["kind"] = parts[0]
            if len(parts) > 1:
                payload["brief"] = " ".join(parts[1:])
        elif rest:
            payload["brief"] = rest
        return _format_xcon_prompt(_parse_json_result(handle_get_xcon_prompt(payload)))

    if subcommand == "xcon":
        if not rest:
            return "Usage: /xd xcon <prompt>"
        return _format_xcon_create(_parse_json_result(handle_create_xcon_markdown({"prompt": rest})))

    if subcommand in {"render", "render-xcon", "xcon-image"}:
        if not rest:
            return "Usage: /xd render <xcon/sketch markup>"
        return _handle_xcon_render(rest)
    if subcommand in {"pw", "playwright", "browser"}:
        return _handle_playwright_command(rest)

    if subcommand in {"pw-json", "playwright-json"}:
        return _handle_playwright_command("json " + rest)

    if subcommand in {"commands", "palette"}:
        payload = {"query": rest} if rest else {}
        return _format_command_palette(_parse_json_result(handle_command_palette(payload)))

    if subcommand in {"command", "cmd"}:
        parts = _split_args(rest)
        if not parts:
            return "Usage: /xd command <command-id|#N> [placement]"
        command_id, error = _command_palette_id_from_text(parts[0])
        if error:
            return error
        payload = {"commandId": command_id}
        if len(parts) > 1 and _normalize_placement(parts[1]):
            payload["panelPlacement"] = _normalize_placement(parts[1])
        return _format_command_palette_run(
            _parse_json_result(handle_run_command_palette(payload)),
            command_id,
        )

    if subcommand in {"extensions", "ext"}:
        return _format_extension_commands(_parse_json_result(handle_list_extension_commands({})))

    if subcommand == "exec":
        parts = _split_args(rest)
        if not parts:
            return "Usage: /xd exec <command-id|#N> [placement]"
        command_id, error = _extension_id_from_text(parts[0])
        if error:
            return error
        payload = {"commandId": command_id}
        if len(parts) > 1 and _normalize_placement(parts[1]):
            payload["panelPlacement"] = _normalize_placement(parts[1])
        return _format_extension_run(
            _parse_json_result(handle_run_extension_command(payload)),
            command_id,
        )

    return _xd_help()


_TOOLS = (
    ("xenesis_desk_mobile_terminal_preview", TERMINAL_PREVIEW_SCHEMA, handle_terminal_preview, ""),
    ("xenesis_desk_mobile_terminal_run", TERMINAL_RUN_SCHEMA, handle_terminal_run, ""),
    ("xenesis_desk_mobile_terminal_tail", TERMINAL_TAIL_SCHEMA, handle_terminal_tail, ""),
    ("xenesis_desk_mobile_terminal_stop", TERMINAL_STOP_SCHEMA, handle_terminal_stop, ""),
    ("xenesis_desk_mobile_terminal_list", TERMINAL_LIST_SCHEMA, handle_terminal_list, ""),
    ("xenesis_desk_mobile_state", STATE_SCHEMA, handle_state, ""),
    ("xenesis_desk_mobile_active_context", ACTIVE_CONTEXT_SCHEMA, handle_active_context, ""),
    ("xenesis_desk_mobile_context_actions", CONTEXT_ACTIONS_SCHEMA, handle_context_actions, ""),
    ("xenesis_desk_mobile_action_history", ACTION_HISTORY_SCHEMA, handle_action_history, ""),
    ("xenesis_desk_mobile_action_clear", ACTION_CLEAR_SCHEMA, handle_action_clear, ""),
    ("xenesis_desk_mobile_dashboard", MOBILE_DASHBOARD_SCHEMA, handle_mobile_dashboard, ""),
    ("xenesis_desk_mobile_list_panels", LIST_PANELS_SCHEMA, handle_list_panels, ""),
    ("xenesis_desk_mobile_list_open_files", LIST_OPEN_FILES_SCHEMA, handle_list_open_files, ""),
    ("xenesis_desk_mobile_recent_diagnostics", RECENT_DIAGNOSTICS_SCHEMA, handle_recent_diagnostics, ""),
    ("xenesis_desk_mobile_focus_content", FOCUS_CONTENT_SCHEMA, handle_focus_content, ""),
    ("xenesis_desk_mobile_close_content", CLOSE_CONTENT_SCHEMA, handle_close_content, ""),
    ("xenesis_desk_mobile_open_file", OPEN_FILE_SCHEMA, handle_open_file, ""),
    ("xenesis_desk_mobile_get_xcon_prompt", GET_XCON_PROMPT_SCHEMA, handle_get_xcon_prompt, ""),
    ("xenesis_desk_mobile_validate_xcon_markdown", VALIDATE_XCON_MARKDOWN_SCHEMA, handle_validate_xcon_markdown, ""),
    ("xenesis_desk_mobile_create_xcon_markdown_from_content", CREATE_XCON_MARKDOWN_FROM_CONTENT_SCHEMA, handle_create_xcon_markdown_from_content, ""),
    ("xenesis_desk_mobile_create_xcon_markdown", CREATE_XCON_MARKDOWN_SCHEMA, handle_create_xcon_markdown, ""),
    ("xenesis_desk_mobile_export_xcon_pdf", EXPORT_XCON_PDF_SCHEMA, handle_export_xcon_pdf, ""),
    ("xenesis_desk_mobile_playwright_snapshot", PLAYWRIGHT_SNAPSHOT_SCHEMA, handle_playwright_snapshot, ""),
    ("xenesis_desk_mobile_playwright_run", PLAYWRIGHT_RUN_SCHEMA, handle_playwright_run, ""),
    ("xenesis_desk_mobile_command_palette", COMMAND_PALETTE_SCHEMA, handle_command_palette, ""),
    ("xenesis_desk_mobile_run_command_palette", RUN_COMMAND_PALETTE_SCHEMA, handle_run_command_palette, ""),
    ("xenesis_desk_mobile_list_extension_commands", LIST_EXTENSION_COMMANDS_SCHEMA, handle_list_extension_commands, ""),
    ("xenesis_desk_mobile_run_extension_command", RUN_EXTENSION_COMMAND_SCHEMA, handle_run_extension_command, ""),
)


def register(ctx) -> None:
    for name, schema, handler, emoji in _TOOLS:
        ctx.register_tool(
            name=name,
            toolset=TOOLSET,
            schema=schema,
            handler=handler,
            check_fn=check_xenesis_desk_bridge,
            emoji=emoji,
        )
    ctx.register_command(
        name="xd",
        handler=handle_xd_command,
        description="Control Xenesis Desk from mobile gateway sessions.",
        args_hint=XD_ARGS_HINT,
    )
    ctx.register_hook("pre_gateway_dispatch", handle_pre_gateway_dispatch)
    ctx.register_hook("post_tool_call", handle_post_tool_call)
    ctx.register_hook("transform_tool_result", handle_transform_tool_result)
    ctx.register_hook("transform_llm_output", handle_transform_llm_output)



