from __future__ import annotations

import json
import shlex
from typing import Any


def _json_result(payload: dict[str, Any]) -> str:
    result = dict(payload)
    result.setdefault("success", bool(result.get("ok", True)))
    return json.dumps(result, ensure_ascii=False)


def _json_error(message: str, **extra: Any) -> str:
    return json.dumps(
        {"success": False, "error": message, **extra},
        ensure_ascii=False,
    )


def _parse_json_result(raw: str) -> dict[str, Any]:
    try:
        parsed = json.loads(raw)
    except Exception:
        return {"success": False, "error": raw}
    return parsed if isinstance(parsed, dict) else {"success": True, "result": parsed}


def _strip_wrapping_quotes(value: str) -> str:
    text = value.strip()
    if len(text) >= 2 and text[0] == text[-1] and text[0] in {"'", '"'}:
        return text[1:-1]
    return text


def _split_args(value: str) -> list[str]:
    try:
        return [_strip_wrapping_quotes(part) for part in shlex.split(value, posix=False)]
    except ValueError:
        return [_strip_wrapping_quotes(part) for part in value.split()]


def _first_word_and_rest(raw_args: str) -> tuple[str, str]:
    text = str(raw_args or "").strip()
    if not text:
        return "", ""
    parts = text.split(maxsplit=1)
    command = parts[0].lower()
    rest = parts[1].strip() if len(parts) > 1 else ""
    return command, rest
