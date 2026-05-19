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
