import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StudioLayout } from "./StudioLayout";

(globalThis as any).React = React;

function renderLayout(hasPropertyPanel = true) {
  return renderToStaticMarkup(
    <StudioLayout
      desktop={true}
      editor={<div data-testid="stub-editor">editor</div>}
      preview={<div data-testid="stub-preview">preview</div>}
      treeToolbar={<div data-testid="stub-tree-toolbar">tree toolbar</div>}
      tree={<div data-testid="stub-tree">tree</div>}
      property={hasPropertyPanel ? <div data-testid="stub-property">property</div> : null}
      mobileProperty={<div data-testid="stub-mobile-property">mobile property</div>}
    />,
  );
}

test("studio layout renders desktop resizable panel contract", () => {
  const html = renderLayout();

  assert.match(html, /data-testid="studio-desktop-resizable-layout"/);
  assert.match(html, /data-testid="resize-handle-main"/);
  assert.match(html, /data-testid="resize-handle-preview-tree"/);
  assert.match(html, /data-testid="resize-handle-tree-property"/);
});

test("studio layout keeps mobile fallback layout", () => {
  const html = renderToStaticMarkup(
    <StudioLayout
      desktop={false}
      editor={<div data-testid="stub-editor">editor</div>}
      preview={<div data-testid="stub-preview">preview</div>}
      treeToolbar={<div data-testid="stub-tree-toolbar">tree toolbar</div>}
      tree={<div data-testid="stub-tree">tree</div>}
      property={<div data-testid="stub-property">property</div>}
      mobileProperty={<div data-testid="stub-mobile-property">mobile property</div>}
    />,
  );

  assert.match(html, /data-testid="studio-mobile-layout"/);
  assert.match(html, /data-testid="stub-mobile-property"/);
  assert.doesNotMatch(html, /data-testid="studio-desktop-resizable-layout"/);
});

test("studio layout omits tree property handle when no property panel is available", () => {
  const html = renderLayout(false);

  assert.doesNotMatch(html, /data-testid="resize-handle-tree-property"/);
});
