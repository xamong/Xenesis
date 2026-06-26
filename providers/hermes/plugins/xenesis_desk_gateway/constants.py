from __future__ import annotations

import re


TOOLSET = "xenesis_desk_gateway"
APPROVAL_PATTERN_KEY = "xenesis_desk_gateway:terminal_run"
XCON_APPROVAL_PATTERN_KEY = "xenesis_desk_gateway:xcon_markdown_write"
EXTENSION_APPROVAL_PATTERN_KEY = "xenesis_desk_gateway:extension_command"
DOCK_CLOSE_APPROVAL_PATTERN_KEY = "xenesis_desk_gateway:dock_close"
PLAYWRIGHT_APPROVAL_PATTERN_KEY = "xenesis_desk_gateway:playwright"
DEFAULT_BRIDGE_URL = "http://127.0.0.1:3847"
BRIDGE_TIMEOUT_SECONDS = 15
MCP_TOOL_TIMEOUT_SECONDS = 90
APPROVAL_TIMEOUT_SECONDS = 300
ACTION_TOKEN_TTL_SECONDS = 600
ACTION_TOKEN_DIGITS = 6
ACTION_CLEAR_MODES = {"expired", "used", "pending", "all"}
ACTION_CLEAR_USAGE = "Usage: /xd action-clear [expired|used|pending|all]"
PANEL_PLACEMENTS = {"tab", "left", "right", "top", "bottom"}
XCON_FENCE_LANGUAGES = {"xcon", "xcon-sketch", "sketch"}
WINDOWS_ABSOLUTE_PATH_RE = re.compile(r"^(?:[A-Za-z]:[\\/]|\\\\)")
WSL_MOUNT_PATH_RE = re.compile(r"^/mnt/[A-Za-z](?:/|$)")
SELECTOR_RE = re.compile(r"^#([1-9][0-9]*)$")
BARE_SELECTOR_RE = re.compile(r"^([1-9][0-9]*)$")
DOCK_SELECTION_KINDS = {"panels", "files"}
GLOBAL_DOCK_SELECTION_KEY = "__global_dock_selection__"
GLOBAL_TERMINAL_SELECTION_KEY = "__global_terminal_selection__"
GLOBAL_LAST_SELECTION_KEY = "__global_last_selection__"
GLOBAL_SELECTION_KEY = "__global_selection__"
XD_ARGS_HINT = "[menu|quick|workflow|launch|find|cleanup|stash|recommend|packet|status|doctor|selftest|readiness|watch|timeline|digest|compatibility|upgrade-notes|repair|snapshot|brief|handoff|export|exports|support-bundle|pin|inbox|state|context|context-actions #N|action-history|action-clear|commands|command #N|terminals|panels|bridge-panels|files|logs|focus #N|close #N|run|open|prompt|xcon|pw|extensions|exec #N]"
ACTION_CALLBACK_RE = re.compile(r"^(?:xd-action|xenesis_desk_action):([A-Za-z0-9_-]+)$")
ACTION_COMMAND_CALLBACK_RE = re.compile(r"^(?:xd-command|xenesis_desk_command):(.+)$", re.DOTALL)
WORKFLOW_FAILURE_MARKERS = (
    "usage:",
    "no xenesis desk",
    "mobile approval denied",
    "xenesis desk command failed",
    "file does not exist",
    "content is required",
)
