import assert from "node:assert/strict";
import test from "node:test";
import { getTreePaneMaxHeightClass } from "./treeLayout";

test("tree pane collapsed max height preserves wrapping action bar height", () => {
  assert.equal(getTreePaneMaxHeightClass(false), "max-h-none");
});

test("tree pane expanded max height keeps the existing viewport cap", () => {
  assert.equal(getTreePaneMaxHeightClass(true), "max-h-[45vh]");
});
