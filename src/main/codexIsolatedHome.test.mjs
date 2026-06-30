import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { filterCodexConfig, prepareCodexIsolatedHome } from './codexIsolatedHome.mjs';

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cxhome-'));
}

const REAL_CONFIG = [
  'model = "gpt-5.5"',
  'model_reasoning_effort = "xhigh"',
  'service_tier = "default"',
  '',
  '[tui.model_availability_nux]',
  '"gpt-5.5" = 4',
  '',
  "[projects.'E:\\\\old_ws']",
  'trust_level = "trusted"',
  '',
  '[marketplaces.openai-primary-runtime]',
  'source_type = "local"',
  'source = "x"',
  '',
  '[marketplaces.xcon-factory-local]',
  'source_type = "local"',
  'source = "F:\\\\xcon-skills"',
  '',
  '[plugins."documents@openai-primary-runtime"]',
  'enabled = true',
  '',
  '[[skills.config]]',
  'name = "superpowers"',
  '',
].join('\n');

test('filterCodexConfig keeps model + openai-primary-runtime + tui, drops plugins/skills/projects/other-marketplaces', () => {
  const out = filterCodexConfig(REAL_CONFIG);
  assert.match(out, /model = "gpt-5\.5"/, 'keeps model scalar (gpt-5.5 source)');
  assert.match(out, /\[marketplaces\.openai-primary-runtime\]/, 'keeps the gpt-5.5 marketplace');
  assert.match(out, /\[tui\.model_availability_nux\]/, 'keeps tui model availability');
  assert.doesNotMatch(out, /\[plugins\./, 'drops enabled plugins (the bloat)');
  assert.doesNotMatch(out, /\[\[skills/, 'drops skills');
  assert.doesNotMatch(out, /xcon-factory-local/, 'drops personal marketplaces');
  assert.doesNotMatch(out, /old_ws/, 'drops pre-existing project trust');
});

test('prepares isolated home: copies auth, keeps gpt-5.5, adds Desk workspace trust', () => {
  const real = tmp();
  const iso = path.join(tmp(), 'codex-home');
  fs.writeFileSync(path.join(real, 'auth.json'), '{"tokens":{"access":"x"}}');
  fs.writeFileSync(path.join(real, 'config.toml'), REAL_CONFIG);

  const out = prepareCodexIsolatedHome({
    realCodexHome: real,
    isolatedHome: iso,
    reasoningEffort: 'medium',
    workspaceCwd: 'E:\\desk_ws',
  });

  assert.equal(out, iso);
  assert.ok(fs.existsSync(path.join(iso, 'auth.json')), 'auth.json copied');
  const cfg = fs.readFileSync(path.join(iso, 'config.toml'), 'utf8');
  assert.match(cfg, /model = "gpt-5\.5"/, 'gpt-5.5 preserved');
  assert.match(cfg, /\[marketplaces\.openai-primary-runtime\]/, 'model marketplace preserved');
  assert.match(cfg, /\[projects\.'E:\\desk_ws'\]/, 'Desk workspace trust added');
  assert.doesNotMatch(cfg, /\[plugins\./, 'plugin bloat dropped');
  assert.doesNotMatch(cfg, /old_ws/, 'old project trust dropped');
});

test('returns null when no auth.json (never isolate without credentials)', () => {
  const real = tmp();
  const iso = path.join(tmp(), 'codex-home');
  const out = prepareCodexIsolatedHome({
    realCodexHome: real,
    isolatedHome: iso,
    reasoningEffort: 'medium',
    workspaceCwd: 'E:\\x',
  });
  assert.equal(out, null);
});

test('refreshes auth.json on every call (token rotation)', () => {
  const real = tmp();
  const iso = path.join(tmp(), 'codex-home');
  fs.writeFileSync(path.join(real, 'config.toml'), 'model = "gpt-5.5"\n');
  fs.writeFileSync(path.join(real, 'auth.json'), '{"v":1}');
  prepareCodexIsolatedHome({
    realCodexHome: real,
    isolatedHome: iso,
    reasoningEffort: 'medium',
    workspaceCwd: 'E:\\x',
  });
  fs.writeFileSync(path.join(real, 'auth.json'), '{"v":2}');
  prepareCodexIsolatedHome({
    realCodexHome: real,
    isolatedHome: iso,
    reasoningEffort: 'medium',
    workspaceCwd: 'E:\\x',
  });
  assert.equal(fs.readFileSync(path.join(iso, 'auth.json'), 'utf8'), '{"v":2}');
});
