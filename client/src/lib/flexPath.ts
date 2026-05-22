import { produce } from "immer";

/** A "path" is the sequence of keys/indices into the Flex JSON tree. */
export type FlexPath = (string | number)[];

export function getAtPath(root: unknown, path: FlexPath): unknown {
  let cur: any = root;
  for (const step of path) {
    if (cur == null) return undefined;
    cur = cur[step as any];
  }
  return cur;
}

/** Pretty path for display: `body.contents[0].contents[2]`. Empty path renders as `root`. */
export function formatPath(path: FlexPath): string {
  if (path.length === 0) return "root";
  return path
    .map((s) => (typeof s === "number" ? `[${s}]` : s))
    .join(".")
    .replace(/\.\[/g, "[");
}

/** Immutable update of a deep value. Returns a new root. */
export function setAtPath<T>(root: T, path: FlexPath, value: unknown): T {
  return produce(root, (draft: any) => {
    if (path.length === 0) {
      // Replacing the whole root is not supported here — caller should handle it.
      return;
    }
    let cur: any = draft;
    for (let i = 0; i < path.length - 1; i++) {
      cur = cur[path[i] as any];
      if (cur == null) return;
    }
    const last = path[path.length - 1];
    if (value === undefined) {
      // Remove the field. Use `delete` for objects; arrays we leave for now.
      if (Array.isArray(cur)) {
        return;
      }
      delete cur[last as any];
    } else {
      cur[last as any] = value;
    }
  });
}

export function deleteAtPath<T>(root: T, path: FlexPath): T {
  return produce(root, (draft: any) => {
    if (path.length === 0) return;
    let cur: any = draft;
    for (let i = 0; i < path.length - 1; i++) {
      cur = cur[path[i] as any];
      if (cur == null) return;
    }
    const last = path[path.length - 1];
    if (Array.isArray(cur) && typeof last === "number") {
      cur.splice(last, 1);
      return;
    }
    delete cur[last as any];
  });
}

export type ArrayMoveOffset = -1 | 1;

function hasSamePrefix(path: FlexPath, prefix: FlexPath): boolean {
  if (path.length < prefix.length) return false;
  return prefix.every((step, index) => path[index] === step);
}

export function moveArrayItemAtPath<T>(root: T, path: FlexPath, offset: ArrayMoveOffset): T {
  return produce(root, (draft: any) => {
    if (path.length === 0) return;

    const index = path[path.length - 1];
    if (typeof index !== "number") return;

    const parent = getAtPath(draft, path.slice(0, -1));
    if (!Array.isArray(parent)) return;

    const targetIndex = index + offset;
    if (index < 0 || index >= parent.length || targetIndex < 0 || targetIndex >= parent.length) return;

    const [item] = parent.splice(index, 1);
    parent.splice(targetIndex, 0, item);
  });
}

export function remapPathAfterArrayMove(
  path: FlexPath,
  movedPath: FlexPath,
  offset: ArrayMoveOffset,
): FlexPath {
  if (movedPath.length === 0) return path;

  const movedIndex = movedPath[movedPath.length - 1];
  if (typeof movedIndex !== "number") return path;

  const parentPath = movedPath.slice(0, -1);
  if (!hasSamePrefix(path, parentPath) || path.length <= parentPath.length) return path;

  const selectedIndex = path[parentPath.length];
  if (typeof selectedIndex !== "number") return path;

  const targetIndex = movedIndex + offset;
  if (selectedIndex !== movedIndex && selectedIndex !== targetIndex) return path;

  const nextIndex = selectedIndex === movedIndex ? targetIndex : movedIndex;
  return [...path.slice(0, parentPath.length), nextIndex, ...path.slice(parentPath.length + 1)];
}
