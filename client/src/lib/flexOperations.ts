import { produce } from "immer";
import { getAddableTypesForNode, type AddableType } from "./flexAdd";
import { deleteAtPath, getAtPath, type FlexPath } from "./flexPath";
import { canWrapBubbleInCarousel } from "./flexRoot";

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

function cloneNode<T>(node: T): T {
  return typeof structuredClone === "function"
    ? structuredClone(node)
    : JSON.parse(JSON.stringify(node));
}

function getNodeType(node: unknown): string | undefined {
  return isObjectNode(node) ? (node.type as string | undefined) : undefined;
}

function getArrayParentContext(root: unknown, path: FlexPath) {
  const parentPath = path.slice(0, -1);
  const parent = getAtPath(root, parentPath);
  const containerPath = parentPath.slice(0, -1);
  const container = getAtPath(root, containerPath);
  const key = parentPath[parentPath.length - 1];
  const index = getIndex(path);

  if (!Array.isArray(parent) || index === undefined || !isObjectNode(container)) return null;
  if (key !== "contents") return null;
  return { parentPath, parent, containerPath, container, index };
}

function isAddableToContainer(container: unknown, node: unknown): boolean {
  const type = getNodeType(node) as AddableType | undefined;
  if (!type) return false;
  return getAddableTypesForNode(container).includes(type);
}

export function canDuplicateNode(root: unknown, path: FlexPath | null): boolean {
  if (!path || path.length === 0) return false;
  const node = getAtPath(root, path);
  if (!isObjectNode(node)) return false;
  const context = getArrayParentContext(root, path);
  if (!context) return false;
  return isAddableToContainer(context.container, node);
}

export function duplicateNodeAtPath<T>(root: T, path: FlexPath): T {
  if (!canDuplicateNode(root, path)) return root;
  const copiedNode = cloneNode(getAtPath(root, path));
  return produce(root, (draft: any) => {
    const context = getArrayParentContext(draft, path);
    if (!context) return;
    context.parent.splice(context.index + 1, 0, copiedNode);
  });
}

export function getSelectionAfterDuplicate(path: FlexPath): FlexPath {
  const index = getIndex(path);
  if (index === undefined) return path;
  return [...path.slice(0, -1), index + 1];
}

export function canCopyNode(root: unknown, path: FlexPath | null): boolean {
  if (!path || path.length === 0) return false;
  return isObjectNode(getAtPath(root, path));
}

export function getCopiedNode(root: unknown, path: FlexPath | null): unknown {
  if (!canCopyNode(root, path)) return null;
  return cloneNode(getAtPath(root, path));
}

function getPasteTarget(root: unknown, selectedPath: FlexPath | null, copiedNode: unknown) {
  if (!selectedPath || !isObjectNode(copiedNode)) return null;

  const selected = getAtPath(root, selectedPath);
  if (isObjectNode(selected) && isAddableToContainer(selected, copiedNode)) {
    return { mode: "append" as const, contentsPath: [...selectedPath, "contents"] };
  }

  const context = getArrayParentContext(root, selectedPath);
  if (!context || !isAddableToContainer(context.container, copiedNode)) return null;
  return { mode: "insertAfter" as const, parentPath: context.parentPath, index: context.index };
}

export function canPasteNode(root: unknown, selectedPath: FlexPath | null, copiedNode: unknown): boolean {
  return Boolean(getPasteTarget(root, selectedPath, copiedNode));
}

export function pasteNodeAtPath<T>(root: T, selectedPath: FlexPath, copiedNode: unknown): T {
  const target = getPasteTarget(root, selectedPath, copiedNode);
  if (!target) return root;
  return produce(root, (draft: any) => {
    if (target.mode === "append") {
      const contents = getAtPath(draft, target.contentsPath);
      if (Array.isArray(contents)) contents.push(cloneNode(copiedNode));
      return;
    }
    const parent = getAtPath(draft, target.parentPath);
    if (Array.isArray(parent)) parent.splice(target.index + 1, 0, cloneNode(copiedNode));
  });
}

export function getSelectionAfterPaste(root: unknown, selectedPath: FlexPath, copiedNode: unknown): FlexPath {
  const target = getPasteTarget(root, selectedPath, copiedNode);
  if (!target) return selectedPath;
  if (target.mode === "append") {
    const contents = getAtPath(root, target.contentsPath);
    const index = Array.isArray(contents) ? contents.length : 0;
    return [...target.contentsPath, index];
  }
  return [...target.parentPath, target.index + 1];
}

export function canWrapRootBubbleFromSelection(root: unknown, selectedPath: FlexPath | null): boolean {
  return Boolean(selectedPath && selectedPath.length === 0 && canWrapBubbleInCarousel(root));
}
