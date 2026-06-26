from __future__ import annotations

import json
import os
import shlex
import subprocess
from pathlib import Path
from typing import Any

from .constants import MCP_TOOL_TIMEOUT_SECONDS
from .text_utils import _strip_wrapping_quotes


def _xenis_mcp_server_candidates() -> list[Path]:
    candidates: list[Path] = []
    configured = os.getenv("XENIS_MCP_SERVER_PATH", "").strip()
    if configured:
        candidates.append(Path(configured))
    try:
        plugin_file = Path(__file__).resolve()
        for parent in plugin_file.parents:
            candidates.append(parent / "mcp" / "xenesis-desk-mcp-server.mjs")
            if parent.name == "xcon-viewer":
                candidates.append(parent / "tools" / "xenesis-desk" / "mcp" / "xenesis-desk-mcp-server.mjs")
    except Exception:
        pass

    unique: list[Path] = []
    seen: set[str] = set()
    for candidate in candidates:
        key = str(candidate).lower()
        if key in seen:
            continue
        seen.add(key)
        unique.append(candidate)
    return unique


def _xenis_mcp_server_path() -> Path:
    candidates = _xenis_mcp_server_candidates()
    for candidate in candidates:
        if candidate.exists():
            return candidate.resolve()
    return candidates[0].resolve() if candidates else Path("xenesis-desk-mcp-server.mjs")


def _path_text_key(value: str | Path) -> str:
    raw = _strip_wrapping_quotes(str(value or "").strip())
    try:
        return os.path.normcase(os.path.normpath(str(Path(raw).resolve())))
    except Exception:
        return os.path.normcase(os.path.normpath(raw))


def _same_path_text(left: str | Path, right: str | Path) -> bool:
    return bool(str(left or "").strip()) and _path_text_key(left) == _path_text_key(right)


def _xenis_mcp_extra_args(server_path: Path) -> list[str]:
    args_text = os.getenv("XENIS_MCP_SERVER_ARGS", "").strip()
    if not args_text:
        return []

    server_text = str(server_path)
    if _same_path_text(args_text, server_text):
        return []

    if args_text.startswith(server_text):
        remainder = args_text[len(server_text):].strip()
        args_text = remainder
        if not args_text:
            return []

    try:
        parts = shlex.split(args_text, posix=False)
    except ValueError:
        parts = args_text.split()

    normalized = [_strip_wrapping_quotes(part) for part in parts]
    if normalized and _same_path_text(normalized[0], server_path):
        normalized = normalized[1:]
    return normalized


def _xenis_mcp_command(server_path: Path) -> list[str]:
    command_text = os.getenv("XENIS_MCP_SERVER_COMMAND", "").strip() or "node"
    try:
        command = shlex.split(command_text, posix=False)
    except ValueError:
        command = command_text.split()
    command = command or ["node"]
    return [*command, str(server_path), *_xenis_mcp_extra_args(server_path)]


def _mcp_tool_payload_from_envelope(envelope: Any, tool_name: str) -> dict[str, Any]:
    if isinstance(envelope, dict) and envelope.get("error"):
        error = envelope.get("error") if isinstance(envelope.get("error"), dict) else {}
        return {"success": False, "error": str(error.get("message") or envelope.get("error"))}
    result = envelope.get("result") if isinstance(envelope, dict) else None
    if not isinstance(result, dict):
        return {"success": True, "result": result}
    structured = result.get("structuredContent") if isinstance(result.get("structuredContent"), dict) else {}
    content = result.get("content") if isinstance(result.get("content"), list) else []
    text_parts = [str(item.get("text") or "") for item in content if isinstance(item, dict) and item.get("type") == "text"]
    payload = {**structured}
    payload.setdefault("ok", not bool(result.get("isError")))
    payload.setdefault("success", not bool(result.get("isError")))
    if text_parts:
        payload.setdefault("message", "\n".join(part for part in text_parts if part))
    if result.get("isError"):
        payload["success"] = False
        payload.setdefault("error", payload.get("message") or f"Xenesis Desk MCP tool failed: {tool_name}")
    return payload


def _call_xenis_mcp_tool(tool_name: str, arguments: dict[str, Any]) -> dict[str, Any]:
    candidates = [candidate.resolve() for candidate in _xenis_mcp_server_candidates() if candidate.exists()]
    if not candidates:
        server_path = _xenis_mcp_server_path()
        return {
            "success": False,
            "error": f"Xenesis Desk MCP server not found: {server_path}",
            "serverPath": str(server_path),
        }

    request = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {"name": tool_name, "arguments": arguments},
    }
    last_error = ""
    for server_path in candidates:
        try:
            completed = subprocess.run(
                _xenis_mcp_command(server_path),
                input=json.dumps(request, ensure_ascii=False) + "\n",
                text=True,
                capture_output=True,
                cwd=str(server_path.parent.parent),
                timeout=MCP_TOOL_TIMEOUT_SECONDS,
                check=False,
            )
        except subprocess.TimeoutExpired:
            last_error = f"Xenesis Desk MCP tool timed out: {tool_name}"
            continue
        except Exception as exc:
            last_error = str(exc)
            continue

        stdout_line = next((line for line in completed.stdout.splitlines() if line.strip()), "")
        if not stdout_line:
            last_error = completed.stderr.strip() or f"Xenesis Desk MCP tool returned no output: {tool_name}"
            continue
        try:
            envelope = json.loads(stdout_line)
        except Exception:
            last_error = stdout_line
            continue
        payload = _mcp_tool_payload_from_envelope(envelope, tool_name)
        if completed.returncode != 0 and payload.get("success", True):
            payload["success"] = False
            payload.setdefault("error", completed.stderr.strip() or f"Xenesis Desk MCP tool exited with {completed.returncode}: {tool_name}")
        payload.setdefault("serverPath", str(server_path))
        return payload

    return {"success": False, "error": last_error or f"Xenesis Desk MCP tool failed: {tool_name}"}


_xenesis_desk_mcp_server_candidates = _xenis_mcp_server_candidates
_xenesis_desk_mcp_server_path = _xenis_mcp_server_path
_xenesis_desk_mcp_extra_args = _xenis_mcp_extra_args
_xenesis_desk_mcp_command = _xenis_mcp_command
_call_xenesis_desk_mcp_tool = _call_xenis_mcp_tool
