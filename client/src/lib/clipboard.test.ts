import assert from "node:assert/strict";
import test from "node:test";
import { copyTextToClipboard, getCopyButtonLabel } from "./clipboard";

test("copyTextToClipboard returns success when the writer resolves", async () => {
  let copied = "";

  const status = await copyTextToClipboard(
    async (text) => {
      copied = text;
    },
    '{ "type": "bubble" }',
  );

  assert.equal(status, "success");
  assert.equal(copied, '{ "type": "bubble" }');
});

test("copyTextToClipboard returns error when the writer rejects", async () => {
  const status = await copyTextToClipboard(
    async () => {
      throw new Error("clipboard unavailable");
    },
    "{}",
  );

  assert.equal(status, "error");
});

test("getCopyButtonLabel maps copy status to Japanese UI text", () => {
  assert.equal(getCopyButtonLabel("idle"), "コピー");
  assert.equal(getCopyButtonLabel("success"), "コピー済み");
  assert.equal(getCopyButtonLabel("error"), "コピー失敗");
});
