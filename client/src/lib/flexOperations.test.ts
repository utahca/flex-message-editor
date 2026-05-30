import assert from "node:assert/strict";
import test from "node:test";
import {
  canCopyNode,
  canDeleteNode,
  canDuplicateNode,
  canPasteNode,
  canWrapRootBubbleFromSelection,
  deleteNodeAtPath,
  duplicateNodeAtPath,
  getSelectionAfterDelete,
  pasteNodeAtPath,
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

const carouselRoot = {
  type: "carousel",
  contents: [
    {
      type: "bubble",
      hero: { type: "image", url: "https://example.com/nested-hero.png" },
      body: { type: "box", layout: "vertical", contents: [] },
    },
  ],
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

test("canDeleteNode allows optional bubble slots inside carousel bubbles", () => {
  assert.equal(canDeleteNode(carouselRoot, ["contents", 0, "hero"]), true);
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

test("deleteNodeAtPath removes optional slots inside carousel bubbles without mutating input", () => {
  const next = deleteNodeAtPath(carouselRoot, ["contents", 0, "hero"]);

  assert.equal((next as any).contents[0].hero, undefined);
  assert.ok((carouselRoot as any).contents[0].hero);
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

test("getSelectionAfterDelete selects carousel bubble after deleting nested optional slot", () => {
  assert.deepEqual(getSelectionAfterDelete(carouselRoot, ["contents", 0, "hero"]), ["contents", 0]);
});

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
