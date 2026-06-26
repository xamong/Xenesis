# Bible Mission — Live Agent Test Log

Real, interactive end-to-end test of the Xenesis Desk agent (codex-app-server +
CR control + mode-based reasoning + thinking-block UI). Mission given by the
user: via the agent, create an `E:\bible` folder and produce Bible-study quiz
materials for church (HTML, PPT, etc.), step by step, with the controller (me)
answering the agent's questions.

Driven through a persistent Playwright REPL driver (scratchpad/mission-repl.js):
the Electron app stays open; each turn is a real prompt typed into the Agent
pane, with inline Desk approvals clicked ("승인 후 실행"), and per-turn screenshots
+ responses captured (scratchpad/mission-shots, scratchpad/mission-resp).

Environment: provider auto -> codex-app-server; XENESIS_STREAM_IDLE_MS=600000 for
slow work-mode turns; mode-based reasoning effort (chat=low, plan=medium,
work=high).

---

## Turn log

(filled in as the mission proceeds — each turn records: my prompt, the mode, the
agent's response/question, CR tool calls, approvals, files produced, timing,
screenshot ref, and whether the thinking-process block appeared.)

### Turn 1 — create E:\bible (mode: chat)
- My prompt: "E 드라이브에 bible 이라는 폴더를 새로 만들어줘."
- Provider: codex-app-server · 50s · work log: 3 events · 1 tools · approvals: 0.
- THINKING BLOCK: **appeared** ✓ (240 chars) — preserved the agent's intermediate
  narration ("현재 환경이 읽기 전용이라 ... 상태를 확인 중입니다 ...") in a collapsible
  "사고 과정" panel. Phase 1 thinking-block UI confirmed working.
- Agent answer: "이 환경에서는 E:\bible 폴더를 새로 만들 수 없습니다. 현재는 읽기 전용이라
  생성 작업이 막혀 있습니다."
- Result: folder NOT created. The agent treated codex's `--sandbox read-only` as
  "cannot write", instead of using a Desk CR terminal (xd.terminals.run mkdir,
  which executes with approval). Finding: agent does not map "create folder" to a
  CR terminal command on its own.
- Controller action: guide it to use a Desk terminal (next turn).

### Turn 2 — guide to Desk terminal (mode: chat)
- My prompt: "Desk 안에서 터미널을 하나 열고, 그 터미널에서 명령으로 E:\bible 폴더를 만들어줘.
  터미널 명령 실행은 읽기 전용 샌드박스가 아니라 실제로 실행되니까 가능해."
- 11s · work log 7 events · 5 tools · approvals: 1 (clicked 승인 후 실행) · thinking block ✓ (14 chars).
- Agent: USED the CR terminal — `xd.terminals.run` Desk action completed (opened a
  powershell terminal, pid 70212). Good: it switched from "read-only, can't" to a
  real CR terminal command after guidance.
- BUT E:\bible still not created — the captured command was truncated; the run
  likely opened the shell without the mkdir, or the command did not create the dir.
- Controller action: give the exact New-Item command explicitly (next turn).

### Turn 3/4 — explicit command in chat mode (FAILED — agent behavior bug)
- t3 was SKIPPED by the driver (my JSON had an invalid `\ ` escape from echo).
  Fixed command writing to use node JSON.stringify + forward-slash paths.
- t4 (chat/low): "Desk 터미널에서 아래 PowerShell 명령을 그대로 한 줄로 실행해줘 ...
  New-Item -ItemType Directory -Path E:/bible -Force ; Test-Path E:/bible".
- Screenshot (t4-done.png) shows the SMOKING GUN: the terminal received
  "아래 PowerShell 명령을 그대로 한 줄로" and errored with
  "'아래' ... CommandNotFoundException". The agent passed a FRAGMENT OF MY KOREAN
  INSTRUCTION into the terminal instead of the actual New-Item command.
- FINDING: at chat/low reasoning, the agent fails to extract/generate the real
  shell command — it echoes my instruction text into xd.terminals.run. Folder
  still not created. Switching to work mode (high reasoning) next.
- (thinking block kept appearing each turn ✓.)

### Turn 5 — work mode attempt (FAILED — effort did not switch + still echoed)
- t5 (mode: work): "E 드라이브에 bible 폴더를 만들어야 해. Desk 터미널에서 다음 명령을 실행해줘: New-Item ...".
- Footer flipped to mode=work, but the turn took only 10s (high would be ~180s) →
  the persistent codex app-server process kept the turn-1 (chat=low) effort; a
  mid-session mode change did NOT re-spawn at high. (Implementation limitation.)
- Screenshot (t5-done.png): terminal received "다음 명령을" → CommandNotFoundException.
  The agent again echoed my instruction fragment as the shell command. Folder NOT created.

### Pivot — regression analysis (user: it worked in the OTHER repos, esp. backup)
User clarified that real file/terminal agent work succeeded in E:\test_git,
E:\xenesis-desk, E:\xenesis-desk-backup (best), E:\xenesis-final — NOT (only) about
my effort change. So this is a regression vs those repos. Quick diff findings:
- deskNaturalIntentCatalog.ts: IDENTICAL (434L) target vs backup.
- CR caps (xd.terminals.*, xd.files.*): essentially identical.
- cliProvider.ts: ~identical (3-line attachment diff).
- BUT **AgentRunner.ts differs hugely: target 5454L vs backup 4673L (~885 diff
  lines; target +781)**; AgentRuntimeFactory.ts differs (147). The target's
  agent-runtime logic (public-release guards/policies?) is the prime suspect.
- Launched wf agent-terminal-regression-analysis (backup vs target): AgentRunner
  tool-call handling, terminal tool definition, effort/provider, and the
  xd.terminals.run handler. Awaiting result before any fix.

### What IS confirmed working in the live target
- codex-app-server provider + CR (xd.terminals.run executed with approval).
- Phase-1 thinking-process block: appears each turn (verified in screenshots).

### Root cause CONFIRMED + auto-reasoning REMOVED (user decision)
- Cross-repo analysis (backup vs target) confirmed: terminal tool definition +
  intent catalog are byte-identical to the backup. The regression was the
  reasoning-effort downgrade I introduced (chat=low). The backup ran at the
  user's ~/.codex/config.toml xhigh and generated correct commands; at low the
  model echoes the prompt into the command slot.
- Also found: target is MISSING the runTerminalAndWait handler the backup has
  (separate regression; symptom is hang/exception, not echo).
- Per user direction, REMOVED all my reasoning-effort code (codexReasoning.*,
  the index.ts injections). The agent now inherits the user's codex config
  (xhigh) = backup behavior. KEPT the real fixes: MCP env wiring
  (XENIS_MCP_STATE_FILE/SERVER_PATH), stream-idle watchdog, and the Phase-1
  thinking-process block UI. Built (electron-vite, exit 0).

### BREAKTHROUGH — agent does real file/coding work via CR (2026-06-26)
- At reasoning effort = medium (Desk setting), the agent (codex-app-server) wrote
  E:/bible/quiz.html (valid HTML, folder auto-created) via xd.files.applyTextWrite.
  No echo, correct content. Real file/coding work CONFIRMED working.
- Reframes the "permission problem": file writes + terminal (with approval, the
  card DID appear in earlier turns, approvals:1) work. The Desk approval mechanism
  itself works (index.ts:11857 records an approval inbox item when a capability
  returns approvalRequired).
- The specific blocker was "create a FOLDER": there is NO folder-create intent in
  deskNaturalIntentCatalog (only explorer.navigate/terminal.control/files.*), so
  codex had no clean CR path to map "make a folder" to and punted to chat
  "approval needed" text. File writes auto-create the parent dir, so the mission
  (HTML/PPT) proceeds without a dedicated folder-create step.
- Path correction vs the research synthesis: codex self-executes MCP CR calls and
  the provider returns only text (cliProvider.ts:1631), so AgentRunner/policy.ts
  is NOT on the codex path; the synthesis's policy.ts deny->ask fix is for the
  native/claude agent, not codex. The codex approval path is the Desk bridge
  (index.ts:11842 callMcpBridgeCapabilityFromRequest), which works.
