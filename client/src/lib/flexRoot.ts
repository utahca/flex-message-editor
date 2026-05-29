import type { FlexPath } from "./flexPath";

export function canWrapBubbleInCarousel(root: unknown): boolean {
  return Boolean(root && typeof root === "object" && (root as any).type === "bubble");
}

export function wrapBubbleInCarousel<T>(root: T): T | { type: "carousel"; contents: [T] } {
  if (!canWrapBubbleInCarousel(root)) return root;
  return { type: "carousel", contents: [root] };
}

export function getSelectionAfterCarouselWrap(_path: FlexPath | null): FlexPath {
  return [];
}
