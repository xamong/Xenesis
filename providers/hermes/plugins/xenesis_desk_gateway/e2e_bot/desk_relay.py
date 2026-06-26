"""Remote Desk stream relay filtering helpers for the e2e bot.

The automation controller is the canonical filter owner. These helpers only
trust canonical relay metadata first and keep legacy stream filtering as a
fallback for older Desk events.
"""

from __future__ import annotations

import re
from typing import Any


def relay_desk_stream_text(event: dict[str, Any], state: dict[str, int] | None = None) -> str:
    canonical = _canonical_desk_relay_stream_text(event)
    if canonical is not None:
        return canonical
    return _normalized_desk_stream_text(event, state)


def compact_desk_stream_output(lines: list[str]) -> list[str]:
    result: list[str] = []
    seen: set[str] = set()
    for line in lines:
        if not line or line in seen:
            continue
        seen.add(line)
        result.append(line)
    return result[-8:]


def _string_value(value: Any) -> str:
    if value is None:
        return ""
    return str(value)


def _normalize_desk_line_for_classification(line: str) -> str:
    value = re.sub(r"^[\u203a>\s]+", "", str(line or ""))
    value = re.sub(r"^[\u2500\-\s]+", "", value)
    value = re.sub(r"^\u2022\s*", "", value)
    return value.strip()


def _looks_like_desk_command_text(text: str) -> bool:
    return re.match(
        r"^(?:if\b|\$|\(|\[|'|\"|\.?\\|/|[A-Z]:\\|Get-|Set-|Select-|Where-|ForEach-|Measure-|New-|Remove-|Copy-|Move-|rg\b|node\b|python\b|py\b|npm\b|npx\b|tsx\b|git\b|cat\b|ls\b|dir\b|type\b|curl\b|pwsh\b|powershell\b|cmd\b)",
        str(text or "").strip(),
        re.IGNORECASE,
    ) is not None


def _is_desk_internal_command_line(text: str) -> bool:
    normalized = _normalize_desk_line_for_classification(text)
    attached = re.match(r"^(Running|Ran)(\S[\s\S]*)$", normalized, re.IGNORECASE)
    if attached and _looks_like_desk_command_text(attached.group(2)):
        return True
    marker = re.match(r"^(?:Running|Ran)(?:\s|:)+([\s\S]+)$", normalized, re.IGNORECASE)
    return bool(marker and _looks_like_desk_command_text(marker.group(1)))


def _is_desk_clipped_numeric_artifact_line(normalized: str) -> bool:
    if re.match(r"^\d{1,6}[+-](?!\d)(?:\s|$|[A-Za-z_$()[\]{}\"'`])", normalized):
        return True
    if not re.match(r"^\d{1,4}[a-z][A-Za-z0-9_.-]*", normalized, re.IGNORECASE):
        return False
    if re.search(r"[\uac00-\ud7a3]", normalized):
        return False
    return re.search(
        r"(?:connection-refused|signature|elapsedms|tool:|server|app_|guards|worki|readiness|failed|error|timeout|result|content|context|workspace)",
        normalized,
        re.IGNORECASE,
    ) is not None


def _is_desk_tool_output_line(text: str) -> bool:
    normalized = _normalize_desk_line_for_classification(text)
    if not normalized:
        return True
    if re.match(r"^(?:[A-Za-z0-9_.\\/-]+\.(?:html|js|ts|tsx|css|md|json|xconj):\d+:|\d{1,6}:)(?:\s|$|<|\{|\}|\(|\)|[\"'])", normalized):
        return True
    if re.match(r"^(?:\.\\|\.\/|[A-Za-z]:\\|[A-Za-z0-9_.-]+\\)[^\s]+", normalized):
        return True
    if re.match(r"^(?:design|guitar|assets|xcon|src|packages|providers|docs|examples)[\\/][^\s]+", normalized, re.IGNORECASE):
        return True
    if re.match(r"^(?:-a---|d----|Count\s+Name\b|FullName\b|Lines\s+Words\s+Characters\b|Line\s*\||Name\s+Source\b|Path\s+Exists\b)", normalized, re.IGNORECASE):
        return True
    if re.match(r"^\|[~\s]", normalized):
        return True
    if re.match(r"^\"[\w.-]+\":\s*", normalized):
        return True
    if re.match(r"^name:\s*[\w.-]+", normalized, re.IGNORECASE):
        return True
    if re.match(r"^(?:ERROR|WARNING)\s+[\w./\\-]+", normalized, re.IGNORECASE):
        return True
    if re.match(r"^\S+\s+@\S+", normalized):
        return True
    return False


def _is_desk_edited_block_line(text: str) -> bool:
    normalized = _normalize_desk_line_for_classification(text)
    if not normalized:
        return True
    if _is_desk_clipped_numeric_artifact_line(normalized):
        return True
    if re.match(r"^\u22ee+$", normalized):
        return True
    if re.match(r"^@@\s", normalized):
        return True
    if re.match(r"^\d+\s+[+-]\s?", normalized):
        return True
    if re.match(r"^[+-]\s+(?:import|export|const|let|var|function|class|interface|type|enum|if|else|for|while|switch|case|return|await|async|try|catch|finally|throw|describe\(|test\(|it\(|expect\(|beforeEach\(|afterEach\(|[}\])];,]|</?|//|/\*)", normalized, re.IGNORECASE):
        return True
    return re.match(r"^\d+\s{2,}(?:import|export|from\b|const|let|var|function|class|interface|type|enum|if|else|for|while|switch|case|return|await|async|try|catch|finally|throw|new\s+|describe\(|test\(|it\(|expect\(|beforeEach\(|afterEach\(|[}\])];,]|</?|//|/\*|[\w.]+\(|[\w$]+:\s*)", normalized, re.IGNORECASE) is not None


def _strip_attached_desk_narrative_prefix(line: str) -> str:
    normalized = str(line or "").strip()
    match = re.match(r"^(Running|Ran)([A-Z\uac00-\ud7a3][\s\S]*)$", normalized)
    if not match:
        return line
    if _looks_like_desk_command_text(match.group(2)):
        return line
    return match.group(2)


def _normalize_desk_visible_line(line: str) -> str:
    value = _strip_attached_desk_narrative_prefix(line)
    value = re.sub(r"^\s+", "", value)
    value = re.sub(r"^\u2022\s*", "", value)
    return value.strip()


def _is_desk_noisy_stream_text(text: str) -> bool:
    if not text:
        return True
    trimmed = str(text or "").strip()
    normalized = _normalize_desk_line_for_classification(trimmed)
    if not normalized:
        return True
    if _is_desk_internal_command_line(trimmed):
        return True
    if re.match(r"^[\u203a]\s*", trimmed):
        return True
    if re.match(r"^[\u2500\-\s]+$", normalized):
        return True
    if re.match(r"^[\u2502\u2514]\s*", trimmed):
        return True
    if re.match(r"^[\u2714\u25a1]\s+", trimmed):
        return True
    if re.match(r"^\u2026\s+\+\d+\s+lines\b", normalized, re.IGNORECASE):
        return True
    if _is_desk_edited_block_line(trimmed):
        return True
    if _is_desk_tool_output_line(trimmed):
        return True
    if re.match(r"^(?:Running|Ran|You ran|Edited|Exploring|Explored|Read|List|Search|Run|Interacted with|Waited for|Proposed Command|Updated Plan)(?:\s|:|$)", normalized, re.IGNORECASE):
        return True
    if re.match(r"^(?:Using\s+superpowers:|Instructions\s+say\b|execution error:|Write tests for @filename$|Searching the web$|Searched the web\b|Worked for\b|Output$|Implement\s+\{feature\}$)", normalized, re.IGNORECASE):
        return True
    if re.match(r"^(?:ing|ning|nning)\s+(?:Get-|Set-|Select-|Where-|ForEach-|rg\b|node\b|python\b|npm\b|npx\b|tsx\b|git\b)", normalized, re.IGNORECASE):
        return True
    if re.match(r"^(?:ent|tent|ontent)\s+-Raw\b", normalized, re.IGNORECASE):
        return True
    if re.match(r"^Working(?:\s*\(\d+s[\s\S]*\))?$", normalized, re.IGNORECASE):
        return True
    if re.match(r"^(?:\d+m\s*)?\d+s\s*\u2022\s*esc\s*to\s*interr?upt\)?$", normalized, re.IGNORECASE):
        return True
    if re.match(r"^(?:W|Wo|Wor|Work|Worki|Workin|orking|rking|king|ing|ng|g|\d+)$", normalized, re.IGNORECASE):
        return True
    if re.match(r"^(?:B|Bo|Boo|Boot|Booti|Bootin|Booting(?:\s+MCP\b.*)?|ing MCP\b.*)$", normalized, re.IGNORECASE):
        return True
    if re.match(r"^gpt-[\w.-]+\s+[\s\S]*\bleft\b", normalized, re.IGNORECASE):
        return True
    if re.search(r"\u00b7\s+[\s\S]*\bleft\b", normalized, re.IGNORECASE):
        return True
    return False


def _starts_desk_tool_output_context(text: str) -> bool:
    normalized = _normalize_desk_line_for_classification(text)
    attached = re.match(r"^(Running|Ran)(\S[\s\S]*)$", normalized, re.IGNORECASE)
    if attached and _looks_like_desk_command_text(attached.group(2)):
        return True
    ran = re.match(r"^Ran(?:\s|:)+([\s\S]+)$", normalized, re.IGNORECASE)
    if ran and _looks_like_desk_command_text(ran.group(1)):
        return True
    return re.match(r"^Runningif\b", normalized, re.IGNORECASE) is not None


def _starts_desk_edit_block_context(text: str) -> bool:
    normalized = _normalize_desk_line_for_classification(text)
    return re.match(r"^Edited(?:\s|:|$)", normalized, re.IGNORECASE) is not None or _is_desk_edited_block_line(text)


def _is_desk_narrative_boundary(text: str) -> bool:
    normalized = _normalize_desk_visible_line(text)
    if not normalized or len(normalized) < 10:
        return False
    if re.match(r"^[-*\u2022\u25a1\u2714\d]+(?:\s|[.:])", normalized):
        return False
    if _is_desk_noisy_stream_text(normalized):
        return False
    if re.search(r"[\uac00-\ud7a3]", normalized):
        return True
    return re.match(r"^[A-Z][A-Za-z0-9 ,'\"()[\].:;/-]{12,}[.!?]$", normalized) is not None


def _normalized_desk_stream_text(event: dict[str, Any], state: dict[str, int] | None = None) -> str:
    filter_state = state if isinstance(state, dict) else {"tool": 0, "edit": 0}
    lines: list[str] = []
    stream_text = _string_value(event.get("streamText") or event.get("text") or event.get("content") or event.get("data"))
    for raw_line in stream_text.split("\n"):
        line = raw_line.strip()
        if not line:
            continue
        if _starts_desk_edit_block_context(line):
            filter_state["edit"] = 160
            continue
        if filter_state.get("edit", 0) > 0:
            if not _is_desk_narrative_boundary(line):
                filter_state["edit"] = int(filter_state.get("edit", 0)) - 1
                continue
            filter_state["edit"] = 0
        if _starts_desk_tool_output_context(line):
            filter_state["tool"] = 12
            continue
        if _is_desk_internal_command_line(line):
            continue
        if filter_state.get("tool", 0) > 0:
            if not _is_desk_narrative_boundary(line):
                filter_state["tool"] = int(filter_state.get("tool", 0)) - 1
                continue
            filter_state["tool"] = 0
        if _is_desk_clipped_numeric_artifact_line(_normalize_desk_line_for_classification(line)):
            continue
        if _is_desk_noisy_stream_text(line):
            visible_candidate = _normalize_desk_visible_line(line)
            if visible_candidate == line or _is_desk_noisy_stream_text(visible_candidate):
                continue
        visible = _normalize_desk_visible_line(line)
        if visible:
            lines.append(visible)
    return "\n".join(lines)


def _canonical_desk_relay_stream_text(event: dict[str, Any]) -> str | None:
    if "relay" not in event:
        return None
    if _string_value(event.get("relay")).strip().lower() != "allow":
        return ""
    text = _string_value(
        event.get("relayText")
        or event.get("streamText")
        or event.get("text")
        or event.get("content")
        or event.get("data")
    ).strip()
    return _safe_canonical_desk_relay_text(text)


def _safe_canonical_desk_relay_text(text: str) -> str:
    lines: list[str] = []
    for raw_line in str(text or "").split("\n"):
        line = raw_line.strip()
        if not line:
            continue
        if _is_canonical_desk_relay_control_line(line):
            continue
        lines.append(line)
    return "\n".join(lines).strip()


def _is_canonical_desk_relay_control_line(line: str) -> bool:
    normalized = _normalize_desk_line_for_classification(line)
    if not normalized:
        return True
    if "\b" in line or "\x1b" in line or "\r" in line:
        return True
    if re.match(r"^(?:Output|Manual input sent|Automatic input sent|수동\s*전송|자동\s*전송)$", normalized, re.IGNORECASE):
        return True
    if re.match(r"^(?:PS|pwsh|powershell|cmd)(?:\s+[A-Z]:\\|\s+~|\s*>|\s*$)", normalized, re.IGNORECASE):
        return True
    if re.match(r"^PS\s+[^>]+>\s*[\s\S]*$", normalized, re.IGNORECASE):
        return True
    if re.match(r"^(?:echo|Write-Output|printf|Write-Host)\b", normalized, re.IGNORECASE):
        return True
    if re.search(r"\b(?:echo|Write-Output)\b[\s\S]*\b(?:echo|Write-Output)\b", normalized, re.IGNORECASE):
        return True
    if _is_desk_noisy_stream_text(line):
        visible = _normalize_desk_visible_line(line)
        if visible == line or _is_desk_noisy_stream_text(visible):
            return True
    return False
