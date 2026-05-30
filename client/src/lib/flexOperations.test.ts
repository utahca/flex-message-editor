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
