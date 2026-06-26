from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Callable
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit, urlunsplit
from urllib.request import Request, urlopen

RequestException = URLError

from .constants import BRIDGE_TIMEOUT_SECONDS, DEFAULT_BRIDGE_URL


BridgeConfigReader = Callable[[], tuple[str, str]]


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


def _discover_wsl_bridge_state_file() -> Path | None:
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


def _read_bridge_config() -> tuple[str, str]:
    env_url = os.getenv("XENIS_MCP_BRIDGE_URL", "").strip()
    env_token = os.getenv("XENIS_MCP_BRIDGE_TOKEN", "").strip()
    if env_url:
        return env_url.rstrip("/"), env_token

    state: dict[str, Any] = {}
    state_file = _bridge_state_file()
    if state_file.exists():
        try:
            parsed = json.loads(state_file.read_text(encoding="utf-8"))
            if isinstance(parsed, dict):
                state = parsed
        except Exception:
            state = {}

    raw_url = str(state.get("bridgeUrl") or state.get("url") or DEFAULT_BRIDGE_URL).strip().rstrip("/")
    bridge_url = _rewrite_loopback_bridge_url_for_wsl(raw_url) if state else raw_url
    bridge_token = str(
        env_token
        or state.get("bridgeToken")
        or state.get("token")
        or ""
    ).strip()
    return bridge_url, bridge_token


def bridge_diagnostics() -> dict[str, Any]:
    bridge_url, bridge_token = _read_bridge_config()
    state_file = _bridge_state_file()
    return {
        "configured": bool(bridge_url),
        "url": bridge_url,
        "tokenPresent": bool(bridge_token),
        "stateFile": str(state_file),
        "stateFileExists": state_file.exists(),
        "wslDetected": _is_wsl_environment(),
        "wslHostIp": _wsl_host_ip() if _is_wsl_environment() else "",
    }


def _doctor_check(name: str, status: str, detail: str = "") -> dict[str, str]:
    return {
        "name": name,
        "status": status,
        "detail": detail,
    }


def _bridge_url_uses_loopback(value: str) -> bool:
    try:
        parsed = urlsplit(str(value or ""))
    except Exception:
        return False
    return (parsed.hostname or "").lower() in {"127.0.0.1", "localhost", "::1"}


def _http_error_detail(exc: Exception) -> str:
    status_code = getattr(exc, "code", None)
    text = ""
    try:
        text = exc.read().decode("utf-8", errors="replace").strip() if hasattr(exc, "read") else ""
    except Exception:
        text = ""
    if status_code and text:
        return f"HTTP {status_code}: {text[:200]}"
    if status_code:
        return f"HTTP {status_code}"
    return str(exc) or exc.__class__.__name__


def bridge_doctor() -> dict[str, Any]:
    diagnostics = bridge_diagnostics()
    checks: list[dict[str, str]] = []
    bridge_url = str(diagnostics.get("url") or "").strip()

    checks.append(_doctor_check(
        "Bridge config",
        "pass" if bridge_url else "fail",
        bridge_url or "XENIS_MCP_BRIDGE_URL or bridge state file URL is missing",
    ))
    checks.append(_doctor_check(
        "Bridge token",
        "pass" if diagnostics.get("tokenPresent") else "warn",
        "present" if diagnostics.get("tokenPresent") else "missing",
    ))

    state_file = str(diagnostics.get("stateFile") or "")
    state_exists = bool(diagnostics.get("stateFileExists"))
    checks.append(_doctor_check(
        "Bridge state file",
        "pass" if state_exists else "warn",
        f"{state_file or '(none)'} ({'exists' if state_exists else 'missing'})",
    ))

    if diagnostics.get("wslDetected"):
        loopback = _bridge_url_uses_loopback(bridge_url)
        checks.append(_doctor_check(
            "WSL bridge URL",
            "fail" if loopback else "pass",
            "still points at loopback" if loopback else bridge_url,
        ))

    if bridge_url:
        try:
            payload = _call_bridge_with_config("/state", {}, _read_bridge_config)
            if payload.get("ok") is False:
                checks.append(_doctor_check(
                    "Bridge /state",
                    "fail",
                    str(payload.get("error") or payload.get("message") or "returned ok=false"),
                ))
            else:
                checks.append(_doctor_check("Bridge /state", "pass", "reachable"))
        except HTTPError as exc:
            checks.append(_doctor_check("Bridge /state", "fail", _http_error_detail(exc)))
        except RequestException as exc:
            checks.append(_doctor_check("Bridge /state", "fail", str(exc) or exc.__class__.__name__))
        except Exception as exc:
            checks.append(_doctor_check("Bridge /state", "fail", str(exc) or exc.__class__.__name__))
    else:
        checks.append(_doctor_check("Bridge /state", "fail", "skipped because bridge URL is missing"))

    if any(check["status"] == "fail" for check in checks):
        summary = "FAIL"
    elif any(check["status"] == "warn" for check in checks):
        summary = "WARN"
    else:
        summary = "PASS"

    return {
        "summary": summary,
        "checks": checks,
        "diagnostics": diagnostics,
    }


def check_xenesis_desk_bridge() -> bool:
    bridge_url, _bridge_token = _read_bridge_config()
    return bool(bridge_url)


check_xenis_bridge = check_xenesis_desk_bridge


def _call_bridge_with_config(
    path_name: str,
    body: dict[str, Any],
    read_bridge_config: BridgeConfigReader = _read_bridge_config,
) -> dict[str, Any]:
    bridge_url, bridge_token = read_bridge_config()
    headers = {"Content-Type": "application/json"}
    if bridge_token:
        headers["Authorization"] = f"Bearer {bridge_token}"

    request = Request(
        f"{bridge_url}{path_name}",
        data=json.dumps(body).encode("utf-8"),
        headers=headers,
        method="POST",
    )
    with urlopen(request, timeout=BRIDGE_TIMEOUT_SECONDS) as response:
        response_text = response.read().decode("utf-8", errors="replace")
    payload = json.loads(response_text) if response_text.strip() else {}
    return payload if isinstance(payload, dict) else {"ok": True, "result": payload}
