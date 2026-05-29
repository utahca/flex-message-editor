import assert from "node:assert/strict";
import test from "node:test";
import {
  canWrapBubbleInCarousel,
  getSelectionAfterCarouselWrap,
  wrapBubbleInCarousel,
} from "./flexRoot";

test("canWrapBubbleInCarousel only allows a root bubble", () => {
  assert.equal(canWrapBubbleInCarousel({ type: "bubble" }), true);
  assert.equal(canWrapBubbleInCarousel({ type: "carousel", contents: [] }), false);
  assert.equal(canWrapBubbleInCarousel(null), false);
});

test("wrapBubbleInCarousel preserves the current bubble as contents[0]", () => {
  const bubble = {
    type: "bubble",
    body: { type: "box", layout: "vertical", contents: [] },
  };

  const next = wrapBubbleInCarousel(bubble);

  assert.deepEqual(next, { type: "carousel", contents: [bubble] });
  assert.equal((next as any).contents[0], bubble);
});

test("wrapBubbleInCarousel leaves non-bubble roots unchanged", () => {
  const carousel = { type: "carousel", contents: [] };

  assert.equal(wrapBubbleInCarousel(carousel), carousel);
});

test("getSelectionAfterCarouselWrap selects the new carousel root", () => {
  assert.deepEqual(getSelectionAfterCarouselWrap(null), []);
  assert.deepEqual(getSelectionAfterCarouselWrap(["body", "contents", 0]), []);
});
