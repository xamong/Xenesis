from __future__ import annotations

import json
import os
import re
import time
from pathlib import Path
from typing import Any

from .constants import XCON_FENCE_LANGUAGES


def _markdown_title_from_content(content: str) -> str:
    for line in content.splitlines():
        stripped = line.strip()
        if stripped.startswith("# "):
            return stripped[2:].strip()
    return ""


def _normalize_title(value: Any, fallback: str) -> str:
    title = str(value or "").strip() or str(fallback or "").strip()
    return title or "XCON/SKETCH Document"


def _slugify(value: str) -> str:
    ascii_text = re.sub(r"[^A-Za-z0-9]+", "-", value).strip("-").lower()
    return ascii_text or "xcon-sketch"


def _normalize_markdown_file_name(value: Any, title: str) -> str:
    raw = str(value or "").strip()
    if raw:
        base_name = Path(raw).name
    else:
        stamp = time.strftime("%Y%m%d-%H%M%S")
        base_name = f"{stamp}-{_slugify(title)}.md"
    safe = re.sub(r'[<>:"/\\|?*\x00-\x1F]', "-", base_name).strip()
    safe = safe or "xcon-sketch.md"
    return safe if safe.lower().endswith(".md") else f"{safe}.md"


def _quote_xcon(value: Any) -> str:
    text = str(value or "").replace("\r", " ").replace("\n", " ").strip()
    return json.dumps(text, ensure_ascii=False)


def _normalize_mode(value: Any) -> str:
    mode = str(value or "view").strip().lower()
    return mode if mode in {"view", "code", "both"} else "view"


def _build_xcon_markdown_document(*, title: str, prompt: str, mode: str) -> str:
    return "\n".join([
        f"# {title}",
        "",
        f"Generated from: {prompt}",
        "",
        "## XCON/SKETCH",
        "",
        f"```xcon-sketch mode {mode}",
        f"screen {_quote_xcon(title)} 960x540 bg #f8fafc",
        "  main: panel at 32 32 896 476",
        "    bg white",
        "    radius 18",
        "    border",
        "      visible true",
        "      color #d8e0ea",
        f"    title: label {_quote_xcon(title)} at 32 30 720 36",
        "      color #172033",
        "      font",
        "        size 28",
        "        weight 800",
        f"    prompt: label {_quote_xcon(prompt)} at 32 88 720 64",
        "      color #475569",
        "      font",
        "        size 15",
        "        weight 600",
        "    action: button \"Open in Xenesis Desk\" at 32 394 180 40",
        "      bg #2563eb",
        "      color white",
        "      radius 10",
        "```",
        "",
    ])


def _validate_xcon_markdown_content(content: str) -> dict[str, Any]:
    errors: list[str] = []
    fences: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None

    for line_number, line in enumerate(content.splitlines(), start=1):
        stripped = line.strip()
        if not stripped.startswith("```"):
            if current is not None:
                current["lines"].append(line)
            continue

        if current is not None:
            text = "\n".join(current["lines"]).strip()
            if not text:
                errors.append(f"XCON fence at line {current['line']} is empty.")
            fences.append({
                "language": current["language"],
                "line": current["line"],
                "chars": len(text),
            })
            current = None
            continue

        marker = stripped[3:].strip()
        language = marker.split()[0].lower() if marker else ""
        if language in XCON_FENCE_LANGUAGES:
            current = {"language": language, "line": line_number, "lines": []}

    if current is not None:
        errors.append(f"XCON fence at line {current['line']} is not closed.")

    if not fences and not current:
        errors.append("No XCON/SKETCH fence found.")

    return {
        "ok": not errors,
        "error": errors[0] if errors else "",
        "errors": errors,
        "fenceCount": len(fences),
        "fences": fences,
    }


def _xcon_approval_description(file_path: str, title: str, validation: dict[str, Any]) -> str:
    return "\n".join([
        "Xenesis Desk XCON Markdown file creation request.",
        f"File: {file_path}",
        f"Title: {title}",
        f"XCON fences: {validation.get('fenceCount', 0)}",
        "Approval applies only to this pending Xenesis Desk request.",
    ])


def _xenis_home_dir() -> Path:
    configured = str(os.getenv("XENIS_HOME") or "").strip()
    if configured:
        return _path_from_xenis_text(configured).resolve()
    state_file = str(os.getenv("XENIS_MCP_STATE_FILE") or "").strip()
    if state_file:
        path = _path_from_xenis_text(state_file)
        if path.name == "bridge.json" and path.parent.name == "mcp":
            return path.parent.parent.resolve()
    return (Path.home() / ".xenis").resolve()


def _xenis_exports_dir() -> Path:
    return (_xenis_home_dir() / "exports").resolve()


def _path_from_xenis_text(value: str) -> Path:
    raw = str(value or "").strip()
    if os.name != "nt":
        match = re.match(r"^([A-Za-z]):[\\/](.*)$", raw)
        if match:
            rest = match.group(2).replace("\\", "/")
            raw = f"/mnt/{match.group(1).lower()}/{rest}"
    return Path(raw).expanduser()


def _resolve_xcon_workspace_dir(args: dict[str, Any]) -> Path:
    raw_workspace = str(args.get("workspaceDir") or args.get("outDir") or "").strip()
    if not raw_workspace:
        return _xenis_exports_dir()
    workspace_dir = _path_from_xenis_text(raw_workspace)
    if workspace_dir.is_absolute():
        return workspace_dir.resolve()
    return (_xenis_exports_dir() / workspace_dir).resolve()


def _write_xcon_markdown_file(args: dict[str, Any], content: str, title: str) -> str:
    workspace_dir = _resolve_xcon_workspace_dir(args)
    file_name = _normalize_markdown_file_name(args.get("fileName"), title)
    file_path = (workspace_dir / file_name).resolve()
    workspace_dir.mkdir(parents=True, exist_ok=True)
    file_path.write_text(content, encoding="utf-8")
    return str(file_path)


def _xcon_bridge_path(tool_name: str) -> str:
    normalized = tool_name.replace("xenis_", "xenesis_desk_", 1) if tool_name.startswith("xenis_") else tool_name
    if normalized == "xenesis_desk_validate_xcon_markdown":
        return "/xcon/validate"
    if normalized == "xenesis_desk_create_xcon_markdown":
        return "/xcon/create"
    if normalized == "xenesis_desk_create_xcon_markdown_from_content":
        return "/xcon/create-from-content"
    if normalized == "xenesis_desk_export_xcon_pdf":
        return "/xcon/export-pdf"
    return ""


def _xcon_requested_file_path(args: dict[str, Any], title: str) -> str:
    file_name = _normalize_markdown_file_name(args.get("fileName"), title)
    workspace_dir = _resolve_xcon_workspace_dir(args)
    return str((workspace_dir / file_name).resolve())
