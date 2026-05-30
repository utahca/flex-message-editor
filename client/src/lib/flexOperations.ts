import { deleteAtPath, getAtPath, type FlexPath } from "./flexPath";

const BUBBLE_OPTIONAL_SLOTS = new Set(["header", "hero", "footer"]);

function pathEq(a: FlexPath, b: FlexPath): boolean {
  return a.length === b.length && a.every((step, index) => step === b[index]);
}

function isObjectNode(node: unknown): node is Record<string, unknown> {
  return Boolean(node && typeof node === "object" && !Array.isArray(node));
}

function getParent(root: unknown, path: FlexPath): unknown {
  if (path.length === 0) return undefined;
  return getAtPath(root, path.slice(0, -1));
}

function getIndex(path: FlexPath): number | undefined {
  const last = path[path.length - 1];
  return typeof last === "number" ? last : undefined;
}

export function canDeleteNode(root: unknown, path: FlexPath | null): boolean {
  if (!path || path.length === 0) return false;

  const node = getAtPath(root, path);
  if (!isObjectNode(node)) return false;

  const parent = getParent(root, path);

  if (BUBBLE_OPTIONAL_SLOTS.has(String(path[path.length - 1]))) {
    return isObjectNode(parent) && parent.type === "bubble";
  }

  if (pathEq(path, ["body"])) return false;

  const index = getIndex(path);
  if (!Array.isArray(parent) || index === undefined) return false;

  const grandParent = getAtPath(root, path.slice(0, -2));
  if (!isObjectNode(grandParent)) return false;

  if (grandParent.type === "box" && path[path.length - 2] === "contents") return true;
  if (grandParent.type === "carousel" && path[path.length - 2] === "contents") {
    return parent.length > 1;
  }

  return false;
}

export function deleteNodeAtPath<T>(root: T, path: FlexPath): T {
  if (!canDeleteNode(root, path)) return root;
  return deleteAtPath(root, path);
}

export function getSelectionAfterDelete(root: unknown, deletedPath: FlexPath): FlexPath | null {
  if (deletedPath.length === 0) return null;

  const parentPath = deletedPath.slice(0, -1);
  const parent = getAtPath(root, parentPath);
  const index = getIndex(deletedPath);

  if (Array.isArray(parent) && index !== undefined) {
    if (parent.length > 1) {
      return [...parentPath, Math.min(index, parent.length - 2)];
    }
    return parentPath.slice(0, -1);
  }

  return parentPath;
}
