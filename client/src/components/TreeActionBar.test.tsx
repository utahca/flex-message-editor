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
