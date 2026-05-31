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
