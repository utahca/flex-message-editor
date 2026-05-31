import assert from "node:assert/strict";
import test from "node:test";
import {
  createEditHistory,
  pushEditHistory,
  redoEditHistory,
  undoEditHistory,
} from "./editHistory";

test("pushEditHistory records past states and undo/redo navigates snapshots", () => {
  let history = createEditHistory("alpha");

  history = pushEditHistory(history, "beta");
  history = pushEditHistory(history, "gamma");

  const undoOne = undoEditHistory(history);
  assert.equal(undoOne.value, "beta");
  assert.deepEqual(undoOne.history, {
    past: ["alpha"],
    present: "beta",
    future: ["gamma"],
  });

  const redoOne = redoEditHistory(undoOne.history);
  assert.equal(redoOne.value, "gamma");
  assert.deepEqual(redoOne.history, {
    past: ["alpha", "beta"],
    present: "gamma",
    future: [],
  });
});

test("pushEditHistory skips unchanged values and clears redo states after undo", () => {
  let history = createEditHistory("alpha");
  history = pushEditHistory(history, "beta");
  history = pushEditHistory(history, "beta");

  const undone = undoEditHistory(history);
  assert.equal(undone.value, "alpha");

  const branched = pushEditHistory(undone.history, "delta");
  assert.deepEqual(branched, {
    past: ["alpha"],
    present: "delta",
    future: [],
  });
});

test("pushEditHistory keeps the newest past states within the configured limit", () => {
  let history = createEditHistory("one");

  history = pushEditHistory(history, "two", 2);
  history = pushEditHistory(history, "three", 2);
  history = pushEditHistory(history, "four", 2);

  assert.deepEqual(history, {
    past: ["two", "three"],
    present: "four",
    future: [],
  });
});
