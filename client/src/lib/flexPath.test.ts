import assert from "node:assert/strict";
import test from "node:test";
import { moveArrayItemAtPath, remapPathAfterArrayMove } from "./flexPath";

const root = {
  body: {
    contents: [
      { type: "text", text: "Alpha" },
      { type: "text", text: "Beta" },
      { type: "text", text: "Gamma" },
    ],
  },
};

test("moveArrayItemAtPath moves an adjacent contents item without mutating the input", () => {
  const next = moveArrayItemAtPath(root, ["body", "contents", 1], -1);

  assert.deepEqual(next.body.contents.map((node) => node.text), ["Beta", "Alpha", "Gamma"]);
  assert.deepEqual(root.body.contents.map((node) => node.text), ["Alpha", "Beta", "Gamma"]);
});

test("moveArrayItemAtPath returns the same root for out-of-range moves", () => {
  assert.equal(moveArrayItemAtPath(root, ["body", "contents", 0], -1), root);
  assert.equal(moveArrayItemAtPath(root, ["body", "contents", 2], 1), root);
  assert.equal(moveArrayItemAtPath(root, ["body"], 1), root);
});

test("remapPathAfterArrayMove follows the moved node and its swapped sibling", () => {
  assert.deepEqual(
    remapPathAfterArrayMove(["body", "contents", 1, "contents", 0], ["body", "contents", 1], -1),
    ["body", "contents", 0, "contents", 0],
  );
  assert.deepEqual(
    remapPathAfterArrayMove(["body", "contents", 0], ["body", "contents", 1], -1),
    ["body", "contents", 1],
  );
  assert.deepEqual(
    remapPathAfterArrayMove(["footer", "contents", 0], ["body", "contents", 1], -1),
    ["footer", "contents", 0],
  );
});
