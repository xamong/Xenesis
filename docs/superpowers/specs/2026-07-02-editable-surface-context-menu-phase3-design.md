# Editable Surface Context Menu Phase 3 Design

Date: 2026-07-02
Status: Approved for implementation

## Purpose

Phase 1 standardized edit commands for saveable document surfaces. Phase 2
extended the shared native text adapter to high-traffic composer and command
inputs. Phase 3 audits the remaining renderer text-entry surfaces and applies
the same shared editable-surface behavior where it is safe and expected.

## Scope

Phase 3 covers remaining renderer `textarea`, `input`, and `contenteditable`
surfaces outside the Phase 1 and Phase 2 sets.

Each surface is classified as:

- General text input: adopt `createNativeTextAdapter` and `useEditableSurface`.
- Secret or credential input: keep native browser behavior unless a masked,
  secret-aware adapter is introduced later.
- Read-only preview/display: keep read-only behavior or use a copy/select-only
  preview adapter only when the surface has real selectable content.
- Specialized control: defer when the control's existing behavior is not a
  standard text-editing workflow.

## Implementation Strategy

1. Add a static integration guard that lists the Phase 3 adopted surfaces and
   records excluded categories so future one-off edit menus are not added
   silently.
2. Apply the native text adapter to ordinary, non-secret text entry fields that
   currently rely on browser defaults.
3. Preserve existing submit, keyboard, save, and validation behavior by calling
   the shared edit shortcut handler first, then the pane-specific handler only
   when the edit layer did not consume the event.
4. Document excluded secret, preview, and specialized controls in `handoff.md`.

## Non-Goals

- Do not alter file save semantics or provider/profile persistence.
- Do not expose custom copy/cut/paste menus for API keys, passwords, tokens, or
  other credential fields.
- Do not rework terminal copy/paste behavior.
- Do not force shared menu behavior onto controls whose primary interaction is
  not text editing.

## Verification

- RED/GREEN focused integration guard for adopted Phase 3 surfaces.
- Targeted Biome check on changed files.
- Root typecheck.
- Root tests.
- `git diff --check`.

