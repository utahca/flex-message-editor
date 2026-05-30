# Tree Safe Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add safe tree actions for deleting, duplicating, copying, and pasting Flex Message nodes while preserving valid JSON structure.

**Architecture:** Put Flex Message structure rules in a new pure helper module, `client/src/lib/flexOperations.ts`, and keep `Studio.tsx` focused on state orchestration. Add a `TreeActionBar` component for the responsive, wrapping action UI above the tree.

**Tech Stack:** React 19, TypeScript, Node built-in test runner, `tsx`, existing shadcn-style `Button`, lucide-react icons, Tailwind CSS.

---

## 日本語サマリ

Issue #6 と #12 をまとめて実装する計画です。まず `flexOperations.ts` に「削除できるか」「複製できるか」「貼り付けできるか」などの判定と JSON 更新処理を切り出し、TDD で安全ルールを固めます。その後、ツリービュー上部にレスポンシブなアクションバーを追加し、`削除 / 複製 / コピー / ペースト / コピー中表示 / Carousel 追加` を統合します。

アクションバーは固定高さにせず、操作が増えたり画面幅が狭くなったりした場合に折り返して縦に広がる仕様にします。`carousel.contents` の最後の bubble と `bubble.body` は削除不可です。

## File Structure

- Create `client/src/lib/flexOperations.ts`
  - Flex Message aware operation rules and immutable JSON updates.
- Create `client/src/lib/flexOperations.test.ts`
  - Unit tests for delete, duplicate, copy, paste, and carousel-add availability.
- Create `client/src/components/TreeActionBar.tsx`
  - Responsive tree action bar UI.
- Create `client/src/components/TreeActionBar.test.tsx`
  - Static render tests for enabled, disabled, copied indicator, and wrapping-friendly class names.
- Modify `client/src/pages/Studio.tsx`
  - Wire operation state, copied node state, and callbacks into `TreeActionBar`.
- Modify `client/src/components/FlexTreeView.tsx`
  - Reuse `summarizeFlexNode` so copied-node labels and tree summaries stay consistent.

## Commands

Use the local project runtime:

```bash
PATH="$PWD/.local/bin:$PATH" node --import tsx --test client/src/lib/flexOperations.test.ts
PATH="$PWD/.local/bin:$PATH" node --import tsx --test client/src/components/TreeActionBar.test.tsx
PATH="$PWD/.local/bin:$PATH" node --import tsx --test client/src/lib/flexOperations.test.ts client/src/components/TreeActionBar.test.tsx client/src/lib/flexPath.test.ts client/src/lib/flexRoot.test.ts client/src/components/FlexTreeView.test.tsx
PATH="$PWD/.local/bin:$PATH" npm_config_cache="$PWD/.local/npm-cache" .local/bin/npm run check
PATH="$PWD/.local/bin:$PATH" node --import tsx/esm script/build.ts
```

Use `node --import tsx/esm script/build.ts` for local build verification when the `tsx` CLI hits sandbox IPC restrictions.

---

### Task 1: Delete Operation Rules

**Files:**
- Create: `client/src/lib/flexOperations.ts`
- Create: `client/src/lib/flexOperations.test.ts`
- Uses: `client/src/lib/flexPath.ts`

- [ ] **Step 1: Write the failing delete tests**

Create `client/src/lib/flexOperations.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import {
  canDeleteNode,
  deleteNodeAtPath,
  getSelectionAfterDelete,
} from "./flexOperations";

const bubbleRoot = {
  type: "bubble",
  header: { type: "box", layout: "vertical", contents: [{ type: "text", text: "Header" }] },
  hero: { type: "image", url: "https://example.com/hero.png" },
  body: {
    type: "box",
    layout: "vertical",
    contents: [
      { type: "text", text: "Alpha" },
      { type: "text", text: "Beta" },
    ],
  },
  footer: { type: "box", layout: "vertical", contents: [] },
};

test("canDeleteNode disallows root and bubble body", () => {
  assert.equal(canDeleteNode(bubbleRoot, []), false);
  assert.equal(canDeleteNode(bubbleRoot, ["body"]), false);
});

test("canDeleteNode allows optional bubble slots and box contents items", () => {
  assert.equal(canDeleteNode(bubbleRoot, ["header"]), true);
  assert.equal(canDeleteNode(bubbleRoot, ["hero"]), true);
  assert.equal(canDeleteNode(bubbleRoot, ["footer"]), true);
  assert.equal(canDeleteNode(bubbleRoot, ["body", "contents", 0]), true);
});

test("canDeleteNode disallows the last carousel bubble", () => {
  assert.equal(
    canDeleteNode({ type: "carousel", contents: [{ type: "bubble", body: { type: "box", layout: "vertical", contents: [] } }] }, ["contents", 0]),
    false,
  );
  assert.equal(
    canDeleteNode({ type: "carousel", contents: [{ type: "bubble" }, { type: "bubble" }] }, ["contents", 0]),
    true,
  );
});

test("deleteNodeAtPath removes array items without mutating input", () => {
  const next = deleteNodeAtPath(bubbleRoot, ["body", "contents", 0]);

  assert.deepEqual((next as any).body.contents.map((node: any) => node.text), ["Beta"]);
  assert.deepEqual(bubbleRoot.body.contents.map((node) => node.text), ["Alpha", "Beta"]);
});

test("deleteNodeAtPath removes optional slots", () => {
  const next = deleteNodeAtPath(bubbleRoot, ["hero"]);

  assert.equal((next as any).hero, undefined);
  assert.ok((bubbleRoot as any).hero);
});

test("getSelectionAfterDelete selects nearest sibling or parent", () => {
  assert.deepEqual(getSelectionAfterDelete(bubbleRoot, ["body", "contents", 0]), ["body", "contents", 0]);
  assert.deepEqual(getSelectionAfterDelete(bubbleRoot, ["body", "contents", 1]), ["body", "contents", 0]);
  assert.deepEqual(
    getSelectionAfterDelete({ type: "bubble", body: { type: "box", layout: "vertical", contents: [{ type: "text", text: "Only" }] } }, ["body", "contents", 0]),
    ["body"],
  );
  assert.deepEqual(getSelectionAfterDelete(bubbleRoot, ["hero"]), []);
});
```

- [ ] **Step 2: Run the delete tests to verify they fail**

Run:

```bash
PATH="$PWD/.local/bin:$PATH" node --import tsx --test client/src/lib/flexOperations.test.ts
```

Expected: FAIL with module resolution or missing export errors for `./flexOperations`.

- [ ] **Step 3: Implement minimal delete helpers**

Create `client/src/lib/flexOperations.ts`:

```ts
import { deleteAtPath, getAtPath, type FlexPath } from "./flexPath";

const BUBBLE_OPTIONAL_SLOTS = new Set(["header", "hero", "footer"]);

function pathEq(a: FlexPath, b: FlexPath): boolean {
  return a.length === b.length && a.every((step, index) => step === b[index]);
}

function isObjectNode(node: unknown): node is Record<string, unknown> {
  return Boolean(node && typeof node === "object" && !Array.isArray(node));
}

function getParent(root: unknown, path: FlexPath): unknown {
  if (path.length === 0) return undefined;
  return getAtPath(root, path.slice(0, -1));
}

function getIndex(path: FlexPath): number | undefined {
  const last = path[path.length - 1];
  return typeof last === "number" ? last : undefined;
}

export function canDeleteNode(root: unknown, path: FlexPath | null): boolean {
  if (!path || path.length === 0) return false;

  const node = getAtPath(root, path);
  if (!isObjectNode(node)) return false;

  if (path.length === 1 && BUBBLE_OPTIONAL_SLOTS.has(String(path[0]))) {
    return isObjectNode(root) && root.type === "bubble";
  }

  if (pathEq(path, ["body"])) return false;

  const parent = getParent(root, path);
  const index = getIndex(path);
  if (!Array.isArray(parent) || index === undefined) return false;

  const grandParent = getAtPath(root, path.slice(0, -2));
  if (!isObjectNode(grandParent)) return false;

  if (grandParent.type === "box" && path[path.length - 2] === "contents") return true;
  if (grandParent.type === "carousel" && path[path.length - 2] === "contents") {
    return parent.length > 1;
  }

  return false;
}

export function deleteNodeAtPath<T>(root: T, path: FlexPath): T {
  if (!canDeleteNode(root, path)) return root;
  return deleteAtPath(root, path);
}

export function getSelectionAfterDelete(root: unknown, deletedPath: FlexPath): FlexPath | null {
  if (deletedPath.length === 0) return null;

  const parentPath = deletedPath.slice(0, -1);
  const parent = getAtPath(root, parentPath);
  const index = getIndex(deletedPath);

  if (Array.isArray(parent) && index !== undefined) {
    if (parent.length > 1) {
      return [...parentPath, Math.min(index, parent.length - 2)];
    }
    return parentPath.slice(0, -1);
  }

  return parentPath;
}
```

- [ ] **Step 4: Run delete tests to verify they pass**

Run:

```bash
PATH="$PWD/.local/bin:$PATH" node --import tsx --test client/src/lib/flexOperations.test.ts
```

Expected: PASS for the delete tests.

- [ ] **Step 5: Commit Task 1**

```bash
git add client/src/lib/flexOperations.ts client/src/lib/flexOperations.test.ts
git commit -m "feat: add safe tree delete operations"
```

---

### Task 2: Duplicate, Copy, Paste, And Carousel Availability

**Files:**
- Modify: `client/src/lib/flexOperations.ts`
- Modify: `client/src/lib/flexOperations.test.ts`
- Uses: `client/src/lib/flexAdd.ts`

- [ ] **Step 1: Append failing tests for duplicate, copy, paste, and carousel-add availability**

Append to `client/src/lib/flexOperations.test.ts`:

```ts
import {
  canCopyNode,
  canDuplicateNode,
  canPasteNode,
  canWrapRootBubbleFromSelection,
  duplicateNodeAtPath,
  pasteNodeAtPath,
} from "./flexOperations";

test("duplicateNodeAtPath inserts a deep copy immediately after an array item", () => {
  const next = duplicateNodeAtPath(bubbleRoot, ["body", "contents", 0]);

  assert.deepEqual((next as any).body.contents.map((node: any) => node.text), ["Alpha", "Alpha", "Beta"]);
  assert.notEqual((next as any).body.contents[0], (next as any).body.contents[1]);
});

test("canDuplicateNode only allows array items under supported parents", () => {
  assert.equal(canDuplicateNode(bubbleRoot, ["body", "contents", 0]), true);
  assert.equal(canDuplicateNode(bubbleRoot, ["hero"]), false);
  assert.equal(canDuplicateNode(bubbleRoot, []), false);
});

test("canCopyNode allows non-root object nodes", () => {
  assert.equal(canCopyNode(bubbleRoot, ["body", "contents", 0]), true);
  assert.equal(canCopyNode(bubbleRoot, ["hero"]), true);
  assert.equal(canCopyNode(bubbleRoot, []), false);
  assert.equal(canCopyNode(bubbleRoot, ["missing"]), false);
});

test("pasteNodeAtPath appends supported nodes into selected box", () => {
  const next = pasteNodeAtPath(bubbleRoot, ["body"], { type: "text", text: "Gamma" });

  assert.deepEqual((next as any).body.contents.map((node: any) => node.text), ["Alpha", "Beta", "Gamma"]);
});

test("pasteNodeAtPath inserts after selected array item", () => {
  const next = pasteNodeAtPath(bubbleRoot, ["body", "contents", 0], { type: "text", text: "Inserted" });

  assert.deepEqual((next as any).body.contents.map((node: any) => node.text), ["Alpha", "Inserted", "Beta"]);
});

test("canPasteNode allows only bubbles into carousel", () => {
  const carousel = { type: "carousel", contents: [{ type: "bubble" }] };

  assert.equal(canPasteNode(carousel, [], { type: "bubble" }), true);
  assert.equal(canPasteNode(carousel, [], { type: "text", text: "Nope" }), false);
  assert.equal(canPasteNode(carousel, ["contents", 0], { type: "bubble" }), true);
});

test("canPasteNode rejects unsupported box child types", () => {
  assert.equal(canPasteNode(bubbleRoot, ["body"], { type: "bubble" }), false);
  assert.equal(canPasteNode(bubbleRoot, ["body"], null), false);
});

test("canWrapRootBubbleFromSelection only allows selected root bubble", () => {
  assert.equal(canWrapRootBubbleFromSelection({ type: "bubble" }, []), true);
  assert.equal(canWrapRootBubbleFromSelection({ type: "bubble" }, ["body"]), false);
  assert.equal(canWrapRootBubbleFromSelection({ type: "carousel", contents: [] }, []), false);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
PATH="$PWD/.local/bin:$PATH" node --import tsx --test client/src/lib/flexOperations.test.ts
```

Expected: FAIL with missing exports for duplicate, copy, paste, and carousel helpers.

- [ ] **Step 3: Extend `flexOperations.ts`**

Add imports:

```ts
import { produce } from "immer";
import { getAddableTypesForNode, type AddableType } from "./flexAdd";
import { canWrapBubbleInCarousel } from "./flexRoot";
```

Add these helpers and exports below the delete helpers:

```ts
function cloneNode<T>(node: T): T {
  return typeof structuredClone === "function"
    ? structuredClone(node)
    : JSON.parse(JSON.stringify(node));
}

function getNodeType(node: unknown): string | undefined {
  return isObjectNode(node) ? (node.type as string | undefined) : undefined;
}

function getArrayParentContext(root: unknown, path: FlexPath) {
  const parentPath = path.slice(0, -1);
  const parent = getAtPath(root, parentPath);
  const containerPath = parentPath.slice(0, -1);
  const container = getAtPath(root, containerPath);
  const key = parentPath[parentPath.length - 1];
  const index = getIndex(path);

  if (!Array.isArray(parent) || index === undefined || !isObjectNode(container)) return null;
  if (key !== "contents") return null;
  return { parentPath, parent, containerPath, container, index };
}

function isAddableToContainer(container: unknown, node: unknown): boolean {
  const type = getNodeType(node) as AddableType | undefined;
  if (!type) return false;
  return getAddableTypesForNode(container).includes(type);
}

export function canDuplicateNode(root: unknown, path: FlexPath | null): boolean {
  if (!path || path.length === 0) return false;
  const node = getAtPath(root, path);
  if (!isObjectNode(node)) return false;
  const context = getArrayParentContext(root, path);
  if (!context) return false;
  return isAddableToContainer(context.container, node);
}

export function duplicateNodeAtPath<T>(root: T, path: FlexPath): T {
  if (!canDuplicateNode(root, path)) return root;
  return produce(root, (draft: any) => {
    const context = getArrayParentContext(draft, path);
    if (!context) return;
    context.parent.splice(context.index + 1, 0, cloneNode(context.parent[context.index]));
  });
}

export function getSelectionAfterDuplicate(path: FlexPath): FlexPath {
  const index = getIndex(path);
  if (index === undefined) return path;
  return [...path.slice(0, -1), index + 1];
}

export function canCopyNode(root: unknown, path: FlexPath | null): boolean {
  if (!path || path.length === 0) return false;
  return isObjectNode(getAtPath(root, path));
}

export function getCopiedNode(root: unknown, path: FlexPath | null): unknown {
  if (!canCopyNode(root, path)) return null;
  return cloneNode(getAtPath(root, path));
}

function getPasteTarget(root: unknown, selectedPath: FlexPath | null, copiedNode: unknown) {
  if (!selectedPath || !isObjectNode(copiedNode)) return null;

  const selected = getAtPath(root, selectedPath);
  if (isObjectNode(selected) && isAddableToContainer(selected, copiedNode)) {
    return { mode: "append" as const, contentsPath: [...selectedPath, "contents"] };
  }

  const context = getArrayParentContext(root, selectedPath);
  if (!context || !isAddableToContainer(context.container, copiedNode)) return null;
  return { mode: "insertAfter" as const, parentPath: context.parentPath, index: context.index };
}

export function canPasteNode(root: unknown, selectedPath: FlexPath | null, copiedNode: unknown): boolean {
  return Boolean(getPasteTarget(root, selectedPath, copiedNode));
}

export function pasteNodeAtPath<T>(root: T, selectedPath: FlexPath, copiedNode: unknown): T {
  const target = getPasteTarget(root, selectedPath, copiedNode);
  if (!target) return root;
  return produce(root, (draft: any) => {
    if (target.mode === "append") {
      const contents = getAtPath(draft, target.contentsPath);
      if (Array.isArray(contents)) contents.push(cloneNode(copiedNode));
      return;
    }
    const parent = getAtPath(draft, target.parentPath);
    if (Array.isArray(parent)) parent.splice(target.index + 1, 0, cloneNode(copiedNode));
  });
}

export function getSelectionAfterPaste(root: unknown, selectedPath: FlexPath, copiedNode: unknown): FlexPath {
  const target = getPasteTarget(root, selectedPath, copiedNode);
  if (!target) return selectedPath;
  if (target.mode === "append") {
    const contents = getAtPath(root, target.contentsPath);
    const index = Array.isArray(contents) ? contents.length : 0;
    return [...target.contentsPath, index];
  }
  return [...target.parentPath, target.index + 1];
}

export function canWrapRootBubbleFromSelection(root: unknown, selectedPath: FlexPath | null): boolean {
  return Boolean(selectedPath && selectedPath.length === 0 && canWrapBubbleInCarousel(root));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
PATH="$PWD/.local/bin:$PATH" node --import tsx --test client/src/lib/flexOperations.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Task 2**

```bash
git add client/src/lib/flexOperations.ts client/src/lib/flexOperations.test.ts
git commit -m "feat: add tree copy paste and duplicate operations"
```

---

### Task 3: Operation State And Node Summary

**Files:**
- Modify: `client/src/lib/flexOperations.ts`
- Modify: `client/src/lib/flexOperations.test.ts`
- Modify: `client/src/components/FlexTreeView.tsx`

- [ ] **Step 1: Add failing operation state and summary tests**

Append to `client/src/lib/flexOperations.test.ts`:

```ts
import { getNodeOperationState, summarizeFlexNode } from "./flexOperations";

test("summarizeFlexNode returns compact copied-node labels", () => {
  assert.equal(summarizeFlexNode({ type: "text", text: "Hello world" }), 'text "Hello world"');
  assert.equal(summarizeFlexNode({ type: "button", action: { type: "uri", label: "Open", uri: "https://example.com" } }), 'button "Open"');
  assert.equal(summarizeFlexNode({ type: "box", layout: "vertical", contents: [] }), "box layout: vertical");
  assert.equal(summarizeFlexNode({ type: "bubble" }), "bubble");
});

test("getNodeOperationState reports action availability and copied label", () => {
  const state = getNodeOperationState(bubbleRoot, ["body", "contents", 0], { type: "text", text: "Copied" });

  assert.equal(state.canDelete, true);
  assert.equal(state.canDuplicate, true);
  assert.equal(state.canCopy, true);
  assert.equal(state.canPaste, true);
  assert.equal(state.canWrapRootBubble, false);
  assert.equal(state.copiedLabel, 'text "Copied"');
});

test("getNodeOperationState includes disabled reasons", () => {
  const state = getNodeOperationState(bubbleRoot, ["body"], { type: "bubble" });

  assert.equal(state.canDelete, false);
  assert.equal(state.deleteReason, "body は削除できません");
  assert.equal(state.canPaste, false);
  assert.equal(state.pasteReason, "この場所には貼り付けできません");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
PATH="$PWD/.local/bin:$PATH" node --import tsx --test client/src/lib/flexOperations.test.ts
```

Expected: FAIL with missing exports for `getNodeOperationState` and `summarizeFlexNode`.

- [ ] **Step 3: Add operation state helpers**

Append to `client/src/lib/flexOperations.ts`:

```ts
export type NodeOperationState = {
  canDelete: boolean;
  deleteReason?: string;
  canDuplicate: boolean;
  duplicateReason?: string;
  canCopy: boolean;
  copyReason?: string;
  canPaste: boolean;
  pasteReason?: string;
  canWrapRootBubble: boolean;
  copiedLabel?: string;
};

export function summarizeFlexNode(node: unknown): string {
  if (!isObjectNode(node)) return "unknown";
  const type = (node.type as string | undefined) ?? "unknown";
  if (type === "text") return `text "${String(node.text ?? "")}"`;
  if (type === "button") {
    const action = isObjectNode(node.action) ? node.action : null;
    return action?.label ? `button "${String(action.label)}"` : "button";
  }
  if (type === "box") return node.layout ? `box layout: ${String(node.layout)}` : "box";
  return type;
}

function getDeleteReason(root: unknown, path: FlexPath | null): string | undefined {
  if (!path || path.length === 0) return "root は削除できません";
  if (pathEq(path, ["body"])) return "body は削除できません";
  const context = getArrayParentContext(root, path);
  if (context?.container.type === "carousel" && context.parent.length <= 1) {
    return "最後の bubble は削除できません";
  }
  return "削除できません";
}

export function getNodeOperationState(
  root: unknown,
  selectedPath: FlexPath | null,
  copiedNode: unknown,
): NodeOperationState {
  const canDelete = canDeleteNode(root, selectedPath);
  const canDuplicate = canDuplicateNode(root, selectedPath);
  const canCopy = canCopyNode(root, selectedPath);
  const canPaste = canPasteNode(root, selectedPath, copiedNode);
  const canWrapRootBubble = canWrapRootBubbleFromSelection(root, selectedPath);

  return {
    canDelete,
    deleteReason: canDelete ? undefined : getDeleteReason(root, selectedPath),
    canDuplicate,
    duplicateReason: canDuplicate ? undefined : "複製できません",
    canCopy,
    copyReason: canCopy ? undefined : "コピーできません",
    canPaste,
    pasteReason: canPaste ? undefined : "この場所には貼り付けできません",
    canWrapRootBubble,
    copiedLabel: isObjectNode(copiedNode) ? summarizeFlexNode(copiedNode) : undefined,
  };
}
```

- [ ] **Step 4: Replace duplicate summary logic in `FlexTreeView.tsx`**

In `client/src/components/FlexTreeView.tsx`, import the helper:

```ts
import { summarizeFlexNode } from "@/lib/flexOperations";
```

Replace the local `summarize` function with:

```ts
function summarize(node: Node): string {
  const label = summarizeFlexNode(node);
  const typeName = node?.type ?? "unknown";
  return label === typeName ? "" : label.replace(`${typeName} `, "");
}
```

- [ ] **Step 5: Run focused tests**

Run:

```bash
PATH="$PWD/.local/bin:$PATH" node --import tsx --test client/src/lib/flexOperations.test.ts client/src/components/FlexTreeView.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit Task 3**

```bash
git add client/src/lib/flexOperations.ts client/src/lib/flexOperations.test.ts client/src/components/FlexTreeView.tsx
git commit -m "feat: expose tree operation state"
```

---

### Task 4: Responsive Tree Action Bar

**Files:**
- Create: `client/src/components/TreeActionBar.tsx`
- Create: `client/src/components/TreeActionBar.test.tsx`

- [ ] **Step 1: Write the failing render tests**

Create `client/src/components/TreeActionBar.test.tsx`:

```tsx
import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TreeActionBar } from "./TreeActionBar";

(globalThis as any).React = React;

function renderBar(overrides: Partial<React.ComponentProps<typeof TreeActionBar>> = {}) {
  return renderToStaticMarkup(
    <TreeActionBar
      selectedPathLabel="body.contents[0]"
      copiedLabel="text &quot;Copied&quot;"
      canWrapRootBubble={false}
      canAddChild={true}
      addableTypes={["text", "box"]}
      canDuplicate={true}
      canCopy={true}
      canPaste={true}
      canDelete={true}
      onWrapRootBubble={() => undefined}
      onAddChild={() => undefined}
      onDuplicate={() => undefined}
      onCopy={() => undefined}
      onPaste={() => undefined}
      onDelete={() => undefined}
      onToggleTree={() => undefined}
      treeOpen={true}
      {...overrides}
    />,
  );
}

test("TreeActionBar renders action buttons and copied indicator", () => {
  const html = renderBar();

  assert.match(html, /コピー中:/);
  assert.match(html, /複製/);
  assert.match(html, /コピー/);
  assert.match(html, /ペースト/);
  assert.match(html, /削除/);
});

test("TreeActionBar disables unavailable actions with titles", () => {
  const html = renderBar({
    canDelete: false,
    deleteReason: "body は削除できません",
    canPaste: false,
    pasteReason: "この場所には貼り付けできません",
  });

  assert.match(html, /title="body は削除できません"/);
  assert.match(html, /title="この場所には貼り付けできません"/);
  assert.match(html, /disabled=""/);
});

test("TreeActionBar uses wrapping classes instead of fixed height", () => {
  const html = renderBar();

  assert.match(html, /flex-wrap/);
  assert.doesNotMatch(html, / h-9 /);
});
```

- [ ] **Step 2: Run render tests to verify they fail**

Run:

```bash
PATH="$PWD/.local/bin:$PATH" node --import tsx --test client/src/components/TreeActionBar.test.tsx
```

Expected: FAIL with missing module error for `./TreeActionBar`.

- [ ] **Step 3: Implement `TreeActionBar.tsx`**

Create `client/src/components/TreeActionBar.tsx`:

```tsx
import { ChevronDown, ChevronUp, Copy, Files, Layers3, Plus, ClipboardPaste, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AddableType } from "@/lib/flexAdd";

type Props = {
  selectedPathLabel?: string;
  copiedLabel?: string;
  treeOpen: boolean;
  canWrapRootBubble: boolean;
  canAddChild: boolean;
  addableTypes: readonly AddableType[];
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
  onAddChild: (type: AddableType) => void;
  onDuplicate: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onDelete: () => void;
};

export function TreeActionBar({
  selectedPathLabel,
  copiedLabel,
  treeOpen,
  canWrapRootBubble,
  canAddChild,
  addableTypes,
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
  onAddChild,
  onDuplicate,
  onCopy,
  onPaste,
  onDelete,
}: Props) {
  return (
    <div className="flex min-h-9 shrink-0 flex-wrap items-center gap-2 border-b border-border bg-muted/40 px-3 py-1.5">
      <button
        type="button"
        onClick={onToggleTree}
        className="flex min-w-[160px] flex-1 items-center justify-between gap-2 hover-elevate"
        data-testid="button-toggle-tree"
        aria-expanded={treeOpen}
      >
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          ツリービュー
        </span>
        <span className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          {selectedPathLabel && (
            <span className="hidden truncate font-mono text-[10px] sm:inline" data-testid="text-selected-path">
              {selectedPathLabel}
            </span>
          )}
          {treeOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
        </span>
      </button>

      {copiedLabel && (
        <span className="max-w-full truncate rounded bg-background px-2 py-1 text-[10px] text-muted-foreground" data-testid="text-copied-node">
          コピー中: {copiedLabel}
        </span>
      )}

      <div className="flex min-w-0 flex-wrap items-center gap-1">
        {canWrapRootBubble && (
          <Button type="button" variant="outline" size="sm" className="h-6 px-2 text-[10px]" onClick={onWrapRootBubble} data-testid="button-convert-carousel">
            <Layers3 className="mr-1 h-3 w-3" />Carousel 追加
          </Button>
        )}
        {canAddChild && addableTypes.map((type) => (
          <Button key={type} type="button" variant="outline" size="sm" className="h-6 px-2 text-[10px]" onClick={() => onAddChild(type)}>
            <Plus className="mr-1 h-3 w-3" />{type}
          </Button>
        ))}
        <Button type="button" variant="outline" size="sm" className="h-6 px-2 text-[10px]" disabled={!canDuplicate} title={canDuplicate ? undefined : duplicateReason} onClick={onDuplicate} data-testid="button-duplicate-node">
          <Files className="mr-1 h-3 w-3" />複製
        </Button>
        <Button type="button" variant="outline" size="sm" className="h-6 px-2 text-[10px]" disabled={!canCopy} title={canCopy ? undefined : copyReason} onClick={onCopy} data-testid="button-copy-node">
          <Copy className="mr-1 h-3 w-3" />コピー
        </Button>
        <Button type="button" variant="outline" size="sm" className="h-6 px-2 text-[10px]" disabled={!canPaste} title={canPaste ? undefined : pasteReason} onClick={onPaste} data-testid="button-paste-node">
          <ClipboardPaste className="mr-1 h-3 w-3" />ペースト
        </Button>
        <Button type="button" variant="outline" size="sm" className="h-6 px-2 text-[10px]" disabled={!canDelete} title={canDelete ? undefined : deleteReason} onClick={onDelete} data-testid="button-delete-node">
          <Trash2 className="mr-1 h-3 w-3" />削除
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run render tests to verify they pass**

Run:

```bash
PATH="$PWD/.local/bin:$PATH" node --import tsx --test client/src/components/TreeActionBar.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit Task 4**

```bash
git add client/src/components/TreeActionBar.tsx client/src/components/TreeActionBar.test.tsx
git commit -m "feat: add responsive tree action bar"
```

---

### Task 5: Studio Integration

**Files:**
- Modify: `client/src/pages/Studio.tsx`
- Test: `client/src/lib/flexOperations.test.ts`
- Test: `client/src/components/TreeActionBar.test.tsx`

- [ ] **Step 1: Update imports in `Studio.tsx`**

Replace lucide tree-action imports in `client/src/pages/Studio.tsx`:

```ts
import { Check, Copy, RotateCcw } from "lucide-react";
```

Add:

```ts
import { TreeActionBar } from "@/components/TreeActionBar";
import {
  canWrapRootBubbleFromSelection,
  deleteNodeAtPath,
  duplicateNodeAtPath,
  getCopiedNode,
  getNodeOperationState,
  getSelectionAfterDelete,
  getSelectionAfterDuplicate,
  getSelectionAfterPaste,
  pasteNodeAtPath,
} from "@/lib/flexOperations";
```

Remove direct `deleteAtPath` import from `@/lib/flexPath`.

- [ ] **Step 2: Add copied node state and operation state**

In `Studio`, add state after `copyStatus`:

```ts
const [copiedNode, setCopiedNode] = useState<unknown>(null);
```

Replace `canConvertRootToCarousel` with:

```ts
const operationState = useMemo(
  () => parsed.ok ? getNodeOperationState(parsed.value, selectedPath, copiedNode) : getNodeOperationState(null, null, copiedNode),
  [parsed, selectedPath, copiedNode],
);
const canConvertRootToCarousel = Boolean(parsed.ok && canWrapRootBubbleFromSelection(parsed.value, selectedPath));
```

- [ ] **Step 3: Replace action callbacks**

Replace `deleteSelected` with:

```ts
const deleteSelected = useCallback(() => {
  if (!selectedPath || !parsed.ok) return;
  const nextSelection = getSelectionAfterDelete(parsed.value, selectedPath);
  const next = deleteNodeAtPath(parsed.value, selectedPath);
  if (next === parsed.value) return;
  setJsonText(JSON.stringify(next, null, 2));
  setSelectedPath(nextSelection);
}, [selectedPath, parsed]);
```

Add after `deleteSelected`:

```ts
const duplicateSelected = useCallback(() => {
  if (!selectedPath || !parsed.ok) return;
  const next = duplicateNodeAtPath(parsed.value, selectedPath);
  if (next === parsed.value) return;
  setJsonText(JSON.stringify(next, null, 2));
  setSelectedPath(getSelectionAfterDuplicate(selectedPath));
}, [selectedPath, parsed]);

const copySelectedNode = useCallback(() => {
  if (!selectedPath || !parsed.ok) return;
  setCopiedNode(getCopiedNode(parsed.value, selectedPath));
}, [selectedPath, parsed]);

const pasteCopiedNode = useCallback(() => {
  if (!selectedPath || !parsed.ok) return;
  const nextSelection = getSelectionAfterPaste(parsed.value, selectedPath, copiedNode);
  const next = pasteNodeAtPath(parsed.value, selectedPath, copiedNode);
  if (next === parsed.value) return;
  setJsonText(JSON.stringify(next, null, 2));
  setSelectedPath(nextSelection);
}, [selectedPath, parsed, copiedNode]);
```

Update `convertRootToCarousel` guard:

```ts
const convertRootToCarousel = useCallback(() => {
  if (!parsed.ok || !canWrapRootBubbleFromSelection(parsed.value, selectedPath)) return;
  const next = wrapBubbleInCarousel(parsed.value);
  setJsonText(JSON.stringify(next, null, 2));
  setSelectedPath((current) => getSelectionAfterCarouselWrap(current));
}, [parsed, selectedPath]);
```

- [ ] **Step 4: Replace the tree header JSX with `TreeActionBar`**

Replace the tree header `<div className="flex h-9 ...">...</div>` block with:

```tsx
<TreeActionBar
  selectedPathLabel={selectedPath ? formatPath(selectedPath) : undefined}
  copiedLabel={operationState.copiedLabel}
  treeOpen={treeOpen}
  canWrapRootBubble={canConvertRootToCarousel}
  canAddChild={canAddChild}
  addableTypes={addableTypes}
  canDuplicate={operationState.canDuplicate}
  duplicateReason={operationState.duplicateReason}
  canCopy={operationState.canCopy}
  copyReason={operationState.copyReason}
  canPaste={operationState.canPaste}
  pasteReason={operationState.pasteReason}
  canDelete={operationState.canDelete}
  deleteReason={operationState.deleteReason}
  onToggleTree={() => setTreeOpen((v) => !v)}
  onWrapRootBubble={convertRootToCarousel}
  onAddChild={addChild}
  onDuplicate={duplicateSelected}
  onCopy={copySelectedNode}
  onPaste={pasteCopiedNode}
  onDelete={deleteSelected}
/>
```

- [ ] **Step 5: Run focused tests and typecheck**

Run:

```bash
PATH="$PWD/.local/bin:$PATH" node --import tsx --test client/src/lib/flexOperations.test.ts client/src/components/TreeActionBar.test.tsx client/src/lib/flexRoot.test.ts client/src/lib/flexPath.test.ts client/src/components/FlexTreeView.test.tsx
PATH="$PWD/.local/bin:$PATH" npm_config_cache="$PWD/.local/npm-cache" .local/bin/npm run check
```

Expected: PASS.

- [ ] **Step 6: Commit Task 5**

```bash
git add client/src/pages/Studio.tsx client/src/lib/flexOperations.ts client/src/components/TreeActionBar.tsx
git commit -m "feat: wire safe tree actions into studio"
```

---

### Task 6: Browser Smoke And Responsive Verification

**Files:**
- No production file changes expected.
- May update tests if smoke reveals a real issue.

- [ ] **Step 1: Start dev server**

Run:

```bash
PATH="$PWD/.local/bin:$PATH" PORT=5002 npm_config_cache="$PWD/.local/npm-cache" npm_config_audit=false npm_config_fund=false .local/bin/npm run dev
```

Expected: app available at `http://localhost:5002/#/`.

- [ ] **Step 2: Verify delete rules in browser**

Open `http://localhost:5002/#/`.

Expected:

- Selecting root shows delete disabled.
- Selecting `body` shows delete disabled.
- Selecting a `body.contents[]` text node enables delete.
- Deleting that text node updates JSON, tree, and preview.
- In a carousel with one bubble, selecting `contents[0]` shows delete disabled.

- [ ] **Step 3: Verify duplicate, copy, and paste in browser**

Expected:

- Selecting `body.contents[0]` enables duplicate.
- Clicking duplicate inserts a copied node immediately after the original.
- Clicking copy shows `コピー中: text ...` in the action bar.
- Selecting `body` and clicking paste appends the copied text to `body.contents`.
- Copying a bubble and selecting carousel enables paste.
- Copying a text and selecting carousel disables paste.

- [ ] **Step 4: Verify Carousel 追加 visibility**

Expected:

- With root bubble selected, `Carousel 追加` is visible.
- With any non-root node selected, `Carousel 追加` is not visible.
- After conversion to carousel, `Carousel 追加` is not visible.

- [ ] **Step 5: Verify responsive wrapping**

Use browser viewport narrowing or device mode.

Expected:

- The action bar wraps to multiple rows.
- Buttons do not overlap selected path or copied indicator.
- Tree contents remain scrollable below the expanded action bar.
- Primary actions remain visible without relying on horizontal scrolling.

- [ ] **Step 6: Run final verification**

Run:

```bash
PATH="$PWD/.local/bin:$PATH" node --import tsx --test client/src/lib/flexOperations.test.ts client/src/components/TreeActionBar.test.tsx client/src/lib/flexPath.test.ts client/src/lib/flexRoot.test.ts client/src/components/FlexTreeView.test.tsx
PATH="$PWD/.local/bin:$PATH" npm_config_cache="$PWD/.local/npm-cache" .local/bin/npm run check
PATH="$PWD/.local/bin:$PATH" node --import tsx/esm script/build.ts
```

Expected:

- Unit/render tests pass.
- TypeScript check passes.
- Build completes. Existing PostCSS `from` warning may appear and is not part of this change.

- [ ] **Step 7: Commit final verification adjustments**

If no files changed during smoke, skip this commit. If smoke required a fix, commit only the relevant fix:

```bash
git status --short
git add client/src/lib/flexOperations.ts client/src/lib/flexOperations.test.ts client/src/components/TreeActionBar.tsx client/src/components/TreeActionBar.test.tsx client/src/pages/Studio.tsx client/src/components/FlexTreeView.tsx
git commit -m "fix: polish safe tree action behavior"
```

---

## Self-Review

Spec coverage:

- Safe delete is covered by Tasks 1, 5, and 6.
- Duplicate, copy, paste, and copied-node display are covered by Tasks 2, 4, 5, and 6.
- Root-only `Carousel 追加` behavior is covered by Tasks 2, 5, and 6.
- Last carousel bubble and `bubble.body` delete protection are covered by Tasks 1 and 6.
- Responsive action bar height and wrapping are covered by Tasks 4 and 6.

Placeholder scan:

- No placeholder steps remain.
- Every code-changing task includes concrete code or exact JSX replacement.

Type consistency:

- `FlexPath`, `AddableType`, `NodeOperationState`, and operation helper names are introduced before they are used by later tasks.
- `TreeActionBar` prop names match the integration snippet in Task 5.
