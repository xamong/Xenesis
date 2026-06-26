from __future__ import annotations

from pathlib import Path
from typing import Any

from .constants import PANEL_PLACEMENTS, WINDOWS_ABSOLUTE_PATH_RE, WSL_MOUNT_PATH_RE


def _payload(args: dict[str, Any], keys: tuple[str, ...]) -> dict[str, Any]:
    return {key: args[key] for key in keys if args.get(key) is not None}


def _normalize_placement(value: Any) -> str:
    placement = str(value or "").strip().lower()
    return placement if placement in PANEL_PLACEMENTS else ""


def _render_options(args: dict[str, Any]) -> dict[str, Any] | None:
    if args.get("streaming") is not True:
        return None
    streaming: dict[str, Any] = {"enabled": True}
    number_fields = {
        "streamingIntervalMs": "intervalMs",
        "streamingChunkSize": "chunkSize",
        "streamingInitialDelayMs": "initialDelayMs",
    }
    for source_key, target_key in number_fields.items():
        if args.get(source_key) is not None:
            try:
                streaming[target_key] = int(args[source_key])
            except (TypeError, ValueError):
                continue
    return {"streaming": streaming}


def _bridge_open_file_payload(file_path: str, args: dict[str, Any]) -> dict[str, Any]:
    payload: dict[str, Any] = {"filePath": file_path}
    placement = _normalize_placement(args.get("placement"))
    render_options = _render_options(args)
    if placement:
        payload["placement"] = placement
    if render_options:
        payload["renderOptions"] = render_options
    return payload


def _is_windows_absolute_path(value: str) -> bool:
    return bool(WINDOWS_ABSOLUTE_PATH_RE.match(str(value or "").strip()))


def _is_wsl_mount_path(value: str) -> bool:
    return bool(WSL_MOUNT_PATH_RE.match(str(value or "").strip()))


def _is_bridge_absolute_file_path(value: str) -> bool:
    raw = str(value or "").strip()
    return bool(raw) and (Path(raw).is_absolute() or _is_windows_absolute_path(raw) or _is_wsl_mount_path(raw))


def _resolve_file_path_for_bridge(raw_file_path: str) -> str:
    raw = str(raw_file_path or "").strip()
    if _is_windows_absolute_path(raw) or _is_wsl_mount_path(raw):
        return raw
    return str(Path(raw).resolve())
