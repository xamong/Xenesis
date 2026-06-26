import fsSync from 'node:fs';
import path from 'node:path';

// Build/refresh an isolated CODEX_HOME for the embedded Desk codex so it does NOT
// load the user's enabled plugins/skills — those inject their tool schemas into
// the codex model context on every turn and are the dominant source of the
// embedded agent's cold-start input bloat (measured ~31K tokens for a trivial
// prompt). The Desk agent only needs the injected xenesis_dev MCP tools.
//
// We do NOT write an empty config: the gpt-5.5 model is provided by the
// openai-primary-runtime marketplace (it is not a codex built-in), so a fully
// minimal home silently degrades the model to gpt-5.4-mini. Instead we COPY the
// real config and strip only the bloat sections:
//   DROP  [plugins.*]            enabled plugin tool schemas (the bulk of 31K)
//   DROP  [[skills.*]]           skill definitions
//   DROP  [projects.*]           per-project trust (re-added for the Desk cwd only)
//   DROP  [marketplaces.<other>] personal marketplaces (xcon/personal/role-specific)
//   KEEP  top-level scalars      model = "gpt-5.5", service_tier, etc.
//   KEEP  [marketplaces.openai-primary-runtime]   so gpt-5.5 stays available
//   KEEP  [tui.*]                incl. model_availability_nux (model gating)
// auth.json is copied FRESH every call (OAuth tokens rotate). The user's real
// ~/.codex (and their interactive codex CLI) is never touched. Returns the
// isolated home path, or null if it could not be prepared (no credentials, fs
// error) — the caller then leaves CODEX_HOME unset and codex uses the real home.
export function prepareCodexIsolatedHome(
  { realCodexHome, isolatedHome, reasoningEffort, workspaceCwd },
  fs = fsSync
) {
  try {
    if (!realCodexHome || !isolatedHome) return null;
    const realAuth = path.join(realCodexHome, 'auth.json');
    if (!fs.existsSync(realAuth)) return null;

    fs.mkdirSync(isolatedHome, { recursive: true });
    fs.copyFileSync(realAuth, path.join(isolatedHome, 'auth.json'));

    let kept = '';
    try {
      kept = filterCodexConfig(fs.readFileSync(path.join(realCodexHome, 'config.toml'), 'utf8'));
    } catch {
      kept = '';
    }
    const trustKey = tomlProjectKey(workspaceCwd);
    const trustBlock = trustKey ? `\n[projects.${trustKey}]\ntrust_level = "trusted"\n` : '';
    // Reasoning effort is authoritatively pinned via -c at launch; note it for clarity.
    const header =
      reasoningEffort && reasoningEffort !== 'default'
        ? `# Desk pins model_reasoning_effort=${reasoningEffort} via -c at launch.\n`
        : '';
    fs.writeFileSync(
      path.join(isolatedHome, 'config.toml'),
      `${header}${kept.trimEnd()}\n${trustBlock}`,
      'utf8'
    );
    return isolatedHome;
  } catch {
    return null;
  }
}

// Keep top-level scalars + [tui.*] + the openai-primary-runtime marketplace
// (the gpt-5.5 source). Drop [plugins.*], [[skills.*]], [projects.*], and any
// other (personal) marketplace — those are the cold-start context bloat.
export function filterCodexConfig(text) {
  const out = [];
  let dropping = false;
  for (const line of String(text).split(/\r?\n/)) {
    const section = line.match(/^\s*\[\[?\s*([^\]]+?)\s*\]\]?\s*$/);
    if (section) {
      const name = section[1];
      dropping =
        /^plugins\b/.test(name) ||
        /^skills\b/.test(name) ||
        /^projects\b/.test(name) ||
        (/^marketplaces\b/.test(name) && !name.includes('openai-primary-runtime'));
    }
    if (!dropping) out.push(line);
  }
  return out.join('\n');
}

// Read the user's chosen model (first top-level `model = "..."`) from the real
// codex config, so the embedded launch can force it via -c. In an isolated home
// the model does not auto-resolve (gpt-5.5 is gated by the dropped plugins), so
// it must be forced explicitly or codex falls back to a built-in mini.
export function readCodexModel(realCodexHome, fs = fsSync) {
  try {
    const text = fs.readFileSync(path.join(realCodexHome, 'config.toml'), 'utf8');
    const match = text.match(/^\s*model\s*=\s*"([^"]+)"/m);
    return match ? match[1] : '';
  } catch {
    return '';
  }
}

function tomlProjectKey(cwd) {
  const s = String(cwd ?? '').trim();
  if (!s) return null;
  // codex uses single-quoted literal keys (backslashes are literal); a literal
  // string cannot contain a single quote, so fall back to a basic string then.
  return s.includes("'") ? JSON.stringify(s) : `'${s}'`;
}
