import assert from "node:assert/strict";
import test from "node:test";
import { formatSelectOptionLabel, getDefaultSelectValue } from "./propertyDefaults";

test("formatSelectOptionLabel marks only the known default option", () => {
  assert.equal(formatSelectOptionLabel("md", "md"), "md <default>");
  assert.equal(formatSelectOptionLabel("lg", "md"), "lg");
  assert.equal(formatSelectOptionLabel("md"), "md");
});

test("getDefaultSelectValue returns defaults only for known type and field pairs", () => {
  assert.equal(getDefaultSelectValue("text", "size"), "md");
  assert.equal(getDefaultSelectValue("text", "weight"), "regular");
  assert.equal(getDefaultSelectValue("box", "spacing"), "none");
  assert.equal(getDefaultSelectValue("button", "style"), "link");
  assert.equal(getDefaultSelectValue("unknown", "size"), undefined);
  assert.equal(getDefaultSelectValue("text", "unknown"), undefined);
});
