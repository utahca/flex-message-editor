import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FlexTreeView } from "./FlexTreeView";

(globalThis as any).React = React;

function renderTree(root: unknown) {
  return renderToStaticMarkup(
    <FlexTreeView root={root} selectedPath={null} onSelect={() => undefined} onMove={() => undefined} />,
  );
}

function getButtonTag(html: string, testId: string): string {
  const escaped = testId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = html.match(new RegExp(`<button[^>]*data-testid="${escaped}"[^>]*>`));
  assert.ok(match, `missing button ${testId}`);
  return match[0];
}

test("contents rows render boundary-aware move buttons", () => {
  const html = renderTree({
    type: "bubble",
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        { type: "text", text: "Alpha" },
        { type: "text", text: "Beta" },
      ],
    },
  });

  assert.match(getButtonTag(html, "button-move-up-body.contents[0]"), /\sdisabled=""/);
  assert.doesNotMatch(getButtonTag(html, "button-move-down-body.contents[0]"), /\sdisabled=""/);
  assert.doesNotMatch(getButtonTag(html, "button-move-up-body.contents[1]"), /\sdisabled=""/);
  assert.match(getButtonTag(html, "button-move-down-body.contents[1]"), /\sdisabled=""/);
});

test("root and named bubble slot rows do not render move buttons", () => {
  const html = renderTree({
    type: "bubble",
    hero: { type: "image", url: "https://example.com/hero.png" },
    body: { type: "box", layout: "vertical", contents: [] },
  });

  assert.doesNotMatch(html, /data-testid="button-move-up-root"/);
  assert.doesNotMatch(html, /data-testid="button-move-up-hero"/);
  assert.doesNotMatch(html, /data-testid="button-move-up-body"/);
});
