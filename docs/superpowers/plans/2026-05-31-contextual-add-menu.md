# Contextual Add Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Issue #22 by replacing many direct add buttons with one contextual `+ 追加` menu that only shows valid add operations for the selected Flex Message node.

**Architecture:** Keep Flex Message add rules in `client/src/lib/flexAdd.ts`, not in UI components. `Studio` derives add actions from the parsed root and selected path, then passes those actions to `TreeActionBar`, which only renders the menu and reports the selected action back.

**Tech Stack:** React, TypeScript, Node test runner, React server rendering tests, existing `immer`-based path helpers, existing button styling.

---

## 日本語サマリー

Issue #22 の実装計画です。既存の action bar に並んでいる `text 追加` / `image 追加` のような個別ボタンを、`+ 追加` ボタン 1 つにまとめます。クリックすると、選択中 node に応じて valid な追加候補だけをメニュー表示します。box / carousel / bubble optional slot 追加までを初回スコープにします。

## File Structure

- Modify `client/src/lib/flexAdd.ts`
  - Add typed `AddAction` objects.
  - Add `getAddableActions(root, selectedPath)`.
  - Add `addNodeByAction(root, action)`.
  - Keep existing `createDefaultNode()` and `getAddableTypesForNode()` exports for compatibility if other code still imports them.
- Create `client/src/lib/flexAdd.test.ts`
  - Focused helper tests for action generation and insertion.
- Modify `client/src/components/TreeActionBar.tsx`
  - Replace `canAddChild` / `addableTypes` / `onAddChild` props with `addActions` / `addReason` / `onAddAction`.
  - Render one `+ 追加` trigger and a lightweight menu/list.
- Modify `client/src/components/TreeActionBar.test.tsx`
  - Update render helper props.
  - Assert menu markup contains contextual candidates and disabled states.
- Modify `client/src/pages/Studio.tsx`
  - Use `getAddableActions()` and `addNodeByAction()`.
  - Select `action.selectionPath` after insertion.
  - Remove direct `getAddableTypesForNode()` / `createDefaultNode()` usage from Studio.

## Task 1: Add contextual add helper tests

**Files:**
- Create: `client/src/lib/flexAdd.test.ts`
- Modify: none

- [ ] **Step 1: Write failing helper tests**

Create `client/src/lib/flexAdd.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { addNodeByAction, getAddableActions } from "./flexAdd";

const bubbleRoot = {
  type: "bubble",
  body: {
    type: "box",
    layout: "vertical",
    contents: [{ type: "text", text: "Alpha" }],
  },
};

const bubbleWithSlots = {
  type: "bubble",
  header: { type: "box", layout: "vertical", contents: [] },
  hero: { type: "image", url: "https://example.com/hero.png" },
  body: { type: "box", layout: "vertical", contents: [] },
  footer: { type: "box", layout: "vertical", contents: [] },
};

const carouselRoot = {
  type: "carousel",
  contents: [
    { type: "bubble", body: { type: "box", layout: "vertical", contents: [] } },
  ],
};

test("box selection returns contents item add actions", () => {
  const actions = getAddableActions(bubbleRoot, ["body"]);

  assert.deepEqual(actions.map((action) => action.id), [
    "add-box",
    "add-text",
    "add-image",
    "add-button",
    "add-separator",
    "add-spacer",
    "add-icon",
  ]);
  assert.deepEqual(actions[1], {
    id: "add-text",
    label: "text 追加",
    type: "text",
    kind: "contents-item",
    targetPath: ["body", "contents"],
    selectionPath: ["body", "contents", 1],
    node: { type: "text", text: "New text" },
  });
});

test("carousel selection returns only bubble add action", () => {
  const actions = getAddableActions(carouselRoot, []);

  assert.deepEqual(actions.map((action) => action.id), ["add-bubble"]);
  assert.deepEqual(actions[0].selectionPath, ["contents", 1]);
  assert.deepEqual(actions[0].node, {
    type: "bubble",
    body: { type: "box", layout: "vertical", contents: [] },
  });
});

test("bubble selection returns missing optional slot actions", () => {
  const actions = getAddableActions(bubbleRoot, []);

  assert.deepEqual(actions.map((action) => action.id), [
    "add-header",
    "add-hero",
    "add-footer",
  ]);
  assert.deepEqual(actions.map((action) => action.selectionPath), [
    ["header"],
    ["hero"],
    ["footer"],
  ]);
});

test("bubble selection omits existing optional slots", () => {
  assert.deepEqual(getAddableActions(bubbleWithSlots, []).map((action) => action.id), []);
});

test("unsupported or missing selection returns no actions", () => {
  assert.deepEqual(getAddableActions(bubbleRoot, null), []);
  assert.deepEqual(getAddableActions(bubbleRoot, ["body", "contents", 0]), []);
  assert.deepEqual(getAddableActions(bubbleRoot, ["missing"]), []);
  assert.deepEqual(getAddableActions(null, []), []);
});

test("addNodeByAction appends contents without mutating input", () => {
  const [textAction] = getAddableActions(bubbleRoot, ["body"]).filter((action) => action.type === "text");
  const next = addNodeByAction(bubbleRoot, textAction);

  assert.notEqual(next, bubbleRoot);
  assert.deepEqual((next as any).body.contents.map((node: any) => node.text), ["Alpha", "New text"]);
  assert.deepEqual(bubbleRoot.body.contents.map((node) => node.text), ["Alpha"]);
});

test("addNodeByAction creates missing contents arrays", () => {
  const root = { type: "bubble", body: { type: "box", layout: "vertical" } };
  const [textAction] = getAddableActions(root, ["body"]).filter((action) => action.type === "text");
  const next = addNodeByAction(root, textAction);

  assert.deepEqual((next as any).body.contents, [{ type: "text", text: "New text" }]);
});

test("addNodeByAction replaces non-array contents", () => {
  const root = { type: "bubble", body: { type: "box", layout: "vertical", contents: "invalid" } };
  const [textAction] = getAddableActions(root, ["body"]).filter((action) => action.type === "text");
  const next = addNodeByAction(root, textAction);

  assert.deepEqual((next as any).body.contents, [{ type: "text", text: "New text" }]);
});

test("addNodeByAction sets missing bubble slot without mutating input", () => {
  const [headerAction] = getAddableActions(bubbleRoot, []).filter((action) => action.id === "add-header");
  const next = addNodeByAction(bubbleRoot, headerAction);

  assert.deepEqual((next as any).header, { type: "box", layout: "vertical", contents: [] });
  assert.equal((bubbleRoot as any).header, undefined);
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
node --import tsx --test client/src/lib/flexAdd.test.ts
```

Expected: FAIL because `getAddableActions` and `addNodeByAction` are not exported yet.

- [ ] **Step 3: Commit the failing test**

```bash
git add client/src/lib/flexAdd.test.ts
git commit -m "test: cover contextual add actions"
```

## Task 2: Implement contextual add helpers

**Files:**
- Modify: `client/src/lib/flexAdd.ts`
- Test: `client/src/lib/flexAdd.test.ts`

- [ ] **Step 1: Replace `flexAdd.ts` with contextual helpers while preserving existing exports**

Update `client/src/lib/flexAdd.ts` to include these exports:

```ts
import { produce } from "immer";
import { getAtPath, type FlexPath } from "./flexPath";

export const BOX_ADDABLE_TYPES = ["box", "text", "image", "button", "separator", "spacer", "icon"] as const;
export const CAROUSEL_ADDABLE_TYPES = ["bubble"] as const;
export const BUBBLE_SLOT_TYPES = ["header", "hero", "body", "footer"] as const;
export const ADDABLE_TYPES = [...BOX_ADDABLE_TYPES, ...CAROUSEL_ADDABLE_TYPES, ...BUBBLE_SLOT_TYPES] as const;

export type BoxAddableType = (typeof BOX_ADDABLE_TYPES)[number];
export type CarouselAddableType = (typeof CAROUSEL_ADDABLE_TYPES)[number];
export type BubbleSlotType = (typeof BUBBLE_SLOT_TYPES)[number];
export type AddableType = BoxAddableType | CarouselAddableType | BubbleSlotType;
export type AddActionKind = "contents-item" | "bubble-slot";

export type AddAction = {
  id: string;
  label: string;
  type: AddableType;
  kind: AddActionKind;
  targetPath: FlexPath;
  selectionPath: FlexPath;
  node: unknown;
};

const PLACEHOLDER_IMAGE_URL =
  "https://scdn.line-apps.com/n/channel_devcenter/img/fx/review_gold_star_28.png";

function isObjectNode(node: unknown): node is Record<string, unknown> {
  return Boolean(node && typeof node === "object" && !Array.isArray(node));
}

export function getAddableTypesForNode(node: unknown): readonly AddableType[] {
  if (!isObjectNode(node)) return [];
  if (node.type === "box") return BOX_ADDABLE_TYPES;
  if (node.type === "carousel") return CAROUSEL_ADDABLE_TYPES;
  return [];
}

export function createDefaultNode(type: AddableType) {
  switch (type) {
    case "bubble":
      return { type: "bubble", body: { type: "box", layout: "vertical", contents: [] } };
    case "box":
      return { type: "box", layout: "vertical", contents: [] };
    case "text":
      return { type: "text", text: "New text" };
    case "image":
      return { type: "image", url: PLACEHOLDER_IMAGE_URL };
    case "button":
      return { type: "button", action: { type: "uri", label: "Open", uri: "https://example.com" } };
    case "separator":
      return { type: "separator" };
    case "spacer":
      return { type: "spacer", size: "md" };
    case "icon":
      return { type: "icon", url: PLACEHOLDER_IMAGE_URL };
    case "header":
    case "body":
    case "footer":
      return { type: "box", layout: "vertical", contents: [] };
    case "hero":
      return createDefaultNode("image");
  }
}

function getContentsLength(node: Record<string, unknown>): number {
  return Array.isArray(node.contents) ? node.contents.length : 0;
}

function toContentsAction(selectedPath: FlexPath, node: Record<string, unknown>, type: BoxAddableType | CarouselAddableType): AddAction {
  const index = getContentsLength(node);
  return {
    id: `add-${type}`,
    label: `${type} 追加`,
    type,
    kind: "contents-item",
    targetPath: [...selectedPath, "contents"],
    selectionPath: [...selectedPath, "contents", index],
    node: createDefaultNode(type),
  };
}

function toBubbleSlotAction(selectedPath: FlexPath, slot: BubbleSlotType): AddAction {
  return {
    id: `add-${slot}`,
    label: `${slot} 追加`,
    type: slot,
    kind: "bubble-slot",
    targetPath: [...selectedPath, slot],
    selectionPath: [...selectedPath, slot],
    node: createDefaultNode(slot),
  };
}

export function getAddableActions(root: unknown, selectedPath: FlexPath | null): readonly AddAction[] {
  if (!selectedPath) return [];

  const selected = getAtPath(root, selectedPath);
  if (!isObjectNode(selected)) return [];

  if (selected.type === "box") {
    return BOX_ADDABLE_TYPES.map((type) => toContentsAction(selectedPath, selected, type));
  }

  if (selected.type === "carousel") {
    return CAROUSEL_ADDABLE_TYPES.map((type) => toContentsAction(selectedPath, selected, type));
  }

  if (selected.type === "bubble") {
    return BUBBLE_SLOT_TYPES
      .filter((slot) => selected[slot] === undefined)
      .map((slot) => toBubbleSlotAction(selectedPath, slot));
  }

  return [];
}

export function addNodeByAction<T>(root: T, action: AddAction): T {
  return produce(root, (draft: any) => {
    if (action.kind === "contents-item") {
      const parent = getAtPath(draft, action.targetPath.slice(0, -1));
      if (!isObjectNode(parent)) return;
      parent.contents = Array.isArray(parent.contents) ? [...parent.contents, action.node] : [action.node];
      return;
    }

    if (action.kind === "bubble-slot") {
      const parent = getAtPath(draft, action.targetPath.slice(0, -1));
      if (!isObjectNode(parent)) return;
      const slot = action.targetPath[action.targetPath.length - 1];
      if (typeof slot !== "string") return;
      if (parent[slot] !== undefined) return;
      parent[slot] = action.node;
    }
  });
}
```

- [ ] **Step 2: Run helper tests**

Run:

```bash
node --import tsx --test client/src/lib/flexAdd.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run existing operation tests that import add-related types indirectly**

Run:

```bash
node --import tsx --test client/src/lib/flexOperations.test.ts client/src/lib/flexPath.test.ts client/src/lib/flexRoot.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit helper implementation**

```bash
git add client/src/lib/flexAdd.ts client/src/lib/flexAdd.test.ts
git commit -m "feat: add contextual flex add actions"
```

## Task 3: Update TreeActionBar to render one contextual add menu

**Files:**
- Modify: `client/src/components/TreeActionBar.tsx`
- Modify: `client/src/components/TreeActionBar.test.tsx`

- [ ] **Step 1: Update tests for the new action bar contract**

Edit `client/src/components/TreeActionBar.test.tsx`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TreeActionBar } from "./TreeActionBar";
import type { AddAction } from "@/lib/flexAdd";

(globalThis as any).React = React;

function noop() {
  return undefined;
}

const addActions: AddAction[] = [
  {
    id: "add-text",
    label: "text 追加",
    type: "text",
    kind: "contents-item",
    targetPath: ["body", "contents"],
    selectionPath: ["body", "contents", 1],
    node: { type: "text", text: "New text" },
  },
  {
    id: "add-image",
    label: "image 追加",
    type: "image",
    kind: "contents-item",
    targetPath: ["body", "contents"],
    selectionPath: ["body", "contents", 1],
    node: { type: "image", url: "https://example.com/image.png" },
  },
];

function renderActionBar(overrides: Partial<React.ComponentProps<typeof TreeActionBar>> = {}) {
  return renderToStaticMarkup(
    <TreeActionBar
      selectedPathLabel="body.contents[0]"
      copiedLabel="body"
      treeOpen={true}
      canWrapRootBubble={true}
      addActions={addActions}
      canDuplicate={true}
      canCopy={true}
      canPaste={true}
      canDelete={true}
      onToggleTree={noop}
      onWrapRootBubble={noop}
      onAddAction={noop}
      onDuplicate={noop}
      onCopy={noop}
      onPaste={noop}
      onDelete={noop}
      {...overrides}
    />,
  );
}

function getOpeningTag(html: string, tagName: string, testId: string): string {
  const escaped = testId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = html.match(new RegExp(`<${tagName}[^>]*data-testid="${escaped}"[^>]*>`));
  assert.ok(match, `missing ${tagName} ${testId}`);
  return match[0];
}

test("renders action buttons and copied indicator", () => {
  const html = renderActionBar();

  assert.match(html, /コピー中:/);
  assert.match(html, /\+ 追加/);
  assert.match(html, /複製/);
  assert.match(html, /コピー/);
  assert.match(html, /ペースト/);
  assert.match(html, /削除/);
  assert.match(html, /data-testid="text-copied-node"/);
});

test("renders contextual add menu candidates", () => {
  const html = renderActionBar();

  assert.match(html, /data-testid="button-add-node"/);
  assert.match(html, /data-testid="menu-add-node"/);
  assert.match(html, /text 追加/);
  assert.match(html, /image 追加/);
});

test("renders disabled add trigger with useful title when no actions are available", () => {
  const html = renderActionBar({
    addActions: [],
    addReason: "この場所には追加できません",
  });
  const addButton = getOpeningTag(html, "button", "button-add-node");

  assert.match(addButton, /\sdisabled=""/);
  assert.match(addButton, /title="この場所には追加できません"/);
});

test("renders disabled unavailable actions with useful title attributes", () => {
  const html = renderActionBar({
    canDelete: false,
    deleteReason: "body は削除できません",
    canPaste: false,
    pasteReason: "この場所には貼り付けできません",
  });

  const deleteButton = getOpeningTag(html, "button", "button-delete-node");
  const pasteButton = getOpeningTag(html, "button", "button-paste-node");

  assert.match(deleteButton, /\sdisabled=""/);
  assert.match(deleteButton, /title="body は削除できません"/);
  assert.match(pasteButton, /\sdisabled=""/);
  assert.match(pasteButton, /title="この場所には貼り付けできません"/);
});

test("root action bar uses wrapping classes without fixed height", () => {
  const html = renderActionBar();
  const root = getOpeningTag(html, "div", "tree-action-bar");

  assert.match(root, /flex-wrap/);
  assert.match(root, /min-h-9/);
  assert.match(root, /shrink-0/);
  assert.doesNotMatch(` ${root} `, / h-9 /);
});

test("root action bar stays above the mobile property panel", () => {
  const html = renderActionBar();
  const root = getOpeningTag(html, "div", "tree-action-bar");

  assert.match(root, /relative/);
  assert.match(root, /z-40/);
});

test("tree toggle exposes expanded state when open", () => {
  const html = renderActionBar({ treeOpen: true });
  const toggleButton = getOpeningTag(html, "button", "button-toggle-tree");

  assert.match(toggleButton, /aria-expanded="true"/);
});

test("tree toggle exposes expanded state when closed", () => {
  const html = renderActionBar({ treeOpen: false });
  const toggleButton = getOpeningTag(html, "button", "button-toggle-tree");

  assert.match(toggleButton, /aria-expanded="false"/);
});
```

- [ ] **Step 2: Run the component test and verify it fails**

Run:

```bash
node --import tsx --test client/src/components/TreeActionBar.test.tsx
```

Expected: FAIL because `TreeActionBar` still expects `canAddChild`, `addableTypes`, and `onAddChild`.

- [ ] **Step 3: Update TreeActionBar props and markup**

Edit `client/src/components/TreeActionBar.tsx`:

```tsx
import { ChevronDown, ChevronUp, ClipboardPaste, Copy, Files, Layers3, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AddAction } from "@/lib/flexAdd";

type TreeActionBarProps = {
  selectedPathLabel?: string;
  copiedLabel?: string;
  treeOpen: boolean;
  canWrapRootBubble: boolean;
  addActions: readonly AddAction[];
  addReason?: string;
  canDuplicate: boolean;
  duplicateReason?: string;
  canCopy: boolean;
  copyReason?: string;
  canPaste: boolean;
  pasteReason?: string;
  canDelete: boolean;
  deleteReason?: string;
  onToggleTree: () => void;
  onWrapRootBubble: () => void;
  onAddAction: (action: AddAction) => void;
  onDuplicate: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onDelete: () => void;
};

function unavailableTitle(canUse: boolean, reason?: string) {
  return canUse ? undefined : reason;
}

export function TreeActionBar({
  selectedPathLabel,
  copiedLabel,
  treeOpen,
  canWrapRootBubble,
  addActions,
  addReason,
  canDuplicate,
  duplicateReason,
  canCopy,
  copyReason,
  canPaste,
  pasteReason,
  canDelete,
  deleteReason,
  onToggleTree,
  onWrapRootBubble,
  onAddAction,
  onDuplicate,
  onCopy,
  onPaste,
  onDelete,
}: TreeActionBarProps) {
  const ToggleIcon = treeOpen ? ChevronDown : ChevronUp;
  const canAdd = addActions.length > 0;

  return (
    <div
      className="relative z-40 flex min-h-9 shrink-0 flex-wrap items-center gap-2 border-b px-3 py-2"
      data-testid="tree-action-bar"
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="min-w-0 shrink"
        aria-expanded={treeOpen}
        onClick={onToggleTree}
        data-testid="button-toggle-tree"
      >
        <ToggleIcon className="h-4 w-4" />
        <span>ツリービュー</span>
        {selectedPathLabel && (
          <span
            className="max-w-[14rem] truncate font-mono text-[11px] text-muted-foreground"
            data-testid="text-selected-path"
          >
            {selectedPathLabel}
          </span>
        )}
      </Button>

      {copiedLabel && (
        <span
          className="min-w-0 max-w-full shrink truncate rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground"
          data-testid="text-copied-node"
        >
          コピー中: {copiedLabel}
        </span>
      )}

      {canWrapRootBubble && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onWrapRootBubble}
          data-testid="button-convert-carousel"
        >
          <Layers3 className="h-4 w-4" />
          Carousel 追加
        </Button>
      )}

      {canAdd ? (
        <details className="relative inline-flex">
          <Button asChild variant="outline" size="sm">
            <summary className="cursor-pointer list-none" data-testid="button-add-node">
              <Plus className="h-4 w-4" />
              + 追加
            </summary>
          </Button>
          <div
            className="absolute left-0 top-full z-50 mt-1 min-w-40 rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
            data-testid="menu-add-node"
          >
            {addActions.map((action) => (
              <button
                key={action.id}
                type="button"
                className="flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                onClick={() => onAddAction(action)}
                data-testid={`menu-item-${action.id}`}
              >
                {action.label}
              </button>
            ))}
          </div>
        </details>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled
          title={addReason}
          data-testid="button-add-node"
        >
          <Plus className="h-4 w-4" />
          + 追加
        </Button>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!canDuplicate}
        title={unavailableTitle(canDuplicate, duplicateReason)}
        onClick={onDuplicate}
        data-testid="button-duplicate-node"
      >
        <Files className="h-4 w-4" />
        複製
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!canCopy}
        title={unavailableTitle(canCopy, copyReason)}
        onClick={onCopy}
        data-testid="button-copy-node"
      >
        <Copy className="h-4 w-4" />
        コピー
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!canPaste}
        title={unavailableTitle(canPaste, pasteReason)}
        onClick={onPaste}
        data-testid="button-paste-node"
      >
        <ClipboardPaste className="h-4 w-4" />
        ペースト
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!canDelete}
        title={unavailableTitle(canDelete, deleteReason)}
        onClick={onDelete}
        data-testid="button-delete-node"
      >
        <Trash2 className="h-4 w-4" />
        削除
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: Run component test**

Run:

```bash
node --import tsx --test client/src/components/TreeActionBar.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit action bar changes**

```bash
git add client/src/components/TreeActionBar.tsx client/src/components/TreeActionBar.test.tsx
git commit -m "feat: consolidate tree add actions into menu"
```

## Task 4: Wire contextual add actions into Studio

**Files:**
- Modify: `client/src/pages/Studio.tsx`
- Test: existing helper and component tests

- [ ] **Step 1: Update Studio imports**

In `client/src/pages/Studio.tsx`, replace:

```ts
import { createDefaultNode, getAddableTypesForNode, type AddableType } from "@/lib/flexAdd";
```

with:

```ts
import { addNodeByAction, getAddableActions, type AddAction } from "@/lib/flexAdd";
```

- [ ] **Step 2: Replace `addableTypes` and `canAddChild` derivation**

Replace:

```ts
const addableTypes = useMemo((): readonly AddableType[] => {
  if (!selectedPath || !parsed.ok) return [];
  const selected = getAtPath(parsed.value, selectedPath) as any;
  return getAddableTypesForNode(selected);
}, [selectedPath, parsed]);
const canAddChild = addableTypes.length > 0;
```

with:

```ts
const addActions = useMemo(
  () => (parsed.ok ? getAddableActions(parsed.value, selectedPath) : []),
  [parsed, selectedPath],
);
const addReason = selectedPath ? "この場所には追加できません" : "追加先を選択してください";
```

- [ ] **Step 3: Replace `addChild` callback**

Replace:

```ts
const addChild = useCallback((newType: AddableType) => {
  if (!selectedPath || !parsed.ok) return;
  const selected = getAtPath(parsed.value, selectedPath) as any;
  if (!selected || typeof selected !== "object") return;
  if (!getAddableTypesForNode(selected).includes(newType)) return;
  const contents = Array.isArray(selected.contents) ? selected.contents : [];
  const next = setAtPath(parsed.value, [...selectedPath, "contents"], [...contents, createDefaultNode(newType)]);
  setJsonText(JSON.stringify(next, null, 2));
  setSelectedPath([...selectedPath, "contents", contents.length]);
}, [selectedPath, parsed]);
```

with:

```ts
const addByAction = useCallback((action: AddAction) => {
  if (!parsed.ok) return;
  const available = getAddableActions(parsed.value, selectedPath);
  if (!available.some((candidate) => candidate.id === action.id)) return;
  const next = addNodeByAction(parsed.value, action);
  if (next === parsed.value) return;
  setJsonText(JSON.stringify(next, null, 2));
  setSelectedPath(action.selectionPath);
}, [parsed, selectedPath]);
```

- [ ] **Step 4: Update TreeActionBar props**

Replace:

```tsx
canAddChild={canAddChild}
addableTypes={addableTypes}
onAddChild={addChild}
```

with:

```tsx
addActions={addActions}
addReason={addReason}
onAddAction={addByAction}
```

- [ ] **Step 5: Remove now-unused imports**

In `client/src/pages/Studio.tsx`, remove `setAtPath` from the `@/lib/flexPath` import only if no other code in `Studio` uses it after the replacement. Keep `getAtPath` because selection and property panel still use it.

- [ ] **Step 6: Run focused tests**

Run:

```bash
node --import tsx --test client/src/lib/flexAdd.test.ts client/src/components/TreeActionBar.test.tsx client/src/lib/flexOperations.test.ts client/src/lib/flexPath.test.ts client/src/lib/flexRoot.test.ts client/src/components/FlexTreeView.test.tsx client/src/lib/treeLayout.test.ts
```

Expected: PASS.

- [ ] **Step 7: Run TypeScript check**

Run:

```bash
node_modules/.bin/tsc
```

Expected: PASS.

- [ ] **Step 8: Commit Studio wiring**

```bash
git add client/src/pages/Studio.tsx
git commit -m "feat: wire contextual add menu into studio"
```

## Task 5: Browser smoke test and final verification

**Files:**
- Modify: none unless browser smoke finds a defect.

- [ ] **Step 1: Start the dev server**

Run:

```bash
NODE_ENV=development node_modules/.bin/tsx server/index.ts
```

Expected: Vite/server prints a localhost URL. If port `5002` is busy, use the port printed by the server.

- [ ] **Step 2: Browser smoke for box add**

Open the app in the in-app browser.

Manual checks:

- Select a `box` node such as `body`.
- Confirm action bar shows one `+ 追加` trigger instead of many direct add buttons.
- Open the menu and choose `text 追加`.
- Confirm JSON gains a new text node under `body.contents`.
- Confirm the new text node is selected in the tree/property panel.

- [ ] **Step 3: Browser smoke for carousel add**

Manual checks:

- Select a `carousel` root or convert root bubble with `Carousel 追加` first.
- Open `+ 追加`.
- Confirm only `bubble 追加` is shown for the carousel context.
- Add a bubble.
- Confirm JSON gains a new bubble under `contents`.
- Confirm the added bubble is selected.

- [ ] **Step 4: Browser smoke for bubble slot add**

Manual checks:

- Select a bubble that is missing `header` or `footer`.
- Open `+ 追加`.
- Confirm only missing slots are listed.
- Add `header` or `footer`.
- Confirm the slot appears in JSON and the added slot is selected.
- Select the same bubble again and confirm the added slot no longer appears as a candidate.

- [ ] **Step 5: Run full local verification**

Run:

```bash
node --import tsx --test client/src/lib/flexAdd.test.ts client/src/lib/flexOperations.test.ts client/src/components/TreeActionBar.test.tsx client/src/lib/treeLayout.test.ts client/src/lib/flexPath.test.ts client/src/lib/flexRoot.test.ts client/src/components/FlexTreeView.test.tsx
node_modules/.bin/tsc
node --import tsx/esm script/build.ts
```

Expected:

- Tests PASS.
- `tsc` PASS.
- Build PASS. If build fails with the known Rollup optional native package code-signature problem in this local environment, record the exact error and verify with `tsc` plus focused tests.

- [ ] **Step 6: Commit verification-only fixes if needed**

If smoke testing reveals a defect, fix only that defect and commit:

```bash
git add <changed-files>
git commit -m "fix: polish contextual add menu"
```

If no code changed, do not create a commit.

## Self-Review Notes

- Spec coverage: helper actions, compact `+ 追加` menu, box/carousel/bubble slot scope, selection after add, existing operation preservation, and testing are all covered.
- Placeholder scan: no open-ended implementation placeholders are intentionally left in the plan.
- Type consistency: `AddAction`, `AddActionKind`, `AddableType`, `getAddableActions`, and `addNodeByAction` are defined before use in component and Studio tasks.
