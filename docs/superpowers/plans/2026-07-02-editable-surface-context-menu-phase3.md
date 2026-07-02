# Editable Surface Context Menu Phase 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the shared edit context menu to remaining safe native text-entry fields without touching every pane individually.

**Architecture:** Add one renderer-level `GlobalNativeEditSurface` component that listens for native text field focus, context menu, and keyboard shortcuts. It creates a dynamic `createNativeTextAdapter` for the active eligible field, skips secret/specialized fields, and renders the existing `EditContextMenu`.

**Tech Stack:** React, renderer editing layer, Node test runner, Biome, TypeScript.

---

### Task 1: Guard Eligible Native Text Surface Behavior

**Files:**
- Create: `src/renderer/editing/globalNativeEditSurface.test.ts`
- Create: `src/renderer/editing/globalNativeEditSurface.tsx`
- Modify: `src/renderer/editing/editableSurfaceIntegration.test.ts`

- [ ] **Step 1: Write the failing model test**

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { isEligibleGlobalNativeEditElement } from './globalNativeEditSurface';

test('global native edit surface accepts safe text inputs and textareas', () => {
  const textarea = { tagName: 'TEXTAREA', readOnly: false, disabled: false } as HTMLTextAreaElement;
  const textInput = { tagName: 'INPUT', type: 'text', readOnly: false, disabled: false } as HTMLInputElement;
  const searchInput = { tagName: 'INPUT', type: 'search', readOnly: false, disabled: false } as HTMLInputElement;

  assert.equal(isEligibleGlobalNativeEditElement(textarea), true);
  assert.equal(isEligibleGlobalNativeEditElement(textInput), true);
  assert.equal(isEligibleGlobalNativeEditElement(searchInput), true);
});

test('global native edit surface rejects secrets and non-text controls', () => {
  const password = { tagName: 'INPUT', type: 'password', readOnly: false, disabled: false } as HTMLInputElement;
  const checkbox = { tagName: 'INPUT', type: 'checkbox', readOnly: false, disabled: false } as HTMLInputElement;
  const apiKey = {
    tagName: 'INPUT',
    type: 'text',
    readOnly: false,
    disabled: false,
    id: 'providerApiKey',
    name: 'apiKey',
    placeholder: 'API key',
    getAttribute(name: string) {
      return name === 'aria-label' ? 'API key' : null;
    },
  } as unknown as HTMLInputElement;

  assert.equal(isEligibleGlobalNativeEditElement(password), false);
  assert.equal(isEligibleGlobalNativeEditElement(checkbox), false);
  assert.equal(isEligibleGlobalNativeEditElement(apiKey), false);
});
```

- [ ] **Step 2: Run test to verify RED**

Run: `node --import tsx --test src/renderer/editing/globalNativeEditSurface.test.ts`

Expected: FAIL because `globalNativeEditSurface.tsx` does not exist.

- [ ] **Step 3: Add static integration guard**

Add assertions to `src/renderer/editing/editableSurfaceIntegration.test.ts` checking that `App.tsx` renders `GlobalNativeEditSurface` and that the component uses `createNativeTextAdapter`, `EditContextMenu`, `resolveEditShortcut`, and secret filtering.

### Task 2: Implement Global Native Edit Surface

**Files:**
- Create: `src/renderer/editing/globalNativeEditSurface.tsx`
- Modify: `src/renderer/App.tsx`

- [ ] **Step 1: Implement eligibility helpers**

Create `isEligibleGlobalNativeEditElement(target: EventTarget | null): target is HTMLInputElement | HTMLTextAreaElement` with these rules:

- `textarea` is eligible unless it is secret-labelled.
- `input` is eligible only for `text`, `search`, `url`, `email`, `tel`, or an empty/default type.
- `password`, checkbox/radio/file/color/date/time/number/range and other specialized input types are excluded.
- Fields whose `id`, `name`, `autocomplete`, `placeholder`, or `aria-label` include `password`, `secret`, `token`, `api key`, `apikey`, `api-key`, `credential`, or `bearer` are excluded.

- [ ] **Step 2: Implement the component**

`GlobalNativeEditSurface` should:

- Track the active eligible element in a ref.
- Use `createNativeTextAdapter({ id: 'global-native-edit-surface', label: 'Native text field', getElement })`.
- On document `focusin` and `pointerdown`, update the active element when the target is eligible.
- On document `contextmenu` bubble phase, skip if `event.defaultPrevented`, then prevent default for eligible elements and show `EditContextMenu`.
- On document `keydown` bubble phase, skip if `event.defaultPrevented`, resolve edit shortcuts, run only enabled commands, and prevent default only when the adapter handles the command.
- Never include Save for the global menu.

- [ ] **Step 3: Render once from App**

Import and render `<GlobalNativeEditSurface />` near the root app shell so all renderer panes can share it.

### Task 3: Verify and Document

**Files:**
- Modify: `handoff.md`

- [ ] **Step 1: Run focused tests**

Run:

```powershell
node --import tsx --test src/renderer/editing/globalNativeEditSurface.test.ts src/renderer/editing/editableSurfaceIntegration.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run targeted static checks**

Run:

```powershell
npx biome check src/renderer/editing/globalNativeEditSurface.tsx src/renderer/editing/globalNativeEditSurface.test.ts src/renderer/editing/editableSurfaceIntegration.test.ts src/renderer/App.tsx docs/superpowers/specs/2026-07-02-editable-surface-context-menu-phase3-design.md docs/superpowers/plans/2026-07-02-editable-surface-context-menu-phase3.md --max-diagnostics=80
```

Expected: PASS or warnings only outside the changed slice.

- [ ] **Step 3: Run broad verification**

Run:

```powershell
npm run typecheck
git diff --check
npm test
```

Expected: all exit 0.

- [ ] **Step 4: Update handoff**

Record adopted global native input behavior, excluded secret/specialized/contenteditable surfaces, exact commands, exact results, and remaining live-smoke gap.

