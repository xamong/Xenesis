# Obsidian Vault Extension Port Design

Date: 2026-06-30
Status: Approved for implementation planning

## Goal

Port the sibling workspace Obsidian Vault Viewer into this repository as a
working Xenesis Desk renderer extension. The user-provided source folder is:

```text
D:\CodeTruck\CodeBox\Xamong\06 XCON\xenesis-desk\src\renderer\extensions\xenesis-desk.obsidian-vault
```

The current repository does not contain the `xenesis-desk.obsidian-vault`
renderer extension, its extension manifest, or the vault scan IPC/API surface.
Copying only the requested folder would not compile or run. The approved scope
is therefore a narrow integrated port that makes the viewer usable without
rewriting unrelated Desk architecture.

## Confirmed User Choice

The user approved the integrated port approach:

- Port the Obsidian Vault Viewer extension source and extension manifest.
- Add only the supporting shared types, preload API, main IPC scanner, Dock
  payload persistence, menu/tool wiring, explorer entry point, i18n strings,
  packaging entries, and focused tests needed for the viewer to work.
- Do not wholesale overwrite evolved current files from the sibling workspace.
- Do not add unrelated CR, provider, Agent, or runtime behavior.

## Source Findings

The sibling renderer extension contains:

- `renderer.tsx`: extension contribution for tool open, content rendering,
  content icon, and viewer content type registration.
- `panes/ObsidianVaultPane.tsx`: local vault selection, scan, filters, note
  list, preview, graph pane, inspector, panel resizing, and Dock state updates.
- `panes/ObsidianVaultMarkdownPreview.tsx`: Markdown preview with wikilink
  handling and attachment links.
- `panes/ObsidianVaultGraphView.tsx`: graph rendering through
  `@xcon-viewer/core` and `@xcon-viewer/viewer`.
- `vaultIndex.ts`, `vaultGraph.ts`, `vaultPath.ts`, `vaultPanelLayout.ts`,
  `vaultTypes.ts`, and CSS.
- Focused unit tests for index, graph, panel layout, and XCON viewer CSS
  scoping.

The sibling repository also includes required support outside that folder:

- `extensions/xenesis-desk.obsidian-vault/plugin.json`
- `extensions/xenesis-desk.obsidian-vault/main.js`
- shared `VaultApi`, `VaultScan*`, and `ObsidianVaultContentState` types
- `obsidian-vault` Dock content type
- `xenesis-desk.obsidian-vault.viewer` extension tool id
- `window.vaultAPI.scanLocal` in preload
- `vault:scan-local` IPC in main
- `src/main/vault/vaultLocalScanner.ts`
- Dock layout save/restore and payload update support for `obsidianVault`
- renderer extension render context with `engine` and `openFileByPath`
- File Explorer "Open as Vault" action
- i18n strings for Tools and explorer actions
- app menu / extension host / package build file entries

The current repository already has the required Markdown and XCON viewer
dependencies, including `@xcon-viewer/core` and `@xcon-viewer/viewer` at
`^0.2.0`.

## Scope

Implement the following:

- Copy the sibling source folder into:
  - `src/renderer/extensions/xenesis-desk.obsidian-vault`
- Add the shared Shadow DOM CSS helper used by the graph renderer:
  - `src/renderer/extensions/xconViewerCssScope.ts`
- Add the internal extension manifest and command shim:
  - `extensions/xenesis-desk.obsidian-vault/plugin.json`
  - `extensions/xenesis-desk.obsidian-vault/main.js`
- Add shared vault scan and viewer state types.
- Add the `obsidian-vault` Dock content type.
- Add the `xenesis-desk.obsidian-vault.viewer` extension tool id.
- Add main-process local vault scanner and IPC:
  - recursively scan `.md` and `.markdown`
  - skip `.obsidian`, `.git`, generated folders, hidden folders, symlinks, and
    root escapes
  - enforce max file count and max file size
  - convert read failures to warnings
- Expose `window.vaultAPI.scanLocal` through preload and renderer env types.
- Update Dock state to save, restore, and update `obsidianVault` content
  payloads.
- Update renderer extension `renderContent` context so extension panes can open
  files through the existing Markdown/file open flow.
- Add Tools menu / command palette wiring through the existing extension
  manifest and menu model paths.
- Add File Explorer folder action:
  - context menu "Open as Vault"
  - action bar "Open as Vault" when a directory is selected
- Add i18n keys:
  - `app.toolsObsidianVault`
  - `app.obsidianVaultOpened`
  - `fileExplorer.openAsVault`
- Add package build files for the internal Obsidian extension manifest.
- Add focused tests from the sibling workspace and adapt them to the current
  repo where needed.

## Out Of Scope

Do not implement these in this slice:

- No remote FTP/SFTP vault support.
- No external file watching.
- No Obsidian canvas support.
- No advanced block references or transclusion.
- No SQLite or FTS search backend.
- No direct Vault Viewer file write path.
- No new CR paths or Agent natural-language behavior.
- No provider or approval behavior changes.
- No wholesale replacement of current `App.tsx`, app menu, public release
  guard, or File Explorer with sibling versions.
- No claim that this is full Obsidian compatibility.

## Architecture

The Obsidian Vault Viewer is a renderer extension with a dedicated Dock content
type.

```text
extensions/xenesis-desk.obsidian-vault/main.js
  -> api.openTool('xenesis-desk.obsidian-vault.viewer')
  -> renderer extension openTool()
  -> Dock contentType 'obsidian-vault'
  -> ObsidianVaultPane
  -> window.vaultAPI.scanLocal()
  -> ipcMain 'vault:scan-local'
  -> src/main/vault/vaultLocalScanner.ts
```

The viewer owns vault analysis and preview state. MarkdownPane remains the edit
surface. When the vault viewer opens a note or attachment, it delegates to the
existing file open path instead of adding a new file writer.

Dock content payload persists the viewer state:

- `vaultRootPath`
- `selectedNoteId`
- `query`
- `tag`
- `issue`
- `graphScope`
- `panelSizes`

## Safety

The local scanner must keep strict vault boundaries:

- Scan only a user-selected root or a folder selected in File Explorer.
- Do not follow symlinks.
- Reject files or directories outside the real vault root.
- Limit indexed file count and per-file bytes.
- Treat read errors as warnings, not crashes.
- Do not auto-open unsafe attachment paths that escape the vault root.
- Render Markdown through the existing `react-markdown` safe pipeline with
  executable HTML disabled.

## Testing And Verification

Focused verification:

- `node --import tsx --test src/main/vault/vaultLocalScanner.test.ts`
- `node --import tsx --test src/renderer/extensions/xenesis-desk.obsidian-vault/vaultIndex.test.ts`
- `node --import tsx --test src/renderer/extensions/xenesis-desk.obsidian-vault/vaultGraph.test.ts`
- `node --import tsx --test src/renderer/extensions/xenesis-desk.obsidian-vault/vaultPanelLayout.test.ts`
- `node --import tsx --test src/renderer/extensions/xenesis-desk.obsidian-vault/xconViewerCssScope.test.ts`
- `node --import tsx --test src/renderer/dock/engineVaultContent.test.ts`
- Existing affected tests for app menu and editable surfaces, if added or
  changed.

Broad verification:

- `npm run typecheck`
- `npm test`
- `npm run check:public-release`

Manual smoke target:

- Open Xenesis Desk.
- Open Obsidian Vault Viewer from Tools.
- Choose a small local Markdown vault.
- Verify note list, search/tag/unresolved/orphan filters, preview, graph, and
  inspector render.
- Open a note in the existing MarkdownPane.
- Save and restore workspace, then confirm the vault tab state persists.

## Risks

- The current app menu and public release guard have diverged from the sibling
  workspace. Only minimal targeted patches should be applied.
- The renderer extension API currently lacks render context parameters in this
  repo. Adding them affects all renderer extensions, so existing extension
  behavior must remain compatible.
- File Explorer has evolved in this repo. The "Open as Vault" action should be
  added without replacing unrelated explorer behavior.
- The sibling design mentioned YAML-capable frontmatter parsing as preferred,
  but the copied implementation uses a small local parser. This port keeps
  sibling behavior first; richer parsing can be a later enhancement.

## Success Criteria

- The Obsidian Vault Viewer opens from Tools / command palette.
- A local folder can be opened as a vault from File Explorer.
- Markdown vault scanning returns structured results and warnings.
- Vault preview, wikilinks, backlinks, tags, unresolved links, orphan filters,
  and graph model work at the sibling implementation level.
- Opening notes delegates to the existing file open / MarkdownPane flow.
- Workspace save/restore preserves vault viewer state.
- Focused tests, root typecheck, root tests, and public release check pass or
  exact failures are recorded.
